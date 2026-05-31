# AI网页内容总结

在网页右下角添加一个常驻“总结网页”按钮，一键调用 AI 对当前页面进行智能总结。

## 功能

- 常驻右下角浮动按钮，一键总结网页内容
- 可折叠浮窗显示总结结果，等AI响应时不中断浏览
- 多种预设提示词模板，不同的总结语言风格
- 多配置切换、保存、重命名
- 保留最近 10 条历史总结记录，支持跳转原页面
- 推荐使用 DeepSeek V4 Flash 或同等级模型平衡成本与质量

项目地址：[https://github.com/deepseek/ai-summary](https://github.com/deepseek/ai-summary)

当前版本 v2.0

## 快速开始

### 1. 构建

作为浏览器脚本，本程序本质上是一个js注入。为了开发方便，各功能被拆分到不同的项目目录和文件中，构建则反过来将所有代码合并到一个js文件产物中，从而适配脚本安装。

```bash
node build.js
```

产物在 `dist/ai-summary.user.js`。

### 2. 安装

将 `dist/ai-summary.user.js` 拖入类似 Tampermonkey 的浏览器插件管理器中安装。

### 3. 配置

首次使用需在设置中填写 API 信息：
- **API URL**：例如 `https://api.deepseek.com`
- **API Key**：你的 API 密钥
- **模型**：例如 `deepseek-v4-flash`
- **最大 Token 数**：默认 5000
- **提示词**：可选用预设模板

## 项目结构

```
AutoSummary/
├── build.js                 # 构建脚本
├── dev/
│   └── clean_unicode.js     # 汉字斜杠污染清理脚本
├── ref/
│   └── origin.js            # 原始单文件脚本（备份）
├── public/
│   └── as.png               # 图标资源
├── src/
│   ├── frontmatter.js       # 油猴元数据头
│   ├── main.js              # 入口初始化
│   ├── api/
│   │   └── summarize.js     # API 调用逻辑
│   ├── config/
│   │   ├── defaults.js      # 默认配置
│   │   ├── storage.js       # 配置存取（GM_setValue/saved_configs）
│   │   └── templates.js     # 提示词模板
│   ├── utils/
│   │   ├── content.js       # 页面内容提取
│   │   ├── drag.js          # 按钮拖拽停靠
│   │   ├── history.js       # 历史记录存储
│   │   ├── markdown.js      # Markdown 渲染 + 打字机效果
│   │   ├── shortcut.js      # 快捷键工具
│   │   └── token.js         # Token 估算工具
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

## License

Apache-2.0

## 原作
本项目基于原作 [AI网页内容总结(增强版)](https://greasyfork.org/zh-CN/scripts/515734-ai%E7%BD%91%E9%A1%B5%E5%86%85%E5%AE%B9%E6%80%BB%E7%BB%93-%E5%A2%9E%E5%BC%BA%E7%89%88) 进行二次开发。原项目没有提供开源仓库，源码在 GreasyFork ，最后更新于 2024年11月14日。源码文件备份在本项目的`ref\origin.js`。