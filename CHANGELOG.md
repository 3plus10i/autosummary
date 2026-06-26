2026年6月26日
### v2.4 更新

- **修复拖拽松手失效** — iframe 嵌套页面(如 HuggingFace Spaces)上拖拽后无法松手，改为 pointer 事件 + `setPointerCapture` 解决
- **拖拽性能优化** — 减少拖拽过程中的强制 reflow，用 `requestAnimationFrame` 批量写 DOM
- **松手隐藏判定优化** — 改为按按钮边缘位置判定（非鼠标光标位置），逻辑更自然