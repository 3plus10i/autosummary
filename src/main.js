(function() {
    'use strict';

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

    // 5. 检查配置是否完整 - 不再弹出自动设置面板，
    //    而是让用户点总结按钮时提示配置
})();
