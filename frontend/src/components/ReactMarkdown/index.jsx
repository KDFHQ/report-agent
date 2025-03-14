import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";

const MarkdownRenderer = ({ children }) => {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={atomDark}
              language={match[1]}
              PreTag="div"
              wrapLines={true}
              showLineNumbers={true}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code
              className={`${className} px-1 py-0.5 rounded bg-gray-100 text-gray-800`}
              {...props}
            >
              {children}
            </code>
          );
        },
        span(props) {
          const onclick = props.onClick;
          return <span {...props} onClick={() => eval(onclick)} />;
        },
        img(props) {
          return (
            <img
              onClick={() => eval(props.onClick)}
              src={props["data-src"]}
            />
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
