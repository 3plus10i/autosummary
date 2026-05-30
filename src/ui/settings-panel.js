(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function createSettingsPanel(shadow) {
        const CONFIG = ctx.CONFIG;
        const PROMPT_TEMPLATES = ctx.PROMPT_TEMPLATES;
        const getAllConfigs = ctx.getAllConfigs;

        const panel = document.createElement('div');
        panel.className = 'ai-settings-panel';
        panel.innerHTML = `
            <h3>⚙ 设置</h3>
            <div class="form-group inline">
                <label for="api-url">API URL</label>
                <input type="text" id="api-url" value="${CONFIG.API_URL}" placeholder="例如: https://api.openai.com/v1">
            </div>
            <div class="form-group inline">
                <label for="api-key">API Key</label>
                <input type="text" id="api-key" class="ai-password-mask" value="${CONFIG.API_KEY}" placeholder="请输入你的API Key">
            </div>
            <div class="form-group inline">
                <label for="model">模型</label>
                <input type="text" id="model" value="${CONFIG.MODEL}" placeholder="例如: gpt-4o-mini">
            </div>
            <div class="form-group inline">
                <label for="max-tokens">最大Token数</label>
                <input type="number" id="max-tokens" value="${CONFIG.MAX_TOKENS}" min="100" max="128000">
            </div>
            <div class="form-group inline">
                <label for="prompt-template-select">预设提示词</label>
                <select class="ai-prompt-template-select" id="prompt-template-select">
                    <option value="">--选择预设提示词--</option>
                    ${PROMPT_TEMPLATES.map(t =>
                        '<option value="' + t.title + '">' + t.title + '</option>'
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="prompt">总结提示词</label>
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
                </select>
            </div>
            <div class="form-group save-as-group" style="display: none;">
                <label for="config-name">配置名称</label>
                <div class="save-as-input-group">
                    <input type="text" id="config-name" placeholder="输入配置名称">
                    <button class="confirm-save-as-btn">保存配置</button>
                    <button class="cancel-save-as-btn">取消</button>
                </div>
            </div>
            <div class="form-group rename-group" style="display: none;">
                <label for="rename-config">重命名配置</label>
                <div class="rename-input-group">
                    <input type="text" id="rename-config" placeholder="输入新配置名称">
                    <button class="confirm-rename-btn">确认重命名</button>
                    <button class="cancel-rename-btn">取消</button>
                </div>
            </div>
            <div class="config-ops-section">
                <label class="config-ops-label">配置操作</label>
                <div class="config-ops-buttons">
                    <button class="clear-cache-btn">恢复默认设置</button>
                    <button class="delete-config-btn" style="display: none;">删除配置</button>
                    <button class="save-as-btn">另存为新配置</button>
                    <button class="rename-config-btn" style="display: none;">重命名</button>
                </div>
            </div>
            <div class="form-group action-buttons">
                <button class="history-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>历史总结</span>
                </button>
                <div class="action-buttons-right">
                    <button class="cancel-btn">关闭</button>
                    <button class="save-btn">保存并应用</button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `/* CSS_SETTINGS_PLACEHOLDER */`;
        shadow.appendChild(style);

        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none';

        const overlayStyle = document.createElement('style');
        overlayStyle.textContent = `
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
        `;
        shadow.appendChild(overlayStyle);
        shadow.appendChild(settingsOverlay);
        shadow.appendChild(panel);

        return { panel, overlay: settingsOverlay };
    }

    ctx.createSettingsPanel = createSettingsPanel;
})();
