import React, { useState, useEffect } from "react";
import { Select, DatePicker, Dropdown, Space, Button, Divider } from "antd";
import { DownOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const TimeRangeSelector = ({
  onChange,
  value = ["auto", [null, null]]
}) => {
  const [selectedOption, setSelectedOption] = useState(value[0] === "range" ? "custom" : value[0]);
  const [dateRange, setDateRange] = useState(value[0] === "range" ? [value[1][0] ? dayjs(value[1][0]) : null, value[1][1] ? dayjs(value[1][1]) : null] : null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [displayText, setDisplayText] = useState("智能");

  // 格式化日期为 YYYY-MM-DD 格式
  const formatDate = (date) => {
    if (!date) return null;
    return dayjs(date).format("YYYY-MM-DD");
  };

  // 根据选项计算日期范围
  const calculateDateRange = (option) => {
    const today = dayjs();

    switch (option) {
      case "auto":
        setDisplayText("智能");
        return ["auto", [null, null]];
      case "all":
        setDisplayText("全部");
        return ["all", [null, null]];
      case "week":
        setDisplayText("最近一周");
        return [
          "range",
          [formatDate(today.subtract(1, "week")), formatDate(today)],
        ];
      case "month":
        setDisplayText("最近一个月");
        return [
          "range",
          [formatDate(today.subtract(1, "month")), formatDate(today)],
        ];
      case "threeMonths":
        setDisplayText("最近三个月");
        return [
          "range",
          [formatDate(today.subtract(3, "month")), formatDate(today)],
        ];
      case "halfYear":
        setDisplayText("最近半年");
        return [
          "range",
          [formatDate(today.subtract(6, "month")), formatDate(today)],
        ];
      case "year":
        setDisplayText("最近一年");
        return [
          "range",
          [formatDate(today.subtract(1, "year")), formatDate(today)],
        ];
      case "twoYears":
        setDisplayText("最近两年");
        return [
          "range",
          [formatDate(today.subtract(2, "year")), formatDate(today)],
        ];
      case "custom":
        if (dateRange && dateRange[0] && dateRange[1]) {
          const start = formatDate(dateRange[0]);
          const end = formatDate(dateRange[1]);
          setDisplayText(`${start} 至 ${end}`);
          return ["range", [start, end]];
        }
        setDisplayText("自定义");
        return ["range", [null, null]];
      default:
        setDisplayText("智能");
        return ["auto", [null, null]];
    }
  };

  // 处理选项变更
  const handleOptionChange = (option) => {
    setSelectedOption(option);

    if (option !== "custom") {
      const [type, range] = calculateDateRange(option);
      onChange(type, range);
      setDropdownOpen(false);
    }
  };

  // 处理自定义日期范围变更
  const handleRangeChange = (dates) => {
    if (!dates || dates.length === 0) {
      setDateRange(null);
      return;
    }

    setDateRange(dates);
  };

  // 应用自定义日期范围
  const applyCustomRange = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const [type, range] = calculateDateRange("custom");
      onChange(type, range);
      setDropdownOpen(false);
    }
  };

  // 监听外部value变化
  useEffect(() => {
    if (value) {
      const [type, range] = value;
      if (type === "range") {
        setSelectedOption("custom");
        setDateRange([range[0] ? dayjs(range[0]) : null, range[1] ? dayjs(range[1]) : null]);
        if (range[0] && range[1]) {
          setDisplayText(`${range[0]} 至 ${range[1]}`);
        } else {
          setDisplayText("自定义");
        }
      } else {
        setSelectedOption(type);
        const [_, calculatedDisplayText] = calculateDisplayText(type);
        setDisplayText(calculatedDisplayText);
      }
    }
  }, [value]);

  // 计算显示文本
  const calculateDisplayText = (option) => {
    switch (option) {
      case "auto": return ["auto", "智能"];
      case "all": return ["all", "全部"];
      case "week": return ["week", "最近一周"];
      case "month": return ["month", "最近一个月"];
      case "threeMonths": return ["threeMonths", "最近三个月"];
      case "halfYear": return ["halfYear", "最近半年"];
      case "year": return ["year", "最近一年"];
      case "twoYears": return ["twoYears", "最近两年"];
      default: return ["auto", "智能"];
    }
  };

  // 下拉菜单内容渲染函数
  const renderDropdownContent = () => (
    <div
      className="bg-white rounded-md shadow-lg p-4"
      style={{ width: "320px" }}
    >
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          type={selectedOption === "auto" ? "primary" : "default"}
          onClick={() => handleOptionChange("auto")}
          className="text-center"
        >
          智能
        </Button>
        <Button
          type={selectedOption === "all" ? "primary" : "default"}
          onClick={() => handleOptionChange("all")}
          className="text-center"
        >
          全部
        </Button>
        <Button
          type={selectedOption === "week" ? "primary" : "default"}
          onClick={() => handleOptionChange("week")}
          className="text-center"
        >
          最近一周
        </Button>
        <Button
          type={selectedOption === "month" ? "primary" : "default"}
          onClick={() => handleOptionChange("month")}
          className="text-center"
        >
          最近一个月
        </Button>
        <Button
          type={selectedOption === "threeMonths" ? "primary" : "default"}
          onClick={() => handleOptionChange("threeMonths")}
          className="text-center"
        >
          最近三个月
        </Button>
        <Button
          type={selectedOption === "halfYear" ? "primary" : "default"}
          onClick={() => handleOptionChange("halfYear")}
          className="text-center"
        >
          最近半年
        </Button>
        <Button
          type={selectedOption === "year" ? "primary" : "default"}
          onClick={() => handleOptionChange("year")}
          className="text-center"
        >
          最近一年
        </Button>
        <Button
          type={selectedOption === "twoYears" ? "primary" : "default"}
          onClick={() => handleOptionChange("twoYears")}
          className="text-center"
        >
          最近两年
        </Button>
      </div>

      <Divider className="my-3" />

      <div className="custom-range flex items-center justify-between">
        {selectedOption !== "custom" && (
          <div className="font-medium mr-2">
            <Button
              type={selectedOption === "custom" ? "primary" : "default"}
              onClick={() => onChange("custom", dateRange ? [dateRange[0], dateRange[1]] : [null, null])}
              className="mb-2"
            >
              自定义
            </Button>
          </div>
        )}
        {selectedOption === "custom" && (
          <div className="">
            <RangePicker
              value={dateRange}
              onChange={handleRangeChange}
              style={{ width: "100%" }}
              presets={[
                {
                  label: "最近一周",
                  value: [dayjs().subtract(1, "week"), dayjs()],
                },
                {
                  label: "最近一个月",
                  value: [dayjs().subtract(1, "month"), dayjs()],
                },
                {
                  label: "最近三个月",
                  value: [dayjs().subtract(3, "month"), dayjs()],
                },
                {
                  label: "最近半年",
                  value: [dayjs().subtract(6, "month"), dayjs()],
                },
                {
                  label: "最近一年",
                  value: [dayjs().subtract(1, "year"), dayjs()],
                },
              ]}
            />
          </div>
        )}
        {selectedOption === "custom" && (
          <div className="ml-2">
            <Button type="primary" onClick={applyCustomRange}>
              应用
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      dropdownRender={renderDropdownContent}
      trigger={["click"]}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
    >
      <Button
        title="时间范围"
        size="small"
        className="flex justify-between items-center !rounded-full"
      >
        <Space>
          <CalendarOutlined />
          <span className="truncate">{displayText}</span>
        </Space>
        <DownOutlined />
      </Button>
    </Dropdown>
  );
};

export default TimeRangeSelector;
