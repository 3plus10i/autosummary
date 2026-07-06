## v2.6

- **知乎回答页首级抓取优化** — 第一级抓取强度下，知乎回答页（`https://www.zhihu.com/question/*/answer/*`）自动排除 `.Card.MoreAnswers` 元素，聚焦当前回答；第二、三级抓取强度不受影响
- **文档同步** — 删除 README 项目结构中实际不存在的 `src/utils/shortcut.js` 与 `src/styles/content.css`

## v2.5

- **设置面板新增隐藏按钮** — 点击"隐藏总结按钮"可在当前页面暂时隐藏，刷新或新页面自动恢复
- **松手隐藏边界判定优化** — 由鼠标位置改为按钮边缘位置判定
- **定位基准改为 right/bottom** — 窗口缩放时自然保持与右下角的相对距离，缩小时自动限位，放大时恢复原距离

## v2.4

- **修复拖拽松手失效** — iframe 嵌套页面(如 HuggingFace Spaces)上拖拽后无法松手，改为 pointer 事件 + `setPointerCapture` 解决
- **拖拽性能优化** — 用 `requestAnimationFrame` 批量写 DOM，减少强制 reflow
