# 使用 Node.js 镜像来构建前端
FROM node:18-alpine AS frontend-build

# 设置工作目录
WORKDIR /app/frontend

# 复制前端项目文件
COPY frontend/package.json frontend/yarn.lock* ./

# 安装 yarn（如果镜像中没有预装）
RUN apk add --no-cache yarn || true

# 安装依赖
RUN yarn install --frozen-lockfile

# 复制前端源代码
COPY frontend/ ./

# 构建前端
RUN yarn build

# 使用 Python 镜像来运行后端
FROM python:3.13.0
# 安装 Vim 编辑器。
RUN apt-get update && apt-get install -y vim && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制后端项目文件
COPY backend/requirements.txt ./

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端源代码
COPY backend/ ./

# 创建 static 目录（如果不存在）
RUN mkdir -p static

# 从前端构建阶段复制构建好的文件到后端的 static 目录
COPY --from=frontend-build /app/frontend/dist/ ./static/

# 暴露端口（根据你的 FastAPI 应用配置调整）
EXPOSE 8000

# 启动 FastAPI 应用
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
