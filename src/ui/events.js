(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function initializeEvents(elements) {
        const { container, button, settingsQuickBtn, summaryPanel, dragHandle, settingsPanel, settingsOverlay, shadow, historyModal, historyOverlay } = elements;
        const CONFIG = ctx.CONFIG;
        const saveConfig = ctx.saveConfig;
        const getAllConfigs = ctx.getAllConfigs;
        const saveConfigAs = ctx.saveConfigAs;
        const loadSavedConfig = ctx.loadSavedConfig;
        const deleteConfig = ctx.deleteConfig;
        const renameConfig = ctx.renameConfig;
        const updateConfigSelectors = ctx.updateConfigSelectors;
        const getPageContent = ctx.getPageContent;
        const showError = ctx.showError;
        const summarizeContent = ctx.summarizeContent;
        const initializeDrag = ctx.initializeDrag;
        const addHistory = ctx.addHistory;
        const refreshHistoryList = ctx.refreshHistoryList;

        // 初始化拖拽
        initializeDrag(container, dragHandle, shadow);

        // === 总结面板边缘缩放 ===
        initEdgeResize(summaryPanel);

        // === 总结按钮点击 ===
        button.addEventListener('click', async () => {
            if (!CONFIG.API_KEY || !CONFIG.API_URL) {
                alert('请先配置API URL和API Key。');
                settingsPanel.style.display = 'block';
                settingsOverlay.style.display = 'block';
                return;
            }
            openSummaryPanel(summaryPanel);
            startLoading(summaryPanel);
            const contentContainer = summaryPanel.querySelector('.ai-summary-content');
            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }
                await summarizeContent(content, shadow, contentContainer);
                finishLoading(summaryPanel);
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
                finishLoading(summaryPanel);
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
        settingsOverlay.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });

        // 配置选择
        const configSelect = settingsPanel.querySelector('#config-select');
        configSelect.addEventListener('change', (e) => {
            const selectedConfig = loadSavedConfig(e.target.value);
            const hasSelection = e.target.value !== '';
            if (selectedConfig) {
                settingsPanel.querySelector('#api-url').value = selectedConfig.API_URL;
                settingsPanel.querySelector('#api-key').value = selectedConfig.API_KEY;
                settingsPanel.querySelector('#max-tokens').value = selectedConfig.MAX_TOKENS;
                settingsPanel.querySelector('#prompt').value = selectedConfig.PROMPT;
                settingsPanel.querySelector('#model').value = selectedConfig.MODEL;
            }
            settingsPanel.querySelector('.delete-config-btn').style.display = hasSelection ? 'inline-block' : 'none';
            settingsPanel.querySelector('.rename-config-btn').style.display = hasSelection ? 'inline-block' : 'none';
        });

        // 提示词模版选择
        const promptTemplateSelect = settingsPanel.querySelector('#prompt-template-select');
        const promptTextarea = settingsPanel.querySelector('#prompt');
        promptTemplateSelect.addEventListener('change', (e) => {
            const selected = ctx.PROMPT_TEMPLATES.find(t => t.title === e.target.value);
            if (selected) {
                promptTextarea.value = selected.content;
            }
        });

        // 保存并应用
        settingsPanel.querySelector('.save-btn').addEventListener('click', () => {
            const selectedConfigName = configSelect.value;
            const newConfig = {
                API_URL: settingsPanel.querySelector('#api-url').value.trim(),
                API_KEY: settingsPanel.querySelector('#api-key').value.trim(),
                MAX_TOKENS: parseInt(settingsPanel.querySelector('#max-tokens').value) || 5000,
                PROMPT: promptTextarea.value.trim() || ctx.DEFAULT_CONFIG.PROMPT,
                MODEL: settingsPanel.querySelector('#model').value.trim() || 'gpt-4o-mini'
            };
            saveConfig(newConfig, selectedConfigName);
            updateConfigSelectors(settingsPanel, summaryPanel);
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
            alert('配置已保存并应用' + (selectedConfigName ? '（当前配置：' + selectedConfigName + '）' : ''));
        });

        // 清除缓存
        settingsPanel.querySelector('.clear-cache-btn').addEventListener('click', () => {
            const keys = ['API_URL', 'API_KEY', 'MAX_TOKENS', 'PROMPT', 'MODEL', 'saved_configs', 'CURRENT_CONFIG_NAME', 'containerPosition'];
            keys.forEach(key => GM_setValue(key, undefined));
            const defaultCfg = ctx.DEFAULT_CONFIG;
            ctx.CONFIG = { ...defaultCfg };
            settingsPanel.querySelector('#api-url').value = defaultCfg.API_URL;
            settingsPanel.querySelector('#api-key').value = defaultCfg.API_KEY;
            settingsPanel.querySelector('#max-tokens').value = defaultCfg.MAX_TOKENS;
            promptTextarea.value = defaultCfg.PROMPT;
            settingsPanel.querySelector('#model').value = defaultCfg.MODEL;
            updateConfigSelectors(settingsPanel, summaryPanel);
            alert('已恢复默认设置，请重新配置API信息。');
        });

        // 另存为新配置
        settingsPanel.querySelector('.save-as-btn').addEventListener('click', () => {
            const saveAsGroup = settingsPanel.querySelector('.save-as-group');
            saveAsGroup.style.display = 'block';
            settingsPanel.querySelector('#config-name').focus();
        });
        settingsPanel.querySelector('.cancel-save-as-btn').addEventListener('click', () => {
            settingsPanel.querySelector('.save-as-group').style.display = 'none';
            settingsPanel.querySelector('#config-name').value = '';
        });
        settingsPanel.querySelector('.confirm-save-as-btn').addEventListener('click', () => {
            const configName = settingsPanel.querySelector('#config-name').value.trim();
            saveCurrentConfigAs(configName);
        });
        settingsPanel.querySelector('#config-name').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                saveCurrentConfigAs(e.target.value.trim());
            }
        });

        function saveCurrentConfigAs(configName) {
            if (!configName) return;
            const newConfig = {
                API_URL: settingsPanel.querySelector('#api-url').value.trim(),
                API_KEY: settingsPanel.querySelector('#api-key').value.trim(),
                MAX_TOKENS: parseInt(settingsPanel.querySelector('#max-tokens').value) || 5000,
                PROMPT: promptTextarea.value.trim() || ctx.DEFAULT_CONFIG.PROMPT,
                MODEL: settingsPanel.querySelector('#model').value.trim() || 'gpt-4o-mini'
            };
            if (getAllConfigs()[configName] && !confirm('配置"' + configName + '"已存在，是否覆盖？')) return;
            saveConfigAs(configName, newConfig);
            ctx.CONFIG = { ...newConfig, CURRENT_CONFIG_NAME: configName };
            GM_setValue('CURRENT_CONFIG_NAME', configName);
            updateConfigSelectors(settingsPanel, summaryPanel);
            settingsPanel.querySelector('.save-as-group').style.display = 'none';
            settingsPanel.querySelector('#config-name').value = '';
            alert('配置已保存并设为当前配置');
        }

        // 删除配置
        settingsPanel.querySelector('.delete-config-btn').addEventListener('click', () => {
            const configName = configSelect.value;
            if (!configName) { alert('请先选择要删除的配置'); return; }
            if (confirm('确定要删除配置"' + configName + '"吗？')) {
                deleteConfig(configName, settingsPanel, summaryPanel);
                updateConfigSelectors(settingsPanel, summaryPanel);
            }
        });

        // 重命名
        settingsPanel.querySelector('.rename-config-btn').addEventListener('click', () => {
            const name = configSelect.value;
            if (!name) { alert('请先选择要重命名的配置'); return; }
            const renameGroup = settingsPanel.querySelector('.rename-group');
            const renameInput = settingsPanel.querySelector('#rename-config');
            renameInput.value = name;
            renameGroup.style.display = 'block';
            renameInput.focus();
            renameInput.select();
        });
        settingsPanel.querySelector('.confirm-rename-btn').addEventListener('click', () => {
            const oldName = configSelect.value;
            const newName = settingsPanel.querySelector('#rename-config').value.trim();
            if (!oldName) return;
            if (!newName) { alert('请输入新配置名称'); return; }
            if (oldName === newName) return;
            if (getAllConfigs()[newName] && !confirm('配置名"' + newName + '"已存在，是否覆盖？')) return;
            if (renameConfig(oldName, newName)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
                settingsPanel.querySelector('.rename-group').style.display = 'none';
                settingsPanel.querySelector('#rename-config').value = '';
            }
        });
        settingsPanel.querySelector('.cancel-rename-btn').addEventListener('click', () => {
            settingsPanel.querySelector('.rename-group').style.display = 'none';
            settingsPanel.querySelector('#rename-config').value = '';
        });

        // 总结面板中的配置选择
        summaryPanel.querySelector('.ai-config-select').addEventListener('change', async (e) => {
            const configName = e.target.value;
            if (configName) {
                const selectedConfig = loadSavedConfig(configName);
                if (selectedConfig) {
                    saveConfig({ ...selectedConfig }, configName);
                    summaryPanel.querySelector('.ai-retry-btn').click();
                }
            } else {
                saveConfig(ctx.CONFIG, '');
            }
            updateConfigSelectors(settingsPanel, summaryPanel);
        });

        // 初始化更新选择器
        updateConfigSelectors(settingsPanel, summaryPanel);

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

        // 列表项点击
        historyModal.querySelector('.ai-history-list').addEventListener('click', (e) => {
            const item = e.target.closest('.ai-history-item');
            if (!item) return;
            // 高亮
            historyModal.querySelectorAll('.ai-history-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            // 显示内容
            const id = item.dataset.id;
            const history = ctx.getHistory();
            const entry = history.find(h => h.id === id);
            ctx.showHistoryContent(historyModal, entry);
        });

        // 点击历史项URL → 复制链接
        historyModal.querySelector('.ai-history-list').addEventListener('click', (e) => {
            const urlEl = e.target.closest('.ai-history-item-url');
            const openBtn = e.target.closest('.ai-history-open-btn');
            // 只有打开按钮才跳转
            if (openBtn) {
                const item = openBtn.closest('.ai-history-item');
                if (!item) return;
                const id = item.dataset.id;
                const history = ctx.getHistory();
                const entry = history.find(h => h.id === id);
                if (entry && entry.url) {
                    window.open(entry.url, '_blank');
                }
                e.stopPropagation();
                return;
            }
            // URL点击 → 复制
            if (urlEl) {
                const item = urlEl.closest('.ai-history-item');
                if (!item) return;
                const id = item.dataset.id;
                const history = ctx.getHistory();
                const entry = history.find(h => h.id === id);
                if (entry && entry.url) {
                    navigator.clipboard.writeText(entry.url).then(() => {
                        urlEl.textContent = '已复制！';
                        urlEl.style.color = '#52c41a';
                        setTimeout(() => {
                            urlEl.textContent = entry.url.replace(/</g, '&lt;');
                            urlEl.style.color = '';
                        }, 1500);
                    }).catch(() => {});
                }
                e.stopPropagation();
            }
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

    function finishLoading(panel) {
        panel.classList.remove('loading');
        panel.classList.add('has-content');
        const title = panel.querySelector('.ai-panel-title');
        if (title) title.textContent = '网页总结';
    }

    function refreshSettingsPanelValues(panel) {
        const CONFIG = window.__AI_SUMMARY__.CONFIG;
        panel.querySelector('#api-url').value = CONFIG.API_URL;
        panel.querySelector('#api-key').value = CONFIG.API_KEY;
        panel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
        panel.querySelector('#prompt').value = CONFIG.PROMPT;
        panel.querySelector('#model').value = CONFIG.MODEL;
    }

    ctx.initializeEvents = initializeEvents;
})();
