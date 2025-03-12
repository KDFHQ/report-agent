from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import arrow

import hashlib

SECRET_KEY = 'askdljqwpoeuinvxlkcuhiowqeryqb'
ALGORITHM = "HS256"
# 令牌有效时间 单位：分钟   30天有效
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30

def md5(input_str):
    md5_obj = hashlib.md5()
    md5_obj.update(input_str.encode('utf-8'))
    md5_str = md5_obj.hexdigest()
    return md5_str

def create_token(auth = ["newyanbao_main", "yanbao_zhongxin1", "yanbao_zhongxin2"]) -> str:
    token = 'USER' + '.' + ','.join(auth) + '.' + str(uuid.uuid4())
    return token + md5(SECRET_KEY + token)

# 验证create_token生成的token
def verify_access_token(token: str) -> bool:
    if md5(SECRET_KEY + token[:-32]) == token[-32:]:
        return True
    else:
        return False

security_scheme = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_jwt_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_token(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> str:
    if credentials.scheme != "Bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="身份验证方案无效，必须是Bearer！",
        )
    return credentials.credentials

async def verify_token(token: str = Depends(get_token)) -> Optional[str]:
    try:
        if token.startswith('USER'):
            if verify_access_token(token):
                return token
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="非法令牌",
                )
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="非法令牌",
        )
  
