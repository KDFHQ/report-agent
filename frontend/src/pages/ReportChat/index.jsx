import { Button, Menu, List, Spin, Popconfirm, Empty, message } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { DeleteOutlined, MessageOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import Icon from "@/components/Icon";
import user from "@/worker/user";
import api from "@/worker/api";
import { useRequest } from "ahooks";
import { observer } from "mobx-react-lite";
import Chat from "./Chat";
import chat_store from "./store";
import History from "./History";
import Related from "./Related";

function createFormattedTime() {
  const date = new Date(); // 创建特定时间
  // 或者使用当前时间：const date = new Date();

  // 获取年月日时分秒
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  // 获取毫秒并扩展到微秒（JavaScript 只支持到毫秒）
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  const microseconds = milliseconds + "516"; // 添加微秒部分（这里是固定值）

  // 组合成所需格式
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${microseconds}`;
}

function LeftMenu({ className }) {
  const [collapsed, setCollapsed] = useState(true);
  const navigate = useNavigate();
  const { type } = useParams();

  const items = [
    {
      key: "cn",
      icon: <Icon name="yanbao" />,
      label: "中文研报",
    },
    {
      key: "en",
      icon: <Icon name="yanbao" />,
      label: "英文研报",
    },
  ];

  // 处理鼠标移入事件
  const handleMouseEnter = () => {
    setCollapsed(false);
  };

  // 处理鼠标移出事件
  const handleMouseLeave = () => {
    setCollapsed(true);
  };

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Menu
        mode="inline"
        theme="dark"
        items={items}
        onClick={({ key }) => {
          navigate(`/report/${key}`, { replace: true });
        }}
        selectedKeys={[type]}
        inlineCollapsed={collapsed}
        className="h-full"
      />
    </div>
  );
}

export default observer(function ReportChat() {
  const tabActive = useRef(null);
  const imageData = useRef(null);
  const [PDF地址, 设置PDF地址] = useState(null)
  const [显示标签, 设置显示标签] = useState(null);
  const [相关索引, 设置相关索引] = useState(null);
  const { type } = useParams();
  const type_obj = {
    cn: {
      index_name: "newyanbao_main",
    },
    en: {
      index_name: "newyanbao_eng_main",
    },
  };

  // 删除聊天会话
  async function deleteChatSession(sessionId) {
    try {
      const response = await user.delete(`${api.chat_view}/${sessionId}`);
      if (response.data.success) {
        // 如果删除的是当前会话，清空当前会话
        if (chat_store.selected_session_id === sessionId) {
          chat_store.setSelectedSessionId(null);
        }
        // 从列表中移除该会话
        chat_store.sessions.delete(sessionId);
        chat_store.sessions = new Map([...chat_store.sessions]);
      }
      return response.data;
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      throw error;
    }
  }

  async function sendMessage(question) {
    let session_data = {};
    if (chat_store.selected_session) {
      session_data = chat_store.selected_session;
    } else {
      session_data.title = question;
      const res = await createChatSession(session_data);
      chat_store.sessions.set(res.data.session_id, res.data);
      chat_store.setSelectedSessionId(res.data.session_id);
    }
    const answer = {
      role: "robot",
      content: "思考中...",
      index_name: type_obj[type].index_name,
      timestamp: createFormattedTime(),
    };
    const new_session = {
      ...chat_store.selected_session,
      messages: [
        ...chat_store.selected_session.messages,
        {
          role: "user",
          content: question,
          index_name: type_obj[type].index_name,
          timestamp: createFormattedTime(),
        },
        answer,
      ],
    };
    chat_store.sessions.set(chat_store.selected_session_id, new_session);
    await user.talkLLM(
      {
        collection_name: "newyanbao_main",
        index_name: "newyanbao_main",
        question,
      },
      (data) => {
        try {
          const lines = data.split("\n\n");
          lines.forEach((line) => {
            if (line.trim()) {
              const json_data = JSON.parse(line);
              if ("short_id_mapping" in json_data) {
                answer.short_id_mapping = json_data.short_id_mapping;
              }
              if ("documents" in json_data) {
                answer.documents = json_data.documents;
              }
              if (json_data.data) {
                if (answer.content == "思考中...") {
                  answer.content = json_data.data;
                } else {
                  answer.content += json_data.data;
                }
              }
              chat_store.sessions.set(
                chat_store.selected_session_id,
                new_session
              );
            }
          });
        } catch (err) {
          console.log(data);
        }
      }
    );
    await createChatSession(chat_store.selected_session);
  }

  // 创建或更新的聊天会话
  async function createChatSession(sessionData = null) {
    try {
      const data = {
        user_id: user.user_info.username,
        title:
          sessionData && sessionData.title ? sessionData.title : "New chat",
        messages:
          sessionData && sessionData.messages ? sessionData.messages : [],
        model: sessionData && sessionData.model ? sessionData.model : "",
        total_tokens:
          sessionData && sessionData.total_tokens
            ? sessionData.total_tokens
            : 0,
        metadata:
          sessionData && sessionData.total_tokens ? sessionData.metadata : {},
        timestamp: new Date().toISOString(),
      };

      if (sessionData && "session_id" in sessionData) {
        data.session_id = sessionData.session_id;
      }

      data.ai_type = "newyanbao_main";
      const response = await user.post(api.chat_view, data);
      if (response.data.success) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      throw error;
    }
  }

  const relatedOnClick = (
    msg,
    paraId,
    page_num,
    index,
    pointer = null,
    file_name = "",
    index_name
  ) => {
    设置显示标签("yinyong");
    设置相关索引(index);
    设置PDF地址(`${api.BASE_URL}/report/pdf/page_pdf/${msg}/${page_num}/${index_name}`)
    imageData.current = {
      query: msg,
      paraId: paraId,
      ai_type: index_name,
      ai_type2: index_name,
      page_num: page_num,
      message_index: index,
      pointer: pointer,
      file_name: file_name,
    };
  };

  useEffect(() => {
    window.relatedOnClick = relatedOnClick;
  }, []);

  return (
    <div className="flex w-full h-full">
      <LeftMenu className="h-full" />
      <History
        className="shrink-0 z-10 w-60 flex flex-col shadow"
        sessions={chat_store.sessions}
        setSessions={chat_store.setSessions}
        selectSessionId={chat_store.selected_session_id}
        onItemClick={(id) => {
          设置显示标签(null);
          设置相关索引(null);
          设置PDF地址(null)
          if (chat_store.selected_session_id == id) {
            chat_store.setSelectedSessionId(null);
          } else {
            chat_store.setSelectedSessionId(id);
          }
        }}
        onDelete={deleteChatSession}
        onCreate={() => chat_store.setSelectedSessionId(null)}
      />
      <Chat
        className="flex-1"
        data={
          chat_store.selected_session
            ? chat_store.selected_session.messages
            : []
        }
        onSendMessage={sendMessage}
      />
      {显示标签 && (
        <Related
          relatedItems={
            chat_store.selected_session.messages[相关索引].documents
          }
          pdfUrl={PDF地址}
          className="w-1/4 shadow overflow-y-auto"
          actTab={显示标签}
          onClick={relatedOnClick}
          onClose={() => 设置显示标签(null)}
        />
      )}
    </div>
  );
});
