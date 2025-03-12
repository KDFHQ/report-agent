import React, { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Spin, Alert } from "antd";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// 配置 PDF.js worker
// 需要安装 pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const PDFViewer = ({ pdfUrl, onError }) => {
  const area = useRef(null);
  const [width, setWidth] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    setError("PDF 加载失败，请检查文件或网络连接");
    setLoading(false);
    console.error("PDF 加载错误:", error);
    onError && onError(error);
  };

  useEffect(() => {
    if (!area.current) return;

    // 初始化宽度
    const updateWidth = () => {
      const rect = area.current?.getBoundingClientRect();
      if (rect) {
        setWidth(rect.width);
      }
    };

    updateWidth();

    // 创建 ResizeObserver 实例来监听尺寸变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === area.current) {
          updateWidth();
        }
      }
    });

    // 开始监听 area 元素的尺寸变化
    resizeObserver.observe(area.current);

    // 清理函数
    return () => {
      if (area.current) {
        resizeObserver.unobserve(area.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={area} className="relative w-full bg-white rounded-lg shadow-md">
      {loading && (
        <div className="flex justify-center items-center h-96">
          <Spin tip="PDF 加载中..." size="large" />
        </div>
      )}

      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {width && (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          className="relative flex flex-col items-center w-full"
          // options={{
          //   cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
          //   cMapPacked: true,
          // }}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={width}
              className="relative w-full shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
              renderInteractiveForms={true}
              scale={1}
            />
          ))}
        </Document>
      )}
    </div>
  );
};

export default PDFViewer;
