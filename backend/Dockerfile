# 从官方Python基础镜像开始。
FROM python:3.13.0

# 安装 Vim 编辑器和中文字体
RUN apt-get update && \
    apt-get install -y vim tmux fonts-wqy-microhei && \
    rm -rf /var/lib/apt/lists/*

# 设置时区为 Asia/Shanghai
ENV TZ=Asia/Shanghai

# 设置语言环境
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

# 将当前工作目录设置为/code。
WORKDIR /code

# 将符合要求的文件复制到/code目录中。
COPY ./requirements.txt /code/requirements.txt

# 安装需求文件中的包依赖项。
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# 将"."目录复制到"/code"目录中。
COPY . /code

# 确保 start.sh 有执行权限
RUN chmod +x /code/start.sh

# 设置命令来运行 uvicorn 服务器。
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
