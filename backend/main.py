import uuid
from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
import os
from config import CORS_ORIGINS, get_url
from controller import ChatController, ReportController, UserController

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static", html=True), name="static")
# 聊天相关
app.include_router(ChatController.router, prefix="/api/chat")
# 研报相关
app.include_router(ReportController.router, prefix="/api/report")
# 研报相关
app.include_router(UserController.router, prefix="/api/user")

# 处理根路径请求，返回index.html
@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

# 处理所有非API请求
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # 如果请求路径以 api/ 开头，返回404
    if full_path.startswith("api/"):
        return {"detail": "Not Found"}
    
    # 处理根路径请求
    if full_path == "" or full_path == "/":
        return FileResponse("static/index.html")
    
    # 检查是否是静态资源请求（判断是否有扩展名）
    if "." in full_path:
        file_path = os.path.join("static", full_path.replace("research/", ""))
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
    
    # 不是静态资源请求，返回index.html（用于前端路由）
    return FileResponse("static/index.html")
