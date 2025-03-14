from fastapi import APIRouter
import uuid
from fastapi import APIRouter, HTTPException, Request, Header, Depends
from fastapi.responses import StreamingResponse
import aiohttp
import asyncio
import json
from typing import AsyncGenerator, Optional
from config import CORS_ORIGINS, get_url
from database.elasticsearch import es_client
from datetime import datetime
import hashlib
from auth import create_access_token, verify_token

router = APIRouter()

def mini_log(local_url, target_url, method, params = None):
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{local_url} | target url: {target_url} | method: {method} | params: {json.dumps(params)} | time: {current_time}")

def is_subset(arr1, arr2):
    # 将数组转换为集合
    set1 = set(arr1)
    set2 = set(arr2)
    
    # 判断 set2 是否是 set1 的子集
    return set2.issubset(set1)

@router.post("/chat_stream")
async def forward_request(request: Request, user = Depends(verify_token)):
    try:
        data = await request.json()
        data['use_short_id'] = True
        data['embedding_version'] = 3
        if 'engine' not in data:
            data['engine'] = 'custom-model-20250213'
        # 验证必要字段
        required_fields = ['question']
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        url = get_url(data['with_remote_context'], "CHAT_STREAM")

        settings = es_client.get_user_settings('system_prompt')
        
        if settings:
            try:
                settings = json.loads(settings)
                # 使用 dict.get() 方法代替直接访问,如果key不存在返回None
                data['additional_prompt'] = settings.get('prompt')
            except json.JSONDecodeError:
                print("Failed to parse system_prompt settings JSON")
            except Exception as e:
                print(f"Error processing system_prompt settings: {str(e)}")

        if isinstance(user, str):
            # 按照_分割user
            user_sp = user.split(".")
            if len(user_sp) < 3:
                raise HTTPException(status_code=401, detail=f"Token error: items < 3")
            user_auth = user_sp[1]
            user_auth = user_auth.split(",")
            data_index_name = data['index_name'].split(",") + data['collection_name'].split(",")
            if 'with_remote_context' in data and data['with_remote_context'] is not None:
                data_index_name = data_index_name + data['with_remote_context'].split(",")
            
            if not is_subset(user_auth, data_index_name):
                raise HTTPException(status_code=401, detail=f"Token error: permission denied")
            
        if 'client_type' not in data:
            data['client_type'] = "api"

        mini_log("/chat_starem", url, "POST", data)

        timeout = aiohttp.ClientTimeout(total=600, connect=60)
        
        async def stream_response() -> AsyncGenerator[bytes, None]:
            user_id = user
            # 如果user_id 不是字符串
            if not isinstance(user, str):
                user_id = user['username']

            all_content = {
                "session_id": str(uuid.uuid4()),
                "user_id": user_id,
                "ai_type": data['with_remote_context'],
                "question": data['question'],
                "answer": "",
                "documents": [],
                "model": "",
                "metadata": data
            }
            try:
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.post(
                        url,
                        json=data,
                        headers={
                            "Accept": "text/event-stream",
                            "Content-Type": "application/json"
                        }
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            print(f"Error response: {error_text}")
                            raise HTTPException(
                                status_code=response.status,
                                detail=f"Error forwarding request: {response.reason}"
                            )
                        last_chunk = ""
                        async for chunk in response.content.iter_any():
                            if chunk:
                                yield chunk
                                try:
                                    last_chunk += chunk.decode('utf-8', errors='ignore')
                                    lines = last_chunk.splitlines()
                                    for chunk_item in lines:
                                        if chunk_item:
                                            last_chunk = chunk_item
                                            content = json.loads(chunk_item)
                                            if 'data' in content:
                                                current_data = content['data']
                                                all_content['answer'] += current_data
                                                            
                                            if 'documents' in content:
                                                all_content['documents'] = content['documents']
                                    last_chunk = ""
                                except json.JSONDecodeError:
                                    # JSON 解析失败时的处理
                                    print(f"Failed to parse content JSON: {last_chunk}")
                                except Exception as e:
                                        # 其他未预期的异常
                                    print(f"Error processing content: {str(e)}")
                                                
                                # 当内容超过1000字时检查重复行
                                if len(all_content['answer']) > 1000:
                                    lines = all_content['answer'].split("\n")
                                    last_line = lines[-1]
                                    if len(last_line) >= 5:
                                        repeat_count = 0
                                        for line in lines[:-1]:
                                            if line == last_line:
                                                repeat_count += 1
                                        if repeat_count >= 2:
                                            # 中断连接
                                            response.close()
                                            break
                        es_client.store_chat_stream(**all_content)
            
            except aiohttp.ClientError as e:
                print(f"Client error occurred: {str(e)}")
                es_client.store_chat_stream(**all_content)
                raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
            except asyncio.CancelledError:
                print("客户端断开连接")
                es_client.store_chat_stream(**all_content)
            except asyncio.TimeoutError:
                print("Request timed out")
                es_client.store_chat_stream(**all_content)
                raise HTTPException(status_code=504, detail="Request timed out")
            except Exception as e:
                print(f"Unexpected error occurred: {str(e)}")
                es_client.store_chat_stream(**all_content)
                raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/para/{ai_type}/{para_id}")
async def get_para_info(ai_type:str, para_id: str, user = Depends(verify_token)):
    headers = {"Content-Type": "application/json"}

    url = f"{get_url(ai_type, 'PARA_INFO')}/{ai_type}/{para_id}"
    
    mini_log(f"/para/{ai_type}/{para_id}", url, "GET")

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Target server returned {response.status}"
                )
            return await response.json()

@router.get("/page_text/{ai_type}/{para_id}")
async def get_text_para_info(ai_type:str, para_id: str, user = Depends(verify_token)):
    headers = {"Content-Type": "text/plain"}
    url = f"{get_url(ai_type, 'PAGE_TEXT_INFO')}/{ai_type}/{para_id}"

    mini_log(f"/page_text/{ai_type}/{para_id}", url, "GET")
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Target server returned {response.status}"
                )
            text_content = await response.text()
            # 根据需要对text_content进行处理
            return text_content

@router.get("/page_html/{ai_type}/{para_id}")
async def get_text_para_info(ai_type:str, para_id: str, user = Depends(verify_token)):
    headers = {"Content-Type": "text/plain"}
    url = f"{get_url(ai_type, 'PAGE_HTML_INFO')}/{ai_type}/{para_id}"

    mini_log(f"/page_html/{ai_type}/{para_id}", url, "GET")

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Target server returned {response.status}"
                )
            text_content = await response.text()
            # 根据需要对text_content进行处理
            return text_content

@router.post("/table_info")
async def get_table_info(request: Request, user = Depends(verify_token)):
    data = await request.json()
    timeout = aiohttp.ClientTimeout(total=30)
    headers = {"Content-Type": "application/json"}
    
    url = get_url(data['index_name'], "TABLE_INFO")

    mini_log(f"/table_info", url, "POST", data)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            url=url,
            headers=headers,
            json=data
        ) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Target server returned {response.status}"
                )
            return await response.json()

@router.post("/figure_info")
async def get_figure_info(request: Request, user = Depends(verify_token)):
    data = await request.json()
    timeout = aiohttp.ClientTimeout(total=30)
    headers = {"Content-Type": "application/json"}
    url = get_url(data['index_name'], "FIGURE_INFO")
    
    mini_log(f"/figure_info", url, "POST", data)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            url=url,
            headers=headers,
            json=data
        ) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Target server returned {response.status}"
                )
            return await response.json()

@router.get("/table_figure/{ai_type}/{para_id}")
async def table_figure(ai_type: str, para_id: str):
    url = f"{get_url(ai_type, 'TABLE_FILE')}/{ai_type}/{para_id}"

    mini_log(f"/table_figure/{ai_type}/{para_id}", url, "GET")
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail="无法获取文件")
            
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            content_disposition = response.headers.get('Content-Disposition')
            filename = content_disposition.split('filename=')[-1].strip('"') if content_disposition else para_id
            
            file_content = await response.read()
            
            response = StreamingResponse(
                iter([file_content]),
                media_type=content_type
            )
            response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
            
            return response

@router.get("/pdf/page_pdf/{para_id}/{page_num}/{ai_type}")
async def table_figure(para_id: str, page_num: str, ai_type: str):
    url = f"{get_url(ai_type, 'PDF_FILE')}/{para_id}/{page_num}"

    mini_log(f"/pdf/page_pdf/{para_id}/{page_num}", url, "GET")
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail="无法获取文件")
            
            content_type = response.headers.get('Content-Type', 'application/pdf')
            content_disposition = response.headers.get('Content-Disposition')
            filename = content_disposition.split('filename=')[-1].strip('"') if content_disposition else para_id
            
            file_content = await response.read()

            # 计算文件的哈希值作为 ETag
            etag = hashlib.md5(file_content).hexdigest()

            async def file_iterator(content):
                chunk_size = 1024
                for i in range(0, len(content), chunk_size):
                    yield content[i:i + chunk_size]

            stream_response = StreamingResponse(
                file_iterator(file_content),
                media_type=content_type
            )
            stream_response.headers["Content-Disposition"] = f'inline; filename="{filename}"'
            # 设置缓存控制头
            stream_response.headers["Cache-Control"] = "public, max-age=720000"
            stream_response.headers["ETag"] = etag

            return stream_response

@router.post("/page")
async def proxy_request(request: Request):
    body = await request.json()
    url = get_url(body['index_name'], 'PAGE_INFO')
    
    mini_log(f"/page", url, "POST", body)
    async with aiohttp.ClientSession() as session:
        async with session.post(
            url=url,
            json=body
        ) as response:
            return await response.json()

@router.get("/bigdata/{content}/{ai_type}")
async def big_data(content: str, ai_type: str):
    headers = {"Content-Type": "application/json"}
    url = f"{get_url(ai_type, 'BIGDATA_QUERY')}/{content}"
    timeout = aiohttp.ClientTimeout(total=300)

    mini_log(f"/bigdata/{content}", url, "GET")
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=f"Target server returned {response.status}"
                )
            return await response.json()

