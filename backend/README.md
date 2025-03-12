uvicorn main:app --host 0.0.0.0 --port 8080 --reload

cn部署：
docker build -t registry.cn-shanghai.aliyuncs.com/kdf-pub/hibor-ai:1.3.4 . 
然后去/hibor-cn 使用docker compose up -d

en部署：
docker build -t registry.cn-shanghai.aliyuncs.com/kdf-pub/hibor-eng-ai:1.3.4 . 
然后去/hibor-en 使用docker compose up -d

