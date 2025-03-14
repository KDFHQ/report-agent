import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input, Button, Avatar, Spin, Tooltip, message, Switch } from "antd";
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  CopyOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import user from "@/worker/user";
import api from "@/worker/api";
import ReactMarkdown from "@/components/ReactMarkdown";
import TimeRangeSelector from './TimeRangeSelector'

/**
 * 格式化ISO格式的时间字符串
 * @param {string} isoTimeString - ISO格式的时间字符串，如"2025-03-12T13:18:52.358516"
 * @param {string} format - 输出格式，默认为"YYYY-MM-DD HH:mm:ss"
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(isoTimeString, format = "YYYY-MM-DD HH:mm:ss") {
  // 创建日期对象
  const date = new Date(isoTimeString);

  // 获取日期的各个部分
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  // 替换格式字符串中的占位符
  return format
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds)
    .replace("SSS", milliseconds);
}

const History = ({ messages, onRelatedClick }) => {
  const [隐藏的索引, 设置隐藏的索引] = useState([]);

  return messages.map((message, index) => (
    <div
      key={index}
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-3xl rounded-lg p-4 ${
          message.role === "user"
            ? "bg-blue-100 text-gray-800 border border-blue-200"
            : "bg-white border border-gray-200 shadow-sm"
        }`}
      >
        <div className="flex items-center mb-3">
          <Avatar
            size={36}
            icon={
              message.role === "user" ? (
                <UserOutlined />
              ) : (
                <RobotOutlined />
              )
            }
            className={
              message.role === "user" ? "bg-blue-500" : "bg-green-500"
            }
          />
          <div className="ml-3">
            <div className="font-medium text-sm">
              {message.role === "user" ? "你" : "AI 助手"}
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </div>
          </div>
          {message.documents && (
            <div
              className="ml-auto inline-block bg-amber-600 text-white rounded-md px-2 py-1 w-auto cursor-pointer text-xs"
              onClick={() => onRelatedClick(message)}
            >
              检索到相关文档: {message.documents.length}
            </div>
          )}
        </div>

        <div
          id={`copy_area_${index}`}
          className={`prose max-w-none ${
            message.role === "user"
              ? "text-gray-800"
              : "text-gray-800 markdown"
          }`}
        >
          {message.role === "user" ? (
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
              {message.content}
            </p>
          ) : (
            <>
              {message.think && <div className="flex flex-col mb-2">
                <div
                  className="flex items-center bg-blue-400 text-white rounded-md px-2 mr-auto cursor-pointer"
                  onClick={() =>
                    设置隐藏的索引((ids) => {
                      if (ids.indexOf(index) === -1) {
                        // 如果不存在，就添加
                        return [...ids, index];
                      } else {
                        // 如果存在，就删除
                        return ids.filter((item) => item !== index);
                      }
                    })
                  }
                >
                  点击{隐藏的索引.indexOf(index) == -1 ? "隐藏" : "展开"}思考内容
                  <LeftOutlined
                    className="ml-1 mt-[1px]"
                    rotate={隐藏的索引.indexOf(index) == -1 ? -90 : 180}
                  />
                </div>
                {隐藏的索引.indexOf(index) == -1 && (
                  <div className="think my-1">
                    <ReactMarkdown>{message.think}</ReactMarkdown>
                  </div>
                )}
              </div>}
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </>
          )}
        </div>

        <div className="flex justify-end mt-3 space-x-2">
          <Tooltip title="复制">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyMessage(`copy_area_${index}`)}
              className={`hover:opacity-80 transition-opacity ${
                message.role === "user"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            />
          </Tooltip>
          {/* <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => deleteMessage(index)}
              className={`hover:opacity-80 transition-opacity ${
                message.role === "user"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            />
          </Tooltip> */}
        </div>
      </div>
    </div>
  ))
}

// 使用 Tailwind CSS 进行样式设计

const relatedInfo = {};
const ChatComponent = ({ className, data, onRelatedClick, onSendMessage }) => {
  const [时间区间, 设置时间区间] = useState(['auto', [null, null]])
  const [连续对话, 设置连续对话] = useState(false)
  const figureCount = useRef(0);
  const tableCount = useRef(0);
  const chatContainer = useRef(null);
  const [show_img_id, setShowImgIdOrigin] = useState([]);
  const [相关请求更新, 设置相关请求更新] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  function setShowImgId(id) {
    setShowImgIdOrigin((ids) => {
      if (ids.indexOf(id) === -1) {
        // 如果不存在，就添加
        return [...ids, id];
      } else {
        // 如果存在，就删除
        return ids.filter((item) => item !== id);
      }
    });
  }

  const fetchParaInfo = async (paraId, index_name, message_index) => {
    try {
      let url = `${api.BASE_URL}/report/para/${index_name}/${paraId}`;

      if (paraId.startsWith("hb_") && index_name == "yanbao_zs_20250110") {
        url = `${api.BASE_URL}/report/para/newyanbao_main/${paraId}`;
      }
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.data) {
        const obj = data.data;
        return {
          title: obj.title,
          para: obj.para,
          doc_id: obj.doc_id,
          page_num: obj.page_num,
          dom: `<small class="block text-xs"> 来自 <span class="text-gray-400 cursor-pointer hover:text-gray-500" onclick="relatedOnClick('${
            obj.doc_id
          }', '${paraId}', ${obj.page_num}, ${message_index}, { x: ${
            obj.para_element_x
          }, y: ${obj.para_element_y}, w: ${obj.para_element_w}, h: ${
            obj.para_element_h
          }}, '${obj.title}')">《${obj.title}》</span> ${obj.doc_date} 第 ${
            obj.page_num + 1
          } 页</small>`,
          img_dom: "",
        };
      }
    } catch (error) {
      console.error("fetchParaInfo error", paraId, error);
      return null;
    }
  };

  const fetchTableInfo = async (tableId, count, index_name, message_index) => {
    try {
      const response = await fetch(`${api.BASE_URL}/report/table_info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          index_name,
          collection_name: index_name,
          query: tableId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let obj = data.data[0];

      if (obj) {
        const onclick = `relatedOnClick('${obj.doc_id}', '${tableId}', ${obj.page_num}, ${message_index}, { x: ${obj.para_element_x}, y: ${obj.para_element_y}, w: ${obj.para_element_w}, h: ${obj.para_element_h}}, '${obj.title}')`;
        return {
          title: obj.title,
          para: obj.para,
          doc_id: obj.doc_id,
          page_num: obj.page_num,
          dom: `<div class="img-title text-xs inline">【表${count}】：<span class="text-gray-400 cursor-pointer hover:text-gray-500" onclick="${onclick}">《${
            obj.title
          }》</span> ${obj.doc_date} 第${obj.page_num + 1}页</div>`,
          img_dom: `<img title="点击图片可以查看图片来源" onclick="${onclick}" src="${api.BASE_URL}/table_figure/${index_name}/${tableId}" />`,
        };
      }
    } catch (e) {
      console.error("fetchTableInfo error", tableId, e);
    }
    return null;
  };

  const fetchFigureInfo = async (
    figureId,
    count,
    index_name,
    message_index
  ) => {
    try {
      const response = await fetch(`${api.BASE_URL}/report/figure_info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          query: figureId,
          index_name,
          collection_name: index_name,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data) {
        const obj = data.data[0];
        const onclick = `relatedOnClick('${obj.doc_id}', '${figureId}', ${
          obj.page_num
        }, ${message_index}, { x: ${obj.para_element_x}, y: ${
          obj.para_element_y
        }, w: ${obj.para_element_w}, h: ${
          obj.para_element_h
        }}, '${obj.title.replace(/(\d{2})(\d{2})(\d{2})$/gm, "$1/$2/$3")}')`;
        return {
          title: obj.title,
          para: obj.para,
          doc_id: obj.doc_id,
          page_num: obj.page_num,
          dom: `<div class="img-title text-xs inline">【图${count}】：<span class="text-gray-400 cursor-pointer hover:text-gray-500" onclick="${onclick}">《${obj.title.replace(
            /(\d{2})(\d{2})(\d{2})$/gm,
            "$1/$2/$3"
          )}》</span> ${obj.doc_date} 第${obj.page_num + 1}页</div>`,
          img_dom: `<img title="点击图片可以查看图片来源" data-src="${data.image}" onclick="${onclick}"/>`,
        };
      }
    } catch (error) {
      console.error("fetchFigureInfo error", figureId, error);
      return null;
    }
  };

  const getRelatedInfo = (msg, index_name, message_index) => {
    if (msg in relatedInfo) {
      if (relatedInfo[msg].is_over) {
        return relatedInfo[msg].data;
      }
      return null;
    }

    if (msg.startsWith("para-")) {
      const paraId = msg.slice(5);
      if (!(msg in relatedInfo)) {
        relatedInfo[msg] = { is_over: false };
        fetchParaInfo(paraId, index_name, message_index).then((info) => {
          if (info) {
            relatedInfo[msg] = { is_over: true, data: info };
            设置相关请求更新((n) => n + 1);
          }
        });
      }
    }

    if (msg.startsWith("table-")) {
      const tableId = msg.slice(6);
      if (!(msg in relatedInfo)) {
        relatedInfo[msg] = { is_over: false };
        tableCount.current++;
        fetchTableInfo(
          tableId,
          tableCount.current,
          index_name,
          message_index
        ).then((info) => {
          if (info) {
            relatedInfo[msg] = { is_over: true, data: info };
            设置相关请求更新((n) => n + 1);
          }
        });
      }
    }

    if (msg.startsWith("figure-")) {
      const figureId = msg.slice(7);
      if (!(msg in relatedInfo)) {
        relatedInfo[msg] = { is_over: false };
        figureCount.current++;
        fetchFigureInfo(
          figureId,
          figureCount.current,
          index_name,
          message_index
        ).then((info) => {
          if (info) {
            relatedInfo[msg] = { is_over: true, data: info };
            设置相关请求更新((n) => n + 1);
          }
        });
      }
    }

    if (!(msg in relatedInfo)) {
      relatedInfo[msg] = {
        is_over: true,
        data: {
          title: msg,
          para: msg,
          doc_id: msg,
          page_num: msg,
        },
      };
    }
    return null;
  };

  const customMarked = (item, message_index) => {
    let text = "";
    if (item.think) {
      text = `<think>${item.think}</think>\n\n`;
    }
    text += item.content;
    const name_map = new Map();
    if ("short_id_mapping" in item) {
      item.short_id_mapping.forEach((item) => {
        name_map.set(item[0], item[1]);
      });
    }
    if (text.indexOf("<think>") != -1 && text.indexOf("</think>") == -1) {
      text += "</think>";
    }

    const img_num = {};

    text = text.replace(/\[?\[([\w-{}]+)\]?\]/g, (match, p1) => {
      p1 = p1.replace("{", "");
      p1 = p1.replace("}", "");
      try {
        if (name_map.has(p1)) {
          p1 = name_map.get(p1);
        }
      } catch (err) {
        console.log(err);
      }

      const related_info = getRelatedInfo(p1, item.index_name, message_index);
      if (!related_info) {
        return "";
      }

      let ret_dom = related_info.dom;

      if (p1.startsWith("table") || p1.startsWith("figure")) {
        if (!(p1 in img_num)) {
          img_num[p1] = 1;
        } else {
          img_num[p1]++;
        }
        if (img_num[p1] > 1) {
          const id = `${p1}_${img_num[p1]}`;
          if (show_img_id.indexOf(id) != -1) {
            ret_dom =
              ret_dom +
              `<span class="text-xs ml-1 cursor-pointer" onclick="setShowImgId('${id}')">▼</span>` +
              related_info.img_dom;
          } else {
            ret_dom =
              ret_dom +
              `<span class="text-xs ml-1 cursor-pointer" onclick="setShowImgId('${id}')">◄</span>`;
          }
        } else {
          ret_dom = ret_dom + related_info.img_dom;
        }
      }
      return ret_dom || "";
    });

    text = text.replace(/\[\[([\w-{}]+)/g, (match, p1) => {
      return "";
    });

    const regex = /<\/?del>/gi;
    text = text.replace(regex, "~");

    let think = "";
    const think_start = text.indexOf("<think>");
    if (think_start !== -1) {
      const think_end = text.indexOf("</think>");
      if (think_end !== -1) {
        think = text.slice(think_start, think_end);
        text = text.slice(0, think_start) + text.slice(think_end);
      } else {
        think = text.slice(think_start, think_end);
        text = "";
      }
    }

    return {
      think,
      content: text,
    };
  };

  const messages = useMemo(() => {
    return data.map((item, index) => {
      let cp_item = { ...item };
      if (cp_item.role != "user") {
        const answer = customMarked(cp_item, index);
        cp_item.think = answer.think || cp_item.think;
        cp_item.content = answer.content;
      }
      return cp_item;
    });
  }, [data, customMarked, 相关请求更新]);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 跟踪用户是否手动滚动
  const [userScrolled, setUserScrolled] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const handleWheel = (element) => {
      // deltaY 属性表示垂直滚动方向
      // 正值表示向下滚动，负值表示向上滚动
      if (element.deltaY > 0) {
        setUserScrolled(false);
      } else if (element.deltaY < 0) {
        setUserScrolled(true);
      }
    };

    if (chatContainer.current) {
      chatContainer.current.addEventListener("wheel", handleWheel);
    }

    return () => {
      if (chatContainer.current) {
        chatContainer.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, [chatContainer.current]);

  useEffect(() => {
    // 只有在用户没有手动滚动时，或消息列表为空时才自动滚动
    if (!userScrolled || messages.length === 0) {
      scrollToBottom();
    }
  }, [messages, userScrolled]);

  // 模拟发送消息给 LLM 并获取回复
  const sendMessage = async () => {
    if (!input.trim()) return;

    setInput("");
    setLoading(true);

    try {
      await onSendMessage(input.trim(), 连续对话, 时间区间);
    } catch (error) {
      console.error("Error fetching response:", error);
      // 可以添加错误消息到对话中
    }
    setLoading(false);
  };

  // 复制消息内容并显示提示
  const copyMessage = (id) => {
    navigator.clipboard.writeText(document.getElementById(id).textContent);
    message.success("内容已复制到剪贴板");
  };

  // 处理按键事件（Enter 发送消息）- 更新为React 18兼容写法
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  // useEffect(() => {
  //   setMessages(data || []);
  // }, [data]);

  useEffect(() => {
    window.setShowImgId = setShowImgId;
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 对话历史区域 */}
      <div
        ref={chatContainer}
        className={`flex-1 p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent ${
          messages.length !== 0 ? "overflow-y-auto" : "overflow-y-hidden"
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <RobotOutlined className="text-5xl mb-3" />
              <p>开始一个新对话吧</p>
            </div>
          </div>
        ) : <History messages={messages} onRelatedClick={onRelatedClick} />}

        {/* {loading && (
          <div className="flex justify-start">
            <div className="max-w-3xl rounded-lg p-4 bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <Avatar icon={<RobotOutlined />} className="bg-green-500" />
                <span className="ml-2">AI 助手正在思考</span>
                <Spin className="ml-2" size="small" />
              </div>
            </div>
          </div>
        )} */}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <Spin spinning={loading} tip="正在回答中...">
        <div className="mb-6 mt-4 bg-gray-200 p-4 rounded-4xl shadow-sm">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress} // React 18中使用onKeyDown替代onKeyPress
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            className="!appearance-none !border-none !outline-none focus:!ring-0 !p-0 !bg-inherit resize-none text-base"
          />
          <div className="flex justify-between items-center mt-3">
            <Switch className="!mr-4" checkedChildren="连续对话" unCheckedChildren="单轮对话" value={连续对话} onChange={b => 设置连续对话(b)} />
            <TimeRangeSelector value={时间区间} onChange={(range, date_range) => {
              设置时间区间([range, date_range])
            }} />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="ml-auto bg-blue-500 hover:bg-blue-600 transition-colors"
              size="middle"
            >
              发送
            </Button>
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default ChatComponent;
