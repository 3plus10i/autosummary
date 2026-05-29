# AI网页内容总结

油猴脚本（Tampermonkey），在任意网页右下角添加一个常驻按钮，一键调用 AI API 对当前页面进行智能总结。

## 功能

- 一键总结网页内容（支持 OpenAI/DeepSeek 等兼容 API）
- 浮动窗口显示总结结果，不打断浏览
- 多种预设提示词模板
- 流式打字机效果展示
- 多配置切换、保存、重命名
- 历史总结记录（最近 10 条，支持查看和跳转原页面）
- Animated Ant Design 风格 UI
- Shadow DOM 完全样式隔离

## 快速开始

### 1. 构建

```bash
node build.js
```

产物在 `dist/ai-summary.user.js`。

### 2. 安装

将 `dist/ai-summary.user.js` 拖入 Tampermonkey 安装。

### 3. 配置

首次使用需在设置中填写 API 信息：
- **API URL**：例如 `https://api.deepseek.com`
- **API Key**：你的 API 密钥
- **模型**：例如 `deepseek-v4-flash`
- **最大 Token 数**：默认 5000
- **提示词**：可选用预设模板

## 项目结构

```
webabstract/
├── build.js                 # 构建脚本
├── dev/
│   └── clean_unicode.js     # 汉字斜杠污染清理脚本
├── origin.js                # 原始单文件脚本
├── src/
│   ├── frontmatter.js       # 油猴元数据头
│   ├── main.js              # 入口初始化
│   ├── api/
│   │   └── summarize.js     # API 调用逻辑
│   ├── config/
│   │   ├── defaults.js      # 默认配置
│   │   ├── storage.js       # 配置存取（GM_setValue）
│   │   └── templates.js     # 21 种提示词模板
│   ├── utils/
│   │   ├── content.js       # 页面内容提取
│   │   ├── drag.js          # 按钮拖拽停靠
│   │   ├── history.js       # 历史记录存储
│   │   ├── markdown.js      # Markdown 渲染 + 打字机效果
│   │   └── shortcut.js      # 快捷键工具
│   ├── ui/
│   │   ├── events.js        # 全部事件绑定
│   │   ├── history-modal.js # 历史总结模态框
│   │   ├── settings-panel.js# 设置面板
│   │   └── summary-panel.js # 总结面板 + 浮动按钮
│   └── styles/
│       ├── content.css
│       ├── drag.css
│       ├── history.css
│       ├── settings.css
│       └── summary.css
└── dist/
    └── ai-summary.user.js   # 构建产物
```

## 构建系统

`build.js` 读取 `src/` 模块按依赖顺序合并，CSS 文件批量内联注入为 JS 字符串。每个 JS 模块是独立的 IIFE，通过 `window.__AI_SUMMARY__` 共享上下文。

## TODO

- [ ] **预处理页面内容**：当前直接发送 `document.body.innerText` 全量文本，包含大量页面噪音（导航、页脚等）。需要做：
  - 使用 Readability 类算法提取正文区域
  - 文本截断保护（避免超出模型上下文窗口）
  - 保留 HTML 结构语义（标题层级 `h1`-`h6`）
  - 去除重复和无关内容

## License

Apache-2.0
