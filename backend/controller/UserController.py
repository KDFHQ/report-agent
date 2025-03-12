import hashlib
import os
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from auth import create_jwt_access_token
from datetime import timedelta

# 定义请求和响应模型
class LoginRequest(BaseModel):
    username: str
    password: str

router = APIRouter()

# 从环境变量或配置文件获取盐值
SALT = os.getenv("PASSWORD_SALT", "yigeshenqideyan")

def verify_password(username: str, password: str) -> bool:
    """验证用户密码"""
    md5_input = f"{username}{SALT}"
    md5_hash = hashlib.md5(md5_input.encode('utf-8')).hexdigest()
    expected_password = md5_hash[:8]
    return password == expected_password

@router.post("/login")
async def login(req_data: LoginRequest):
    try:
        username = req_data.username
        password = req_data.password
        
        # 验证请求数据
        if not username or not password:
            raise HTTPException(status_code=400, detail="用户名和密码不能为空")
        
        # 验证密码
        if verify_password(username, password):
            return {
                "username": username,
                "access_token": create_jwt_access_token({"username": username}, timedelta(days=365))
            }
        else:
            raise HTTPException(status_code=401, detail="用户名或密码错误")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")
