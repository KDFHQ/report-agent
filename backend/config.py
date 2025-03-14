import os
from typing import Dict, List
from dotenv import load_dotenv

# 首先加载环境变量
load_dotenv()

# 基础URL配置
BASE_URLS: Dict[str, str] = {
    "CHAT_BASE": os.getenv("CHAT_BASE_URL", ""),
    "OTHER_BASE": os.getenv("OTHER_BASE_URL", "")
}

ES_HOST = os.getenv("ES_HOST", "")
SYS_PASSWORD = os.getenv("SYS_PASSWORD", "2fcx1KPZJuNJ")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

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
        base_url = BASE_URLS['OTHER_BASE']
        if endpoint == "CHAT_STREAM":
            # chat_stream的前缀不变
            base_url = BASE_URLS["CHAT_BASE"]
        env_path = os.getenv(f"{endpoint}_PATH", path)
        endpoints[endpoint] = f"{base_url}{env_path}"
    
    return endpoints


# 构建API端点
API_ENDPOINTS: Dict[str, str] = build_api_endpoints()

def get_url(index_name, keywords):
    return API_ENDPOINTS[keywords]
    # 如果在这里是访问远程的
    if index_name in ['newyanbao_main', 'newyanbao_eng_main', 'notice_main', 'news_main', 'jiyao_main', 'newyanbao_main,newyanbao_eng_main', 'newyanbao_eng_main,newyanbao_main']:
        return API_ENDPOINTS[keywords]
    # 否则访问本地的
    else:
        return API_ENDPOINTS[f"CUSTOM_{keywords}"]


# 跨域配置
CORS_ORIGINS = ['*']
SALT = os.getenv("PASSWORD_SALT", "yigeshenqideyan")
