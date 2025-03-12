import { useState } from 'react';
import { Button, Empty, List, Spin, message, Popconfirm } from 'antd';
import { MessageOutlined, DeleteOutlined } from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useRequest } from 'ahooks';
import user from '@/worker/user';
import api from '@/worker/api';

export default function History({
  className,
  sessions,
  setSessions,
  selectSessionId,
  onItemClick,
  onDelete,
  onCreate,
}) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  // 获取对话列表数据
  const { loading, run } = useRequest(
    () => {
      return user
        .get(api.chat_sessions, {
          params: {
            page,
            page_size: pageSize,
          },
        })
        .then((res) => res.data);
    },
    {
      manual: false,
      onSuccess: (result) => {
        if (page === 1) {
          setSessions(() => {
            const ma = new Map();
            result.sessions.forEach((item) => {
              ma.set(item.session_id, item);
            });
            return ma;
          });
        } else {
          setSessions((prev) => {
            const ma = new Map([...prev]);
            result.sessions.forEach((item) => {
              ma.set(item.session_id, item);
            });
            return ma;
          });
        }
        setHasMore(result.sessions.length === pageSize);
      },
      onError: (error) => {
        message.error("加载对话历史失败");
        console.error("加载对话历史失败:", error);
      },
      refreshDeps: [page],
    }
  );

  // 加载更多数据
  const loadMoreData = () => {
    if (!loading && hasMore) {
      setPage(page + 1);
    }
  };

  return (
    <div className={`${className}`}>
      <Button
        autoInsertSpace
        color="primary"
        variant="solid"
        className="m-4 transition-opacity"
        onClick={onCreate}
      >
        新建对话
      </Button>

      {sessions.size === 0 && !loading ? (
        <Empty description="暂无对话历史" />
      ) : (
        <div id="scrollableDiv" className="flex-1 overflow-auto">
          <InfiniteScroll
            dataLength={sessions.size}
            next={loadMoreData}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            }
            endMessage={
              <div className="text-center text-gray-400 py-4 text-sm">
                没有更多数据了
              </div>
            }
            scrollableTarget="scrollableDiv"
          >
            <List
              dataSource={[...sessions].map((item) => item[1])}
              renderItem={(item) => (
                <List.Item
                  className={`group !px-3 py-2 w-full border-b ${
                    selectSessionId == item.session_id ? "!bg-gray-200" : ""
                  } hover:bg-gray-50 transition-colors cursor-pointer `}
                  onClick={e => {
                    e.stopPropagation()
                    onItemClick(item.session_id)
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center w-[calc(100%-25px)]">
                      <MessageOutlined className="text-gray-400 mr-3" />
                      <div className="truncate">
                        {item.title || "无标题对话"}
                      </div>
                    </div>

                    <Popconfirm
                      title="确定要删除这个对话吗?"
                      onConfirm={async () => await onDelete(item.session_id)}
                      okText="确定"
                      cancelText="取消"
                      onPopupClick={e => e.stopPropagation()}
                    >
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        danger
                        size="small"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="删除对话"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                </List.Item>
              )}
            />
          </InfiniteScroll>
        </div>
      )}
    </div>
  );
}
