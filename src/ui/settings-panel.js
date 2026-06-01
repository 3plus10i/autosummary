(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    // README 内容（由 build.js 从 README.md 截取"快速开始"之前内容注入）
    var README_CONTENT = "ABOUT_CONTENT_PLACEHOLDER";

    ctx.README_CONTENT = README_CONTENT;

    function createSettingsPanel(shadow) {
        const CONFIG = ctx.CONFIG;
        const PROMPT_TEMPLATES = ctx.PROMPT_TEMPLATES;
        const getAllConfigs = ctx.getAllConfigs;

        const panel = document.createElement('div');
        panel.className = 'ai-settings-panel';
        panel.innerHTML = `
            <h3>⚙ 设置 <span style="font-size:12px;font-weight:400;color:#888">修改实时保存</span></h3>
            <div class="form-group inline">
                <label for="api-url">API URL<span class="ai-info-icon" title="不用写最后的&quot;/chat/completions&quot;，但如果有v1等要保留，例如 &quot;https://api.siliconflow.cn/v1&quot;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </span></label>
                <input type="text" id="api-url" value="${CONFIG.API_URL}" placeholder="例如: https://api.openai.com/v1">
            </div>
            <div class="form-group inline">
                <label for="api-key">API Key</label>
                <input type="text" id="api-key" class="ai-password-mask" value="${CONFIG.API_KEY ? '●'.repeat(16) : ''}" placeholder="请输入你的API Key" data-real-value="${CONFIG.API_KEY}">
            </div>
            <div class="form-group inline">
                <label for="model">模型</label>
                <input type="text" id="model" value="${CONFIG.MODEL}" placeholder="例如: gpt-4o-mini">
            </div>
            <div class="form-group inline">
                <label for="max-tokens">最大Token数</label>
                <input type="number" id="max-tokens" value="${CONFIG.MAX_TOKENS}" min="100" max="128000">
            </div>
            <div class="form-group">
                <div class="prompt-label-row">
                    <label for="prompt">总结提示词</label>
                    <span class="prompt-template-inline">采用预设提示词<span class="ai-info-icon" title="用一个预设提示词覆盖当前提示词。">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </span>
                    <select class="ai-prompt-template-select" id="prompt-template-select">
                        <option value="">--选择--</option>
                        ${PROMPT_TEMPLATES.map(t =>
                            '<option value="' + t.title + '">' + t.title + '</option>'
                        ).join('')}
                    </select>
                    </span>
                </div>
                <textarea id="prompt">${CONFIG.PROMPT}</textarea>
            </div>
            <div class="form-group config-select-group">
                <label for="config-select">配置管理<span class="ai-info-icon" title="配置包括：上方所有内容，即API URL 和 Key，模型名，最大Token数，提示词。">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </span></label>
                <select class="ai-config-select" id="config-select">
                    <option value="">--选择配置--</option>
                    ${Object.keys(getAllConfigs()).map(name =>
                        '<option value="' + name + '">' + name + '</option>'
                    ).join('')}
                    <option value="__new__">+ 新建配置</option>
                </select>
                <button class="delete-config-btn">删除</button>
                <button class="rename-config-btn">重命名</button>
            </div>
            <div class="form-group rename-group">
                <label for="rename-config">重命名配置</label>
                <div class="rename-input-group">
                    <input type="text" id="rename-config" placeholder="输入新配置名称">
                    <button class="confirm-rename-btn">确认重命名</button>
                    <button class="cancel-rename-btn">取消</button>
                </div>
            </div>
            <div class="form-group action-buttons">
                <div class="action-buttons-left">
                    <button class="about-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>关于</span>
                    </button>
                    <button class="history-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>历史总结</span>
                    </button>
                </div>
                <div class="action-buttons-right">
                    <button class="cancel-btn">关闭</button>
                </div>
            </div>
        `;

        var sheet = new CSSStyleSheet();
        sheet.replaceSync(`/* CSS_SETTINGS_PLACEHOLDER */`);
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];

        // 默认隐藏元素（避免 inline style 触发 CSP）
        var sheetReset = new CSSStyleSheet();
        sheetReset.replaceSync(`.delete-config-btn,.rename-config-btn,.rename-group{display:none}`);
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheetReset];

        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none';

        var sheet2 = new CSSStyleSheet();
        sheet2.replaceSync(`
            .ai-settings-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.45);
                z-index: 100000;
            }
        `);
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet2];
        shadow.appendChild(settingsOverlay);
        shadow.appendChild(panel);

        // 关于弹窗
        const aboutOverlay = document.createElement('div');
        aboutOverlay.className = 'ai-about-overlay';
        aboutOverlay.style.display = 'none';
        shadow.appendChild(aboutOverlay);

        const aboutModal = document.createElement('div');
        aboutModal.className = 'ai-about-modal';
        aboutModal.innerHTML = `
            <div class="ai-about-header">
                <h3>关于 AI网页内容总结</h3>
                <button class="ai-about-close">&times;</button>
            </div>
            <div class="ai-about-body"></div>
        `;
        aboutModal.style.display = 'none';
        shadow.appendChild(aboutModal);

        return { panel, overlay: settingsOverlay, aboutOverlay, aboutModal };
    }

    function showAboutModal(aboutModal, aboutOverlay) {
        aboutModal.style.display = 'flex';
        aboutOverlay.style.display = 'block';
        const body = aboutModal.querySelector('.ai-about-body');
        body.innerHTML = ctx.markdownRenderer.render(ctx.README_CONTENT);
    }

    ctx.createSettingsPanel = createSettingsPanel;
    ctx.showAboutModal = showAboutModal;
})();
