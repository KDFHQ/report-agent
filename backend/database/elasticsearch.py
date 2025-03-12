from elasticsearch import Elasticsearch
from config import ES_HOST
from datetime import datetime
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# 定义索引名称和映射
CHAT_INDEX = "new_llm_chat_records"
CHAT_STREAM_INDEX = "new_llm_chat_log"
USER_SETTINGS_INDEX = "new_user_settings"

CHAT_MAPPING = {
    "mappings": {
        "properties": {
            "session_id": {"type": "keyword"},           # 会话ID
            "timestamp": {"type": "date"},               # 时间戳
            "user_id": {"type": "keyword"},             # 用户ID
            "ai_type": {"type": "keyword"},             # 用户ID
            "is_delete": {
                "type": "boolean",
                "null_value": False                      # 设置默认值为False
            },
            "title": {                                   # 会话标题
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                    }
                }
            },
            "messages": {                                # 消息数组
                "type": "nested",
                "properties": {
                    "role": {"type": "keyword"},        # 角色(user/assistant)
                    "index_name": {"type": "keyword"},        # index值
                    "content": {"type": "text"},        # 对话内容
                    "timestamp": {"type": "date"},       # 消息时间戳
                    "documents": {                       # 文档数组
                        "type": "nested",
                        "properties": {
                            "sid": {"type": "keyword"},
                            "ID": {"type": "keyword"},
                            "标题": {
                                "type": "text",
                                "fields": {
                                    "keyword": {
                                        "type": "keyword",
                                        "ignore_above": 256
                                    }
                                }
                            },
                            "发布机构": {"type": "keyword"},
                            "作者": {"type": "text"},
                            "日期": {"type": "date"},
                            "类型": {
                                "type": "keyword"
                            }
                        }
                    }
                }
            },
            "model": {"type": "keyword"},               # 使用的模型
            "total_tokens": {"type": "integer"},        # 总token数量
            "metadata": {"type": "object"},             # 其他元数据
            "created_at": {"type": "date"}              # 创建时间
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1
    }
}

CHAT_STREAM_MAPPING = {
    "mappings": {
        "properties": {
            "session_id": {"type": "keyword"},           # 会话ID
            "user_id": {"type": "keyword"},             # 用户ID
            "ai_type": {"type": "keyword"},             # 用户ID
            "question": {                               # 问题，长字符串
                "type": "text",
            },
            "answer": {"type": "text"},        # 对话内容
            "documents": {                       # 文档数组
                "type": "nested",
                "properties": {
                    "sid": {"type": "keyword"},
                    "ID": {"type": "keyword"},
                    "标题": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "发布机构": {"type": "keyword"},
                    "作者": {"type": "text"},
                    "日期": {"type": "date"},
                    "类型": {
                        "type": "keyword"
                    }
                }
            },
            "metadata": {"type": "object"},
            "model": {"type": "keyword"},               # 使用的模型
            "created_at": {"type": "date"}              # 创建时间
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1
    }
}

USER_SETTINGS_MAPPING = {
    "mappings": {
        "properties": {
            "json_data": {"type": "text"},      # JSON字符串形式的用户设置
            "updated_at": {"type": "date"}      # 更新时间
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1
    }
}

class ESClient:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ESClient, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not ESClient._initialized:
            self.client = Elasticsearch(ES_HOST, verify_certs=False)
            self._init_chat_index()
            self._init_user_settings_index()
            self._init_chat_stream_index()
            ESClient._initialized = True

    def _init_chat_index(self):
        """初始化聊天记录索引"""
        try:
            if not self.client.indices.exists(index=CHAT_INDEX):
                self.client.indices.create(
                    index=CHAT_INDEX,
                    body=CHAT_MAPPING
                )
                logger.info(f"Created index: {CHAT_INDEX}")
        except Exception as e:
            logger.error(f"Error creating index: {str(e)}")

    def _init_user_settings_index(self):
        """初始化用户设置索引"""
        try:
            if not self.client.indices.exists(index=USER_SETTINGS_INDEX):
                self.client.indices.create(
                    index=USER_SETTINGS_INDEX,
                    body=USER_SETTINGS_MAPPING
                )
                logger.info(f"Created index: {USER_SETTINGS_INDEX}")
        except Exception as e:
            logger.error(f"Error creating user settings index: {str(e)}")

    def _init_chat_stream_index(self):
        """初始化聊天记录流索引"""
        try:
            self.client.indices.create(
                index=CHAT_STREAM_INDEX,
                body=CHAT_STREAM_MAPPING
            )
            logger.info(f"Created index: {CHAT_STREAM_INDEX}")
        except Exception as e:
            logger.error(f"Error creating chat stream index: {str(e)}")

    def store_chat_session(
        self,
        session_id: str,
        user_id: str,
        ai_type: str,
        messages: List[Dict[str, Any]],
        title: str = None,
        model: str = None,
        total_tokens: int = None,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """存储完整的聊天会话"""
        try:
            # 为每条消息添加时间戳
            messages_with_timestamp = [
                {**msg, "timestamp": datetime.now().isoformat()}
                for msg in messages
            ]
            
            doc = {
                "session_id": session_id,
                "is_delete": False,
                "timestamp": datetime.now(),
                "user_id": user_id,
                "ai_type": ai_type,
                "title": title,
                "messages": messages_with_timestamp,
                "model": model,
                "total_tokens": total_tokens,
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat()
            }
            
            # 使用session_id作为文档ID，这样可以实现更新操作
            self.client.index(
                index=CHAT_INDEX,
                id=session_id,
                document=doc
            )
            return True
        except Exception as e:
            logger.error(f"Error storing chat session: {str(e)}")
            return False

    def update_chat_session(
        self,
        session_id: str,
        new_message: Dict[str, Any],
        total_tokens: int = None
    ) -> bool:
        """更新现有会话，添加新消息"""
        try:
            new_message_with_timestamp = {
                **new_message,
                "timestamp": datetime.now().isoformat()
            }
            
            update_body = {
                "script": {
                    "source": """
                        ctx._source.messages.add(params.new_message);
                        if (params.total_tokens != null) {
                            ctx._source.total_tokens = params.total_tokens;
                        }
                    """,
                    "params": {
                        "new_message": new_message_with_timestamp,
                        "total_tokens": total_tokens
                    }
                }
            }
            
            self.client.update(
                index=CHAT_INDEX,
                id=session_id,
                body=update_body
            )
            return True
        except Exception as e:
            logger.error(f"Error updating chat session: {str(e)}")
            return False

    def update_chat_session_title(
        self,
        session_id: str,
        new_title: str
    ) -> bool:
        """更新会话标题"""
        try:
            update_body = {
                "doc": {
                    "title": new_title
                }
            }
            
            self.client.update(
                index=CHAT_INDEX,
                id=session_id,
                body=update_body
            )
            return True
        except Exception as e:
            logger.error(f"Error updating chat session title: {str(e)}")
            return False

    def get_chat_session(self, session_id: str) -> Dict[str, Any]:
        """获取指定会话的完整聊天记录"""
        try:
            result = self.client.get(
                index=CHAT_INDEX,
                id=session_id
            )
            return result["_source"]
        except Exception as e:
            logger.error(f"Error retrieving chat session: {str(e)}")
            return {}

    def get_user_chat_sessions(
        self,
        user_id: str,
        from_: int = 0,
        size: int = 10,
        sort_by: str = "timestamp",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """获取用户的所有会话列表"""
        try:
            query = {
                "query": {
                    "term": {
                        "user_id": user_id
                    }
                },
                "sort": [
                    {sort_by: {"order": sort_order}}
                ],
                "from": from_,
                "size": size
            }
            
            result = self.client.search(
                index=CHAT_INDEX,
                body=query
            )
            
            return {
                "total": result["hits"]["total"]["value"],
                "sessions": [hit["_source"] for hit in result["hits"]["hits"]]
            }
        except Exception as e:
            logger.error(f"Error retrieving user chat sessions: {str(e)}")
            return {"total": 0, "sessions": []}

    def delete_chat_session(self, session_id: str) -> bool:
        """删除指定的会话"""
        try:
            self.client.delete(
                index=CHAT_INDEX,
                id=session_id
            )
            return True
        except Exception as e:
            logger.error(f"Error deleting chat session: {str(e)}")
            return False

    def get_user_settings(self, user_id: str) -> str:
        """获取用户设置"""
        try:
            result = self.client.get(
                index=USER_SETTINGS_INDEX,
                id=user_id
            )
            return result["_source"]["json_data"]
        except Exception as e:
            logger.error(f"Error retrieving user settings: {str(e)}")
            return ""

    def update_user_settings(self, user_id: str, json_data: str) -> bool:
        """创建或更新用户设置"""
        try:
            doc = {
                "json_data": json_data,
                "updated_at": datetime.now().isoformat()
            }
            
            self.client.index(
                index=USER_SETTINGS_INDEX,
                id=user_id,
                document=doc
            )
            return True
        except Exception as e:
            logger.error(f"Error updating user settings: {str(e)}")
            return False

    def store_chat_stream(
        self,
        session_id: str,
        user_id: str,
        ai_type: str,
        question: str,
        answer: Dict[str, Any],
        documents: Any,
        metadata: Any = None,
        model: str = None
    ) -> bool:
        """存储聊天流记录"""
        try:
            doc = {
                "session_id": session_id,
                "user_id": user_id,
                "ai_type": ai_type,
                "question": question,
                "answer": answer,
                "documents": documents,
                "model": model,
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat()
            }
            
            self.client.index(
                index=CHAT_STREAM_INDEX,
                document=doc
            )
            return True
        except Exception as e:
            logger.error(f"Error storing chat stream: {str(e)}")
            return False

# 创建全局单例实例
es_client = ESClient()
