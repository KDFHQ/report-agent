import React, { useEffect, useState } from "react";
import { Tabs, List, Button, Tag, Empty, Spin } from "antd";
import {
  FileTextOutlined,
  UnorderedListOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import PdfViewer from "@/components/PdfViewer";
import api from "@/worker/api";
import user from '@/worker/user'

function RenderYinyong({ imageData }) {
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(imageData.page);
  const [文本, 设置文本] = useState("")

  const handlePrevPage = () => {
    setPage((prevPage) => Math.max(0, prevPage - 1));
  };

  const handleNextPage = () => {
    setPage((prevPage) => prevPage + 1);
  };

  function extractPTags(str) {
    // 先处理转义字符
    str = str.replace(/\\"/g, '"');
    
    // 创建临时DOM来解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    const pTags = doc.getElementsByTagName('p');
    return Array.from(pTags).map(p => p.outerHTML).join('');
  }

  const fetchNewsData = async () => {
    setLoading(true)
    设置文本("")
    try {
      const response = await user.get(
        `${api.BASE_URL}/report/page_html/${imageData.index_name}/${imageData.paraId}`
      );
  
      设置文本(extractPTags(response.data))
    } catch (error) {
      console.error("获取文本失败:", error);
    }
    setLoading(false)
  };

  useEffect(() => {
    setPage(imageData.page);
    if (["newyanbao_main", "newyanbao_eng_main"].indexOf(imageData.index_name) == -1) {
      fetchNewsData()
    }
  }, [imageData]);

  if (
    ["newyanbao_main", "newyanbao_eng_main"].indexOf(imageData.index_name) !==
    -1
  ) {
    const pdfUrl = `${api.BASE_URL}/report/pdf/page_pdf/${imageData.query}/${page}/${imageData.index_name}`;

    return (
      <div className="w-full h-full flex flex-col">
        <div className="relative w-full h-full flex-grow">
          <PdfViewer
            key={pdfUrl}
            pdfUrl={pdfUrl}
            className="w-full h-full border-0"
            onError={() => handlePrevPage()}
            title="引用PDF"
          />
          {imageData.pointer && imageData.page == page && (
            <div
              className="absolute bg-yellow-100 opacity-50"
              style={{
                width: `${imageData.pointer.w * 100}%`,
                height: `${imageData.pointer.h * 100}%`,
                left: `${imageData.pointer.x * 100}%`,
                top: `${imageData.pointer.y * 100}%`,
              }}
            />
          )}
        </div>

        <div className="flex justify-center items-center space-x-4 py-3">
          <Button
            type="primary"
            shape="circle"
            icon={<LeftOutlined />}
            onClick={handlePrevPage}
            disabled={page <= 0}
            className="flex justify-center items-center hover:scale-105 transition-transform"
          />
          <span className="text-gray-600">第 {page + 1} 页</span>
          <Button
            type="primary"
            shape="circle"
            icon={<RightOutlined />}
            onClick={handleNextPage}
            className="flex justify-center items-center hover:scale-105 transition-transform"
          />
        </div>
      </div>
    );
  }

  return <Spin spinning={loading} tip="文本加载中..."><div className="break-all whitespace-pre-wrap min-h-40" dangerouslySetInnerHTML={{ __html: 文本 }}></div></Spin>;
}

/**
 * 相关/引用组件
 * @param {Object} props
 * @param {Array} props.relatedItems - 相关列表数据
 * @param {string} props.pdfUrl - PDF文件的URL
 * @param {Function} props.onClose - 关闭组件的回调函数
 */
const RelatedReferenceTabs = ({
  className,
  relatedItems = [],
  actTab = "related",
  onActTabChange,
  imageData,
  onClick,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(actTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  useEffect(() => {
    if (actTab !== activeTab) {
      setActiveTab(actTab);
    }
  }, [actTab]);

  useEffect(() => {
    if (actTab !== activeTab) {
      onActTabChange && onActTabChange(activeTab);
    }
  }, [activeTab])

  // 定义 Tabs 的 items 配置
  const tabItems = [
    {
      key: "related",
      label: (
        <span className="flex items-center">
          <UnorderedListOutlined className="mr-1" />
          相关
        </span>
      ),
      children:
        relatedItems.length > 0 ? (
          <List
            className="pb-4"
            itemLayout="vertical"
            dataSource={relatedItems}
            renderItem={(item, index) => (
              <List.Item
                key={item.ID}
                className="border-b !px-4 last:border-b-0 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onClick(item.ID, item.sid)}
              >
                <div className="flex flex-col">
                  <div className="text-lg font-medium text-blue-600 mb-1">
                    {item.标题}
                  </div>
                  <div className="flex items-center text-gray-500 text-sm mb-2">
                    <span className="mr-3">{item.发布机构}</span>
                    <span className="mr-3">{item.作者}</span>
                    <span>{item.日期}</span>
                  </div>
                  <div className="flex flex-wrap">
                    {item.类型 &&
                      item.类型.map((tag) => (
                        <Tag key={tag} className="mr-2 mb-1" color="blue">
                          {tag}
                        </Tag>
                      ))}
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无相关内容" className="py-8" />
        ),
    },
    {
      key: "yinyong",
      label: (
        <span className="flex items-center">
          <FileTextOutlined className="mr-1" />
          引用
        </span>
      ),
      children: (
        <div className="w-full">
          <RenderYinyong imageData={imageData} />
          {/* <PdfViewer
            key={pdfUrl}
            pdfUrl={pdfUrl}
            className="w-full h-full border-0"
            title="引用PDF"
          /> */}
        </div>
      ),
    },
  ];

  return (
    <div className={className}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="!px-2 pt-2"
        items={tabItems}
        tabBarExtraContent={
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-700 cursor-pointer transition-colors"
            aria-label="关闭"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        }
      />
    </div>
  );
};

export default RelatedReferenceTabs;
