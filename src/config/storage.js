(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;
    const DEFAULT_CONFIG = ctx.DEFAULT_CONFIG;

    let CONFIG = {};

    function loadConfig() {
        CONFIG = {
            API_URL: GM_getValue('API_URL', DEFAULT_CONFIG.API_URL),
            API_KEY: GM_getValue('API_KEY', DEFAULT_CONFIG.API_KEY),
            MAX_TOKENS: GM_getValue('MAX_TOKENS', DEFAULT_CONFIG.MAX_TOKENS),
            PROMPT: GM_getValue('PROMPT', DEFAULT_CONFIG.PROMPT),
            MODEL: GM_getValue('MODEL', DEFAULT_CONFIG.MODEL),
            CURRENT_CONFIG_NAME: GM_getValue('CURRENT_CONFIG_NAME', DEFAULT_CONFIG.CURRENT_CONFIG_NAME)
        };
        if (CONFIG.CURRENT_CONFIG_NAME) {
            const savedConfig = loadSavedConfig(CONFIG.CURRENT_CONFIG_NAME);
            if (savedConfig) {
                CONFIG = { ...savedConfig, CURRENT_CONFIG_NAME: CONFIG.CURRENT_CONFIG_NAME };
            }
        }
        ctx.CONFIG = CONFIG;
        return CONFIG;
    }

    function saveConfig(newConfig, configName) {
        if (configName === undefined) configName = '';
        Object.keys(newConfig).forEach(key => {
            GM_setValue(key, newConfig[key]);
        });
        if (configName) {
            GM_setValue('CURRENT_CONFIG_NAME', configName);
            const savedConfigs = getAllConfigs();
            savedConfigs[configName] = { ...newConfig };
            GM_setValue('saved_configs', savedConfigs);
        }
        CONFIG = { ...CONFIG, ...newConfig, CURRENT_CONFIG_NAME: configName || CONFIG.CURRENT_CONFIG_NAME };
        ctx.CONFIG = CONFIG;
    }

    function getAllConfigs() {
        return GM_getValue('saved_configs', {});
    }

    function saveConfigAs(name, config) {
        const configs = getAllConfigs();
        configs[name] = config;
        GM_setValue('saved_configs', configs);
    }

    function loadSavedConfig(name) {
        const configs = getAllConfigs();
        return configs[name];
    }

    function deleteConfig(name) {
        const configs = getAllConfigs();
        delete configs[name];
        GM_setValue('saved_configs', configs);
        if (name === CONFIG.CURRENT_CONFIG_NAME) {
            const defaultConfig = { ...DEFAULT_CONFIG, CURRENT_CONFIG_NAME: '' };
            Object.keys(defaultConfig).forEach(key => {
                GM_setValue(key, defaultConfig[key]);
            });
            CONFIG = defaultConfig;
            ctx.CONFIG = defaultConfig;
        }
        GM_setValue('saved_configs', configs);
        return Object.keys(configs).length;
    }

    function renameConfig(oldName, newName) {
        if (oldName === newName) return false;
        const configs = getAllConfigs();
        if (!configs[oldName]) {
            alert('找不到要重命名的配置');
            return false;
        }
        configs[newName] = configs[oldName];
        delete configs[oldName];
        GM_setValue('saved_configs', configs);
        if (CONFIG.CURRENT_CONFIG_NAME === oldName) {
            CONFIG.CURRENT_CONFIG_NAME = newName;
            GM_setValue('CURRENT_CONFIG_NAME', newName);
        }
        return true;
    }

    // 将API端点规范化：如果未以/chat/completions结尾则自动追加
    function normalizeApiUrl(url) {
        if (!url) return url;
        if (!url.endsWith('/chat/completions')) {
            return url.replace(/\/+$/, '') + '/chat/completions';
        }
        return url;
    }

    function updateConfigSelectors(settingsPanel, summaryPanel) {
        const configs = getAllConfigs();
        const configNames = Object.keys(configs);
        const currentConfigName = CONFIG.CURRENT_CONFIG_NAME;

        const updateSelect = (select, includeCurrentConfig) => {
            if (!select) return;
            let options = [];
            if (includeCurrentConfig) {
                options.push(`<option value="" ${!currentConfigName ? 'selected' : ''}>当前配置${!currentConfigName ? '（未保存）' : ''}</option>`);
            } else {
                options.push(`<option value="">--选择配置--</option>`);
            }
            options = options.concat(configNames.map(name =>
                `<option value="${name}" ${name === currentConfigName ? 'selected' : ''}>${name}</option>`
            ));
            select.innerHTML = options.join('');
        };

        if (settingsPanel) {
            const sel = settingsPanel.querySelector('#config-select');
            updateSelect(sel, false);
            const configSelected = sel && sel.value !== '';
            const deleteBtn = settingsPanel.querySelector('.delete-config-btn');
            const renameBtn = settingsPanel.querySelector('.rename-config-btn');
            if (deleteBtn) deleteBtn.style.display = configSelected ? 'inline-block' : 'none';
            if (renameBtn) renameBtn.style.display = configSelected ? 'inline-block' : 'none';
        }
        if (summaryPanel) {
            const sel = summaryPanel.querySelector('.ai-config-select');
            updateSelect(sel, true);
        }
    }

    ctx.loadConfig = loadConfig;
    ctx.saveConfig = saveConfig;
    ctx.getAllConfigs = getAllConfigs;
    ctx.saveConfigAs = saveConfigAs;
    ctx.loadSavedConfig = loadSavedConfig;
    ctx.deleteConfig = deleteConfig;
    ctx.renameConfig = renameConfig;
    ctx.normalizeApiUrl = normalizeApiUrl;
    ctx.updateConfigSelectors = updateConfigSelectors;
})();
