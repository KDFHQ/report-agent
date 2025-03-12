import React, { useState } from 'react';
import { Tabs, List, Tag, Empty } from 'antd';
import { FileTextOutlined, UnorderedListOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

/**
 * 相关/引用组件
 * @param {Object} props
 * @param {Array} props.relatedItems - 相关列表数据
 * @param {string} props.pdfUrl - PDF文件的URL
 * @param {Function} props.onClose - 关闭组件的回调函数
 */
const RelatedReferenceTabs = ({ className, relatedItems = [], actTab = "related", pdfUrl = '', onClick, onClose }) => {
  const [activeTab, setActiveTab] = useState(actTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div className={className}>
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        className="!px-2 pt-2"
        tabBarExtraContent={
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-red-700 cursor-pointer transition-colors"
            aria-label="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        }
      >
        <TabPane 
          tab={
            <span className="flex items-center">
              <UnorderedListOutlined className="mr-1" />
              相关
            </span>
          } 
          key="related"
        >
          {relatedItems.length > 0 ? (
            <List
              className=" pb-4"
              itemLayout="vertical"
              dataSource={relatedItems}
              renderItem={(item) => (
                <List.Item 
                  key={item.ID}
                  className="border-b !px-4 last:border-b-0 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onClick(
                    item.ID,
                    item.sid,
                    0,
                    1,
                    { x: 0, y: 0, w: 0, h: 0 },
                    item.标题)}
                >
                  <div className="flex flex-col">
                    <div className="text-lg font-medium text-blue-600 mb-1">{item.标题}</div>
                    <div className="flex items-center text-gray-500 text-sm mb-2">
                      <span className="mr-3">{item.发布机构}</span>
                      <span className="mr-3">{item.作者}</span>
                      <span>{item.日期}</span>
                    </div>
                    <div className="flex flex-wrap">
                      {item.类型 && item.类型.map((tag) => (
                        <Tag key={tag} className="mr-2 mb-1" color="blue">{tag}</Tag>
                      ))}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无相关内容" className="py-8" />
          )}
        </TabPane>
        <TabPane 
          tab={
            <span className="flex items-center">
              <FileTextOutlined className="mr-1" />
              引用
            </span>
          } 
          key="yinyong"
        >
          {pdfUrl ? (
            <div className="w-full h-[600px] p-4">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="引用PDF"
              />
            </div>
          ) : (
            <Empty description="暂无引用文件" className="py-8" />
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default RelatedReferenceTabs;
