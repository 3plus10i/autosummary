(function() {
    'use strict';

    // 要求不在 iframe 内运行，避免在 iframe 中也显示按钮
    if (window.self !== window.top) return;

    const ctx = window.__AI_SUMMARY__;

    // 1. 加载配置
    ctx.loadConfig();

    // 2. 创建元素
    const elements = ctx.createElements();

    // 3. 创建历史面板
    const historyEls = ctx.createHistoryPanel(elements.shadow);
    elements.historyModal = historyEls.modal;
    elements.historyOverlay = historyEls.overlay;

    // 4. 初始化事件
    ctx.initializeEvents(elements);
})();
