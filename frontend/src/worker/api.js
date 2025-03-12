const BASE_URL = "http://127.0.0.1:8080/api"

export default {
    
    BASE_URL,
    /**
     * 用户相关
     */
    // POST 登录
    user_login: '/user/login',
    
    // 对话记录
    chat_sessions: "/chat/user/sessions",
    // 创建对话
    chat_view: "/chat/session",


    // 研报对话
    report_chat_stream: "/report/chat_stream"
    
}
