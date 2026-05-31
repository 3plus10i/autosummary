(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function createElements() {
        const getAllConfigs = ctx.getAllConfigs;
        const createSettingsPanel = ctx.createSettingsPanel;

        // Shadow DOM根容器
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';
        const shadow = rootContainer.attachShadow({ mode: 'open' });

        // === 样式 ===
        const mainStyle = document.createElement('style');
        mainStyle.textContent = `/* CSS_SUMMARY_PLACEHOLDER */`;

        // === 浮动按钮容器（右下角常驻） ===
        const container = document.createElement('div');
        container.className = 'ai-summary-container';
        container.innerHTML = `
            <div class="ai-drag-handle">
                <svg width="12" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                </svg>
            </div>
            <button class="ai-summary-btn" title="总结网页">
                <span>总结网页</span>
            </button>
            <button class="ai-settings-quick-btn" title="打开设置">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
        `;

        // 浮动按钮样式
        const btnStyle = document.createElement('style');
        btnStyle.textContent = `
            .ai-summary-container {
                position: fixed;
                display: flex;
                align-items: center;
                z-index: 99990;
                user-select: none;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                border-radius: 6px;
                background: #ffffff;
                border: 1px solid #f0f0f0;
                overflow: hidden;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .ai-summary-container:hover {
                opacity: 1;
            }
            .ai-drag-handle {
                width: 16px;
                height: 28px;
                background: #fafafa;
                cursor: move;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333333;
                font-size: 12px;
                border-right: 1px solid #f0f0f0;
                transition: color 0.2s;
            }
            .ai-drag-handle:hover {
                color: #1677ff;
            }
            .ai-summary-btn {
                padding: 4px 10px;
                background: #ffffff;
                color: #1677ff;
                border: none;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s;
                height: 28px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
                white-space: nowrap;
            }
            .ai-summary-btn:hover {
                background: #e6f4ff;
                color: #0958d9;
            }
            .ai-summary-btn:active {
                background: #bae0ff;
            }
            .ai-settings-quick-btn {
                padding: 4px 8px;
                background: #ffffff;
                color: #8c8c8c;
                border: none;
                border-left: 1px solid #f0f0f0;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .ai-settings-quick-btn:hover {
                background: #fafafa;
                color: #1677ff;
            }
            .ai-settings-quick-btn:active {
                background: #f0f0f0;
            }
            .ai-settings-quick-btn svg {
                width: 12px;
                height: 12px;
            }
            /* 拖拽至边缘隐藏 */
            .ai-summary-container.near-edge {
                opacity: 0.45;
                pointer-events: none;
            }
            @media (max-width: 768px) {
                .ai-summary-container {
                    bottom: 10px;
                    right: 10px;
                }
            }
        `;

        // === 右侧浮动总结面板 ===
        const summaryPanel = document.createElement('div');
        summaryPanel.className = 'ai-summary-panel';
        summaryPanel.style.display = 'none';
        summaryPanel.innerHTML = `
            <div class="ai-panel-resize-left"></div>
            <div class="ai-panel-resize-right"></div>
            <div class="ai-panel-header">
                <div class="ai-panel-drag-icon" title="拖动窗口">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                    </svg>
                </div>
                <h3 class="ai-panel-title">网页总结</h3>
                <div class="ai-panel-header-actions">
                    <button class="ai-panel-collapse" title="收起面板">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button class="ai-panel-close" title="关闭面板">&times;</button>
                </div>
            </div>
            <div class="ai-summary-content"></div>
            <div class="ai-panel-footer">
                <span class="ai-config-label">当前配置：</span>
                <select class="ai-config-select">
                    ${Object.keys(getAllConfigs()).map(name =>
                        '<option value="' + name + '">' + name + '</option>'
                    ).join('')}
                </select>
                <button class="ai-settings-btn" title="打开设置">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
                <button class="ai-retry-btn" title="重新总结">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.5 17.6A9 9 0 1 0 2 11"></path>
                    </svg>
                </button>
                <button class="ai-copy-btn" title="复制总结">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>复制</span>
                </button>
                <button class="ai-history-summary-btn" title="查看历史总结">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>历史</span>
                </button>
            </div>
        `;

        // 创建设置面板
        const { panel: settingsPanel, overlay: settingsOverlay, aboutModal, aboutOverlay } = createSettingsPanel(shadow);

        // 组装到Shadow DOM
        shadow.appendChild(mainStyle);
        shadow.appendChild(btnStyle);
        shadow.appendChild(container);
        shadow.appendChild(summaryPanel);

        document.body.appendChild(rootContainer);

        return {
            rootContainer,
            container,
            button: container.querySelector('.ai-summary-btn'),
            settingsQuickBtn: container.querySelector('.ai-settings-quick-btn'),
            summaryPanel,
            dragHandle: container.querySelector('.ai-drag-handle'),
            settingsPanel,
            settingsOverlay,
            aboutModal,
            aboutOverlay,
            shadow
        };
    }

    ctx.createElements = createElements;
})();
