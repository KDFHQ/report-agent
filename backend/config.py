import os
from typing import Dict, List

# 基础URL配置
BASE_URLS: Dict[str, str] = {
    "CHAT_BASE": os.getenv("CHAT_BASE_URL", "https://llmai.hibor.com.cn/zx_search_data/api"),
    "OTHER_BASE": os.getenv("OTHER_BASE_URL", "https://llmai.hibor.com.cn/zx_search_data/api"),
    "CUSTOM_OTHER_BASE": os.getenv("CUSTOM_OTHER_BASE", "https://llmai.hibor.com.cn/zx_search_data/api")
}

CAP_BACKEND = os.getenv("CAP_BACKEND", "http://cap-backend-app.aipaas-cap:8080")
ZX_IMG_HOST = os.getenv("ZX_IMG_HOST", "https://cap.citicsinfo.com")

ES_HOST = os.getenv("ES_HOST", "https://elastic:Nxezg5zbJJPm@47.92.83.106:9200/")
SYS_PASSWORD = os.getenv("SYS_PASSWORD", "asdasdasd")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", """-----BEGIN PRIVATE KEY-----
MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBAOw+Qv4thFXOOTXrjvMX9ZCV1vsbXRKwjFEqX6cnMU17bTH7orv9Fidc8uYYLIB4BXSEhydYMu6lP3Gbh0j4jgnc/Kj4aWu3sLwgYDQwDDIMc73MTnO0Dhx7VX4+vAWpH5sCQYVNl6YfbWpG8GeR3Mm4FVI5bOIIrZApDKoIHzxHAgMBAAECgYBjQ3IAvP1a1HDjgBurdwi+fMc88W11GeuLeyN/547mwJLMKrBhDuGNHpgNKGEihcu8/qaPWJbmAVccFD6O4alEGwPEharDiVo2J+1JMjvUHfkYiadVz8E0vMOj/9koQF3D5aGQa/JyxZdWbj3387sy6yWXmwq71vsE3+ePpNE4QQJBAPfrwm/64+xnL8aDkhhnnYFdRPBcJIywzRmCc9mT7qZek4u01ctBA3hFpqfrfPQG9tdojXyk33V/afajvhtcKWECQQDz8RUmuNYNOJPHF7PYEDZ7ehIpglPZA0JBcNyRV4BkVxBy/nTodAsGe0GtbNm32H6/6LJTBSxiYkIFtTRJMv6nAkEAhYC8PIbTE6thK7oQAvpQ86ehBvnnaKeQWotIDUM/APHu7A1eD0ycLLj9DHGf4NybMdYIUrWJ64DIM9tq9NrFIQJBAJ3t3bC1B7eFgn7pxIBEdtFYBXwkKR6dMn7lj5b1HGVZzId2X7/CqQSoNawOhaG1otGh2BlRhxum23GQj+o3/o8CQBGiWhMiW6AuxFixs2BoHW3dM5oLHU6cG5BvA7uBqSLJUtLCGK2AiygAqUZEowUylkqJhAuqoZguaEa6ncMf8Ao=
-----END PRIVATE KEY-----
""")

# API路径配置
API_PATH_CONFIG: Dict[str, str] = {
    # "CHAT_STREAM": "/qa_with_remote_context/chat_stream",
    "CHAT_STREAM": "/agent/yanbao_qa_new/chat_stream",
    "PARA_INFO": "/para",
    "TABLE_INFO": "/table_figure",
    "PDF_PAGE_FILE": "/pdf/page_pdf",
    "PDF_FILE": "/pdf/doc_pdf",
    "TABLE_FILE": "/table_figure",
    "FIGURE_INFO": "/figure",
    "PAGE_INFO": "/page",
    "PAGE_TEXT_INFO": "/page_text",
    "PAGE_HTML_INFO": "/page_html",
    "BIGDATA_QUERY": "/query"
}


def build_api_endpoints() -> Dict[str, str]:
    """构建完整的API端点URL"""
    endpoints: Dict[str, str] = {}
    
    for endpoint, path in API_PATH_CONFIG.items():
        if endpoint == "CHAT_STREAM":
            # chat_stream的前缀不变
            base_url = BASE_URLS["CHAT_BASE"]
            env_path = os.getenv(f"{endpoint}_PATH", path)
            local_env_path = os.getenv(f"CUSTOM_{endpoint}_PATH", path)
            # 构建一份远程地址
            endpoints[endpoint] = f"{base_url}{env_path}"
            # 构建一份本地的访问地址
            endpoints[f"CUSTOM_{endpoint}"] = f"{base_url}{local_env_path}"
        else:
            env_path = os.getenv(f"{endpoint}_PATH", path)
            # 构建一份远程地址
            endpoints[endpoint] = f"{BASE_URLS['OTHER_BASE']}{env_path}"
            # 构建一份本地的访问地址
            endpoints[f"CUSTOM_{endpoint}"] = f"{BASE_URLS['CUSTOM_OTHER_BASE']}{env_path}"
    
    return endpoints


# 构建API端点
API_ENDPOINTS: Dict[str, str] = build_api_endpoints()

def get_url(index_name, keywords):
    # 如果在这里是访问远程的
    if index_name in ['newyanbao_main', 'newyanbao_eng_main', 'notice_main', 'news_main', 'jiyao_main', 'newyanbao_main,newyanbao_eng_main', 'newyanbao_eng_main,newyanbao_main']:
        return API_ENDPOINTS[keywords]
    # 否则访问本地的
    else:
        return API_ENDPOINTS[f"CUSTOM_{keywords}"]


# 跨域配置
CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:8080").split(",")
