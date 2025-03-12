from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from auth import verify_token
from database.elasticsearch import es_client, CHAT_INDEX, CHAT_STREAM_INDEX
import uuid
from config import SYS_PASSWORD


router = APIRouter()

class DateRangeRequest(BaseModel):
    start_date: datetime = Field(..., description="开始日期")
    end_date: datetime = Field(..., description="结束日期")

class Document(BaseModel):
    sid: str
    ID: str
    标题: str
    发布机构: str
    作者: str
    日期: str  # 或者用 datetime，取决于你的需求
    类型: List[str]

class ChatMessage(BaseModel):
    index_name: str = Field(default=None, description="消息index")
    role: str = Field(..., description="消息角色：user/assistant")
    content: str = Field(..., description="消息内容")
    timestamp: Optional[datetime] = Field(default=None, description="消息时间戳")
    documents: Optional[List[Document]] = Field(default=None, description="相关文档列表")
    short_id_mapping: Any = []

class ChatSession(BaseModel):
    user_id: str = Field(..., description="用户ID")
    ai_type: str = Field(..., description="ai类型")
    title: str = Field(..., description="会话标题")
    messages: List[ChatMessage] = Field(..., description="消息列表")
    session_id: Optional[str] = Field(default=None, description="会话ID")
    model: Optional[str] = Field(default=None, description="使用的模型")
    total_tokens: Optional[int] = Field(default=None, description="总token数")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="其他元数据")
    created_at: Optional[datetime] = Field(default_factory=datetime.now, description="创建时间")

class ChatResponse(BaseModel):
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Any] = Field(default=None, description="响应数据")

# 创建/更新聊天会话
@router.post("/session", response_model=ChatResponse)
async def create_or_update_session(chat: ChatSession):
    try:
        session_id = chat.session_id or str(uuid.uuid4())
        messages = [msg.dict() for msg in chat.messages]
        
        # 创建会话数据
        session_data = {
            "session_id": session_id,
            "ai_type": chat.ai_type,
            "user_id": chat.user_id,
            "title": chat.title,
            "messages": messages,
            "model": chat.model,
            "total_tokens": chat.total_tokens,
            "metadata": chat.metadata
        }
        
        # 存储会话
        success = es_client.store_chat_session(**session_data)
        
        if success:
            return {
                "success": True,
                "message": "Chat session created successfully",
                "data": session_data
            }

        return {
            "success": True,
            "message": "Chat session created error",
            "data": session_data
        }
            
    except Exception as e:
        print(e)
        return {
            "success": True,
            "message": "Chat session created error",
            "data": session_data
        }

# 添加新消息到会话
@router.post("/session/{session_id}/message")
async def add_message(session_id: str, message: ChatMessage):
    try:
        success = es_client.update_chat_session(
            session_id=session_id,
            new_message=message.dict()
        )

        if success:
            return {
                "success": True,
                "message": "Message added successfully",
                "data": message
            }
        return {
            "success": True,
            "message": "Message added error",
            "data": message
        }
        
    except Exception as e:
        print(e)
        return {
            "success": True,
            "message": "Message added error",
            "data": message
        }

# 获取会话详情
@router.get("/session/{session_id}", response_model=ChatResponse)
async def get_session(session_id: str):
    try:
        session = es_client.get_chat_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        return ChatResponse(
            success=True,
            message="Session retrieved successfully",
            data=session
        )
        
    except HTTPException as he:
        print(he)
        return ChatResponse(
            success=True,
            message="Session retrieved error",
            data=session
        )
    except Exception as e:
        print(e)
        return ChatResponse(
            success=True,
            message="Session retrieved error",
            data=session
        )

# 获取用户的所有会话列表
@router.get("/user/sessions")
async def get_user_sessions(
    user = Depends(verify_token),
    password: str = None,
    keyword: str = "",  # 添加keyword参数，默认为空字符串
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    try:
        from_ = (page - 1) * page_size
        
        query_bool_must = [
            {
                "term": {
                    "user_id": user['username']
                }
            }
        ]
        
        if password != SYS_PASSWORD:
            query_bool_must.append({
                "term": {
                    "is_delete": False
                }
            })
        
        # 如果keyword不为空，添加title搜索条件
        if keyword.strip():
            query_bool_must.append({
                "match": {
                    "title": keyword
                }
            })
        
        # 构建查询体
        query = {
            "query": {
                "bool": {
                    "must": query_bool_must
                }
            },
            "sort": [
                {"timestamp": "desc"}
            ],
            "from": from_,
            "size": page_size
        }
        
        result = es_client.client.search(
            index=CHAT_INDEX,
            body=query
        )
        
        sessions = [hit["_source"] for hit in result["hits"]["hits"]]
        total = result["hits"]["total"]["value"]
        
        return {
            "total": total,
            "sessions": sessions
        }
        
    except Exception as e:
        print(e)
        return {
            "total": 0,
            "sessions": []
        }



# 删除会话
@router.delete("/session/{session_id}", response_model=ChatResponse)
async def delete_session(session_id: str):
    try:
        # 使用update方法更新文档
        result = es_client.client.update(
            index=CHAT_INDEX,
            id=session_id,
            body={
                "doc": {
                    "is_delete": True
                }
            }
        )
        
        return ChatResponse(
            success=True,
            message="Session marked as deleted successfully"
        )
        
    except Exception as e:
        print(e)
        return ChatResponse(
            success=False,  # 这里应该是False而不是True
            message="Failed to mark session as deleted"
        )

@router.get("/users")
async def get_user_list(
    password: str = Query(..., description="系统密码"),
    size: int = Query(default=10000, description="返回用户数量上限", ge=1)  # 添加参数校验
):
    """
    获取所有用户ID列表
    需要系统密码验证
    """
    try:
        # 验证系统密码
        if password != SYS_PASSWORD:
            raise HTTPException(status_code=403, detail="Invalid system password")

        # 构建聚合查询
        query = {
            "size": 0,  
            "aggs": {
                "unique_users": {
                    "terms": {
                        "field": "user_id",
                        "size": size,
                        "order": {"_count": "desc"}  # 按会话数量降序排序
                    }
                }
            }
        }

        # 执行查询
        result = es_client.client.search(
            index=CHAT_INDEX,
            body=query
        )

        # 提取所有唯一的user_id
        user_buckets = result.get("aggregations", {}).get("unique_users", {}).get("buckets", [])
        
        # 构造返回数据
        users_data = [
            {
                "user_id": bucket["key"],
                "session_count": bucket["doc_count"]
            }
            for bucket in user_buckets
        ]

        return {
            "success": True,
            "message": "User list retrieved successfully",
            "data": {
                "total": len(users_data),
                "users": users_data
            }
        }

    except HTTPException as he:
        print(he)
        return {
            "success": False,
            "message": "Failed to retrieve user list",
            "data": {
                "users": []
            }
        }
    except Exception as e:
        print(e)
        return {
            "success": False,
            "message": "Failed to retrieve user list",
            "data": {
                "users": []
            }
        }

# 获取日期范围内的会话明细
@router.post("/sessions/date-range", response_model=ChatResponse)
async def get_sessions_by_date_range(request: DateRangeRequest):
    """获取指定日期范围内的所有会话"""
    try:
        query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "range": {
                                "created_at": {
                                    "gte": request.start_date,
                                    "lte": request.end_date
                                }
                            }
                        },
                        {
                            "term": {
                                "is_delete": False
                            }
                        }
                    ]
                }
            },
            "sort": [
                {"created_at": "desc"}
            ]
        }

        result = es_client.client.search(
            index=CHAT_STREAM_INDEX,
            body=query,
            size=10000  # 设置较大的size以获取更多结果
        )

        # 只提取需要的字段
        sessions = []
        
        for hit in result["hits"]["hits"]:
            # question = ""
            # messages = hit["_source"].get("messages")
            # if messages and len(messages) > 0:
            #     question = messages[0]['content']
            sessions.append({
                "user_id": hit["_source"].get("user_id"),
                "timestamp": hit["_source"].get("timestamp"),
                "user_question": hit["_source"].get("answer"),
                "client_type": hit["_source"].get("client_type")
            })
        total = result["hits"]["total"]["value"]

        return ChatResponse(
            success=True,
            message="Sessions retrieved successfully",
            data={
                "total": total,
                "sessions": sessions
            }
        )

    except Exception as e:
        print(e)
        return ChatResponse(
            success=False,
            message="Failed to retrieve sessions",
            data=None
        )


# 获取日期范围内的部门功能使用统计
@router.post("/sessions/department-stats", response_model=ChatResponse)
async def get_department_usage_stats(request: DateRangeRequest):
    """获取指定日期范围内各部门各功能的使用统计"""
    if request.password != SYS_PASSWORD:
        return ChatResponse(
            success=False,
            message="Unauthorized - Invalid password",
            data=None
        )

    try:
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "must": [
                        {
                            "range": {
                                "timestamp": {
                                    "gte": request.start_date,
                                    "lte": request.end_date
                                }
                            }
                        },
                        {
                            "term": {
                                "is_delete": False
                            }
                        }
                    ]
                }
            },
            "aggs": {
                "department_stats": {
                    "terms": {
                        "field": "user_id",
                        "size": 1000
                    },
                    "aggs": {
                        "ai_type_stats": {
                            "terms": {
                                "field": "ai_type",
                                "size": 100
                            }
                        }
                    }
                }
            }
        }

        result = es_client.client.search(
            index=CHAT_INDEX,
            body=query
        )

        # 处理统计结果
        stats = {}
        for dept_bucket in result["aggregations"]["department_stats"]["buckets"]:
            user_id = dept_bucket["key"]
            department = user_id.split("_")[0] if "_" in user_id else "unknown"
            
            if department not in stats:
                stats[department] = {}
            
            for ai_type_bucket in dept_bucket["ai_type_stats"]["buckets"]:
                ai_type = ai_type_bucket["key"]
                count = ai_type_bucket["doc_count"]
                
                if ai_type not in stats[department]:
                    stats[department][ai_type] = 0
                stats[department][ai_type] += count

        return ChatResponse(
            success=True,
            message="Department statistics retrieved successfully",
            data=stats
        )

    except Exception as e:
        print(e)
        return ChatResponse(
            success=False,
            message="Failed to retrieve department statistics",
            data=None
        )

# 获取用户设置
@router.get("/prompt", response_model=ChatResponse)
async def get_user_settings(
    id: str,
    password: str = Query(..., description="系统密码")
):
    """获取用户设置接口"""
    # 验证密码
    if password != SYS_PASSWORD:
        return ChatResponse(
            success=False,
            message="Unauthorized - Invalid password",
            data=None,
            status_code=401
        )
        
    try:
        settings = es_client.get_user_settings(id)
        return ChatResponse(
            success=True,
            message="User settings retrieved successfully", 
            data=settings
        )
    except Exception as e:
        print(e)
        return ChatResponse(
            success=False,
            message="Failed to retrieve user settings",
            data=None
        )

# 请求体模型
class UpdateSettingsRequest(BaseModel):
    id: str
    json_data: str
    password: str

# 更新后的接口 
@router.post("/prompt/save", response_model=ChatResponse)
async def update_user_settings(
    request: UpdateSettingsRequest
):
    """更新用户设置接口"""
    # 验证密码
    if request.password != SYS_PASSWORD:
        return ChatResponse(
            success=False,
            message="Unauthorized - Invalid password",
            data=None,
            status_code=401
        )
        
    try:
        success = es_client.update_user_settings(request.id, request.json_data)
        if success:
            return ChatResponse(
                success=True,
                message="User settings updated successfully",
                data=request.json_data
            )
        return ChatResponse(
            success=False, 
            message="Failed to update user settings",
            data=None
        )
    except Exception as e:
        print(e)
        return ChatResponse(
            success=False,
            message=f"Error updating user settings: {str(e)}",
            data=None
        )


