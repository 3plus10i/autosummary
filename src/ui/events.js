(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function initializeEvents(elements) {
        const { container, button, settingsQuickBtn, summaryPanel, dragHandle, settingsPanel, settingsOverlay, shadow, historyModal, historyOverlay, aboutModal, aboutOverlay } = elements;
        const CONFIG = ctx.CONFIG;
        const getAllConfigs = ctx.getAllConfigs;
        const saveConfigAs = ctx.saveConfigAs;
        const deleteConfig = ctx.deleteConfig;
        const renameConfig = ctx.renameConfig;
        const updateCurrentConfig = ctx.updateCurrentConfig;
        const applyConfig = ctx.applyConfig;
        const updateConfigSelectors = ctx.updateConfigSelectors;
        const getPageContent = ctx.getPageContent;
        const showError = ctx.showError;
        const summarizeContent = ctx.summarizeContent;
        const initializeDrag = ctx.initializeDrag;
        const addHistory = ctx.addHistory;
        const refreshHistoryList = ctx.refreshHistoryList;
        const estimateTokens = ctx.estimateTokens;

        // 初始化拖拽
        initializeDrag(container, dragHandle, shadow);

        // === 总结面板边缘缩放 ===
        initEdgeResize(summaryPanel);

        // === 总结按钮点击 ===
        button.addEventListener('click', async () => {
            // if (!CONFIG.API_KEY || !CONFIG.API_URL) {
            //     alert('请先配置API URL和API Key。');
            //     settingsPanel.style.display = 'block';
            //     settingsOverlay.style.display = 'block';
            //     return;
            // }
            openSummaryPanel(summaryPanel);
            startLoading(summaryPanel);
            const contentContainer = summaryPanel.querySelector('.ai-summary-content');
            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }
                await summarizeContent(content, shadow, contentContainer);
                // 估算token用量
                var inputTokens = estimateTokens(content) + estimateTokens(CONFIG.PROMPT);
                var outputTokens = estimateTokens(ctx.originalMarkdownText);
                finishLoading(summaryPanel, inputTokens, outputTokens);
                // 保存历史
                addHistory(ctx.originalMarkdownText, window.location.href, document.title);
            } catch (error) {
                console.error('Summary Error:', error);
                showError(contentContainer, error.message);
                finishLoading(summaryPanel);
            }
        });

        // === 齿轮按钮点击 ===
        settingsQuickBtn.addEventListener('click', () => {
            refreshSettingsPanelValues(settingsPanel);
            settingsPanel.style.display = 'block';
            settingsOverlay.style.display = 'block';
        });

        // === 关闭总结面板 ===
        summaryPanel.querySelector('.ai-panel-close').addEventListener('click', () => {
            closeSummaryPanel(summaryPanel);
        });

        // === 收起/展开面板 ===
        summaryPanel.querySelector('.ai-panel-collapse').addEventListener('click', () => {
            toggleCollapse(summaryPanel);
        });

        // === 标题栏拖拽 ===
        initPanelDrag(summaryPanel);

        // === 复制按钮 ===
        summaryPanel.querySelector('.ai-copy-btn').addEventListener('click', () => {
            if (!ctx.originalMarkdownText) {
                alert('总结内容尚未生成或已失效。');
                return;
            }
            navigator.clipboard.writeText(ctx.originalMarkdownText).then(() => {
                const copyBtn = summaryPanel.querySelector('.ai-copy-btn');
                const textSpan = copyBtn.querySelector('span');
                const originalText = textSpan.textContent;
                textSpan.textContent = '已复制！';
                textSpan.style.color = '#52c41a';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    textSpan.style.color = '';
                }, 2000);
            }).catch(() => {
                alert('复制失败，请手动复制内容。');
            });
        });

        // === ESC 关闭 ===
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (settingsPanel.style.display === 'block') {
                    settingsPanel.style.display = 'none';
                    settingsOverlay.style.display = 'none';
                }
                if (summaryPanel.classList.contains('visible')) {
                    closeSummaryPanel(summaryPanel);
                }
            }
        });

        // === 重试按钮 ===
        summaryPanel.querySelector('.ai-retry-btn').addEventListener('click', async () => {
            const contentContainer = summaryPanel.querySelector('.ai-summary-content');
            startLoading(summaryPanel);
            contentContainer.innerHTML = '<div class="ai-loading"><div class="ai-loading-spinner"></div><span>正在重新生成总结...</span></div>';
            openSummaryPanel(summaryPanel);
            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }
                await summarizeContent(content, shadow, contentContainer);
                var inputTokens = estimateTokens(content) + estimateTokens(CONFIG.PROMPT);
                var outputTokens = estimateTokens(ctx.originalMarkdownText);
                finishLoading(summaryPanel, inputTokens, outputTokens);
                addHistory(ctx.originalMarkdownText, window.location.href, document.title);
            } catch (error) {
                showError(contentContainer, error.message);
                finishLoading(summaryPanel);
            }
        });

        // === 设置按钮（总结面板内）===
        summaryPanel.querySelector('.ai-settings-btn').addEventListener('click', () => {
            refreshSettingsPanelValues(settingsPanel);
            settingsPanel.style.display = 'block';
            settingsOverlay.style.display = 'block';
        });

        // === 设置面板事件 ===
        settingsPanel.querySelector('.cancel-btn').addEventListener('click', () => {
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });
        settingsPanel.querySelector('.hide-btn').addEventListener('click', () => {
            container.style.display = 'none';
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });
        settingsOverlay.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });

        // === 配置选择与自动保存 ===
        const configSelect = settingsPanel.querySelector('#config-select');
        const promptTemplateSelect = settingsPanel.querySelector('#prompt-template-select');
        const promptTextarea = settingsPanel.querySelector('#prompt');

        // 自动保存（去抖 500ms）
        var autoSaveTimer = null;
        var _savingConfigName = null;

        function scheduleAutoSave() {
            clearTimeout(autoSaveTimer);
            _savingConfigName = configSelect.value;
            autoSaveTimer = setTimeout(function() {
                if (configSelect.value !== _savingConfigName) return;
                if (!_savingConfigName || _savingConfigName === '__new__') return;
                var apiKeyInput = settingsPanel.querySelector('#api-key');
                var changes = {
                    API_URL: settingsPanel.querySelector('#api-url').value.trim(),
                    API_KEY: apiKeyInput.dataset.realValue || '',
                    MAX_TOKENS: parseInt(settingsPanel.querySelector('#max-tokens').value) || 5000,
                    PROMPT: promptTextarea.value.trim() || ctx.DEFAULT_CONFIG.PROMPT,
                    MODEL: settingsPanel.querySelector('#model').value.trim() || ctx.DEFAULT_CONFIG.MODEL
                };
                updateCurrentConfig(changes);
            }, 500);
        }

        ['#api-url', '#model', '#max-tokens'].forEach(function(sel) {
            settingsPanel.querySelector(sel).addEventListener('input', scheduleAutoSave);
        });
        promptTextarea.addEventListener('input', scheduleAutoSave);

        // API Key 输入框：焦点/失焦处理
        var apiKeyInput = settingsPanel.querySelector('#api-key');
        apiKeyInput.addEventListener('focus', function() {
            if (apiKeyInput.dataset.realValue) {
                apiKeyInput.dataset.wasSet = '1';
                apiKeyInput.value = '';
                apiKeyInput.dataset.realValue = '';
            }
        });
        apiKeyInput.addEventListener('blur', function() {
            var newVal = apiKeyInput.value.trim();
            if (newVal) {
                apiKeyInput.dataset.realValue = newVal;
                apiKeyInput.value = '●'.repeat(16);
                scheduleAutoSave();
            } else if (apiKeyInput.dataset.wasSet === '1') {
                // 原有 key，用户清空后失焦 → 保留旧 key（data-real-value 已在 focus 时暂存到外层闭包）
                // 此时 realValue 为空，需要从 CONFIG 恢复
                apiKeyInput.dataset.realValue = ctx.CONFIG.API_KEY || '';
                apiKeyInput.value = apiKeyInput.dataset.realValue ? '●'.repeat(16) : '';
            }
            delete apiKeyInput.dataset.wasSet;
        });

        // 配置选择下拉
        configSelect.addEventListener('change', function(e) {
            var val = e.target.value;
            if (val === '__new__') {
                var allConfigs = getAllConfigs();
                var idx = 1;
                while (allConfigs['新配置' + idx]) idx++;
                var newName = '新配置' + idx;
                saveConfigAs(newName, { ...ctx.DEFAULT_CONFIG });
                applyConfig(newName);
                updateConfigSelectors(settingsPanel, summaryPanel);
                configSelect.value = newName;
                populateFormFromConfig(settingsPanel, ctx.CONFIG);
                settingsPanel.querySelector('.delete-config-btn').style.display = 'inline-block';
                settingsPanel.querySelector('.rename-config-btn').style.display = 'inline-block';
                return;
            }
            var hasSelection = val !== '';
            if (hasSelection && applyConfig(val)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
                populateFormFromConfig(settingsPanel, ctx.CONFIG);
            }
            settingsPanel.querySelector('.delete-config-btn').style.display = hasSelection ? 'inline-block' : 'none';
            settingsPanel.querySelector('.rename-config-btn').style.display = hasSelection ? 'inline-block' : 'none';
        });

        // 提示词模板选择（触发自动保存）
        promptTemplateSelect.addEventListener('change', function(e) {
            var selected = ctx.PROMPT_TEMPLATES.find(function(t) { return t.title === e.target.value; });
            if (selected) {
                promptTextarea.value = selected.content;
                scheduleAutoSave();
            }
        });

        // 删除配置（最后一个被删时 storage 层自动创建默认配置）
        settingsPanel.querySelector('.delete-config-btn').addEventListener('click', function() {
            var configName = configSelect.value;
            if (!configName) { alert('请先选择要删除的配置'); return; }
            if (confirm('确定要删除配置"' + configName + '"吗？')) {
                deleteConfig(configName);
                updateConfigSelectors(settingsPanel, summaryPanel);
                refreshSettingsPanelValues(settingsPanel);
            }
        });

        // 重命名配置
        settingsPanel.querySelector('.rename-config-btn').addEventListener('click', function() {
            var name = configSelect.value;
            if (!name) { alert('请先选择要重命名的配置'); return; }
            var renameGroup = settingsPanel.querySelector('.rename-group');
            var renameInput = settingsPanel.querySelector('#rename-config');
            renameInput.value = name;
            renameGroup.style.display = 'block';
            renameInput.focus();
            renameInput.select();
        });
        settingsPanel.querySelector('.confirm-rename-btn').addEventListener('click', function() {
            var oldName = configSelect.value;
            var newName = settingsPanel.querySelector('#rename-config').value.trim();
            if (!oldName) return;
            if (!newName) { alert('请输入新配置名称'); return; }
            if (oldName === newName) return;
            if (getAllConfigs()[newName] && !confirm('配置名"' + newName + '"已存在，是否覆盖？')) return;
            if (renameConfig(oldName, newName)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
                settingsPanel.querySelector('.rename-group').style.display = 'none';
                settingsPanel.querySelector('#rename-config').value = '';
                refreshSettingsPanelValues(settingsPanel);
            }
        });
        settingsPanel.querySelector('.cancel-rename-btn').addEventListener('click', function() {
            settingsPanel.querySelector('.rename-group').style.display = 'none';
            settingsPanel.querySelector('#rename-config').value = '';
        });

        // 总结面板配置切换：仅应用配置，不自动触发总结
        summaryPanel.querySelector('.ai-config-select').addEventListener('change', function(e) {
            var configName = e.target.value;
            if (configName && applyConfig(configName)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
            }
        });

        // 初始化下拉框
        updateConfigSelectors(settingsPanel, summaryPanel);

        // === 关于按钮 ===
        settingsPanel.querySelector('.about-btn').addEventListener('click', () => {
            ctx.showAboutModal(aboutModal, aboutOverlay);
        });

        // === 关于弹窗关闭 ===
        aboutOverlay.addEventListener('click', () => {
            aboutModal.style.display = 'none';
            aboutOverlay.style.display = 'none';
        });
        aboutModal.querySelector('.ai-about-close').addEventListener('click', () => {
            aboutModal.style.display = 'none';
            aboutOverlay.style.display = 'none';
        });

        // === 历史总结按钮（设置面板） ===
        settingsPanel.querySelector('.history-btn').addEventListener('click', () => {
            openHistoryModal(historyModal, historyOverlay);
        });

        // === 历史总结按钮（总结面板底部） ===
        summaryPanel.querySelector('.ai-history-summary-btn').addEventListener('click', () => {
            openHistoryModal(historyModal, historyOverlay);
        });

        // === 历史模态框 ===
        historyOverlay.addEventListener('click', () => {
            historyModal.style.display = 'none';
            historyOverlay.style.display = 'none';
        });
        historyModal.querySelector('.ai-history-close').addEventListener('click', () => {
            historyModal.style.display = 'none';
            historyOverlay.style.display = 'none';
        });

        // 列表项点击（选中、打开链接、删除）
        historyModal.querySelector('.ai-history-list').addEventListener('click', (e) => {
            const item = e.target.closest('.ai-history-item');
            if (!item) return;

            // 删除按钮
            const delBtn = e.target.closest('.ai-history-delete-btn');
            if (delBtn) {
                e.stopPropagation();
                ctx.deleteHistory(delBtn.dataset.id);
                ctx.refreshHistoryList(historyModal);
                return;
            }

            // 打开按钮 → 新标签页打开
            const openBtn = e.target.closest('.ai-history-open-btn');
            if (openBtn) {
                e.stopPropagation();
                const history = ctx.getHistory();
                const entry = history.find(h => h.id === item.dataset.id);
                if (entry && entry.url) {
                    window.open(entry.url, '_blank');
                }
                return;
            }

            // 默认：选中并显示内容
            historyModal.querySelectorAll('.ai-history-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            const id = item.dataset.id;
            const history = ctx.getHistory();
            const entry = history.find(h => h.id === id);
            ctx.showHistoryContent(historyModal, entry);
        });
    }

    function openHistoryModal(modal, overlay) {
        modal.style.display = 'flex';
        overlay.style.display = 'block';
        ctx.refreshHistoryList(modal);
    }

    function openSummaryPanel(panel) {
        panel.style.display = 'flex';
        panel.classList.add('visible');
        panel.classList.remove('collapsed');
        // 切换到收起图标
        const collapseBtn = panel.querySelector('.ai-panel-collapse');
        if (collapseBtn) {
            collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
            collapseBtn.title = '收起面板';
        }
    }

    function closeSummaryPanel(panel) {
        panel.style.display = 'none';
        panel.classList.remove('visible', 'loading', 'has-content', 'collapsed');
    }

    function toggleCollapse(panel) {
        if (panel.classList.contains('collapsed')) {
            // 展开
            panel.classList.remove('collapsed');
            const collapseBtn = panel.querySelector('.ai-panel-collapse');
            collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
            collapseBtn.title = '收起面板';
            // 展开后更新位置以防止溢出
            clampPanelPosition(panel);
        } else {
            // 收起
            panel.classList.add('collapsed');
            const collapseBtn = panel.querySelector('.ai-panel-collapse');
            collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            collapseBtn.title = '展开面板';
        }
    }

    function clampPanelPosition(panel) {
        const rect = panel.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        const currentLeft = parseInt(panel.style.left) || rect.left;
        const currentTop = parseInt(panel.style.top) || rect.top;
        if (currentLeft < 0) panel.style.left = '0px';
        if (currentLeft > maxX) panel.style.left = maxX + 'px';
        if (currentTop < 0) panel.style.top = '0px';
        if (currentTop > maxY) panel.style.top = maxY + 'px';
    }

    function initPanelDrag(panel) {
        const header = panel.querySelector('.ai-panel-header');
        let isDragging = false, startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            // 不拦截按钮点击
            if (e.target.closest('button')) return;
            isDragging = true;
            header.classList.add('dragging');
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            // 将 transform 转为 left/top
            panel.style.transform = 'none';
            panel.style.left = startLeft + 'px';
            panel.style.top = startTop + 'px';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;
            const panelWidth = panel.offsetWidth;
            const panelHeight = panel.offsetHeight;
            const maxX = window.innerWidth - panelWidth;
            const maxY = window.innerHeight - panelHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            header.classList.remove('dragging');
            document.body.style.userSelect = '';
        });
    }

    function initEdgeResize(panel) {
        const leftHandle = panel.querySelector('.ai-panel-resize-left');
        const rightHandle = panel.querySelector('.ai-panel-resize-right');
        let isResizing = false, edge, startX, startWidth, startLeft;

        function onMouseDown(e, whichEdge) {
            isResizing = true;
            edge = whichEdge;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            startLeft = panel.getBoundingClientRect().left;
            panel.style.transform = 'none';
            panel.style.left = startLeft + 'px';
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
            e.preventDefault();
            e.stopPropagation();
        }

        leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
        rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            let newWidth;
            if (edge === 'right') {
                newWidth = startWidth + dx;
            } else {
                newWidth = startWidth - dx;
            }
            newWidth = Math.max(280, Math.min(newWidth, window.innerWidth * 0.6));
            panel.style.width = newWidth + 'px';
            if (edge === 'left') {
                const newLeft = startLeft + (startWidth - newWidth);
                panel.style.left = Math.max(0, newLeft) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        });
    }

    function startLoading(panel) {
        panel.classList.add('loading');
        panel.classList.remove('has-content');
        const title = panel.querySelector('.ai-panel-title');
        if (title) title.textContent = '正在总结网页...';
    }

    function formatTokenCount(n) {
        if (n >= 1000) {
            var k = n / 1000;
            return k >= 100 ? k.toFixed(0) + 'k' : k.toFixed(1) + 'k';
        }
        return String(n);
    }

    function finishLoading(panel, inputTokens, outputTokens) {
        panel.classList.remove('loading');
        panel.classList.add('has-content');
        const title = panel.querySelector('.ai-panel-title');
        if (title) {
            if (inputTokens != null) {
                var inp = formatTokenCount(inputTokens);
                var out = formatTokenCount(outputTokens);
                title.innerHTML = '网页总结 <span class="ai-token-info">\u2191 ' + inp + ' tokens &nbsp; \u2193 ' + out + ' tokens</span>';
            } else {
                title.textContent = '网页总结';
            }
        }
    }

    function populateFormFromConfig(panel, config) {
        panel.querySelector('#api-url').value = config.API_URL;
        var keyInput = panel.querySelector('#api-key');
        keyInput.value = config.API_KEY ? '●'.repeat(16) : '';
        keyInput.dataset.realValue = config.API_KEY || '';
        panel.querySelector('#max-tokens').value = config.MAX_TOKENS;
        panel.querySelector('#prompt').value = config.PROMPT;
        panel.querySelector('#model').value = config.MODEL;
    }

    function refreshSettingsPanelValues(panel) {
        populateFormFromConfig(panel, ctx.CONFIG);
    }

    ctx.initializeEvents = initializeEvents;
})();
