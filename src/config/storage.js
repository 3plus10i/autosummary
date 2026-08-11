(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;
    const DEFAULT_CONFIG = ctx.DEFAULT_CONFIG;

    let CONFIG = {};

    // ===== 单一真相源：saved_configs + CURRENT_CONFIG_NAME =====

    function loadConfig() {
        const configs = GM_getValue('saved_configs', {});
        let configName = GM_getValue('CURRENT_CONFIG_NAME', '');

        // 若无有效配置 → 自动创建默认配置
        if (!configName || !configs[configName]) {
            const names = Object.keys(configs);
            if (names.length > 0) {
                configName = names[0];
                GM_setValue('CURRENT_CONFIG_NAME', configName);
            } else {
                configName = _ensureDefaultExists(configs);
            }
        }

        CONFIG = { ...configs[configName], CURRENT_CONFIG_NAME: configName };
        ctx.CONFIG = CONFIG;
        return CONFIG;
    }

    // ===== 实时保存（表单字段变更时调用） =====
    function updateCurrentConfig(changes) {
        const name = CONFIG.CURRENT_CONFIG_NAME;
        if (!name) return;

        const configs = GM_getValue('saved_configs', {});
        configs[name] = { ...configs[name], ...changes };
        GM_setValue('saved_configs', configs);
        CONFIG = { ...configs[name], CURRENT_CONFIG_NAME: name };
        ctx.CONFIG = CONFIG;
    }

    // ===== 应用配置（总结面板下拉切换） =====
    function applyConfig(name) {
        const configs = GM_getValue('saved_configs', {});
        if (!configs[name]) return false;

        GM_setValue('CURRENT_CONFIG_NAME', name);
        CONFIG = { ...configs[name], CURRENT_CONFIG_NAME: name };
        ctx.CONFIG = CONFIG;
        return true;
    }

    // ===== 读取 =====
    function getAllConfigs() {
        return GM_getValue('saved_configs', {});
    }

    function loadSavedConfig(name) {
        const configs = GM_getValue('saved_configs', {});
        return configs[name] || null;
    }

    // ===== 创建 =====
    function saveConfigAs(name, config) {
        const configs = GM_getValue('saved_configs', {});
        configs[name] = { ...config };
        GM_setValue('saved_configs', configs);
    }

    // ===== 删除（最后一个被删时自动创建默认配置） =====
    function deleteConfig(name) {
        const configs = GM_getValue('saved_configs', {});
        const names = Object.keys(configs);
        const deletedIdx = names.indexOf(name);
        delete configs[name];

        if (name === CONFIG.CURRENT_CONFIG_NAME) {
            const remaining = names.filter(function(n) { return n !== name; });
            if (remaining.length > 0) {
                const fallbackName = deletedIdx > 0 ? names[deletedIdx - 1] : remaining[0];
                CONFIG = { ...configs[fallbackName], CURRENT_CONFIG_NAME: fallbackName };
                GM_setValue('CURRENT_CONFIG_NAME', fallbackName);
            } else {
                // 所有配置已删除 → 自动创建默认配置
                _ensureDefaultExists(configs);
                CONFIG = { ...configs['默认配置'], CURRENT_CONFIG_NAME: '默认配置' };
                GM_setValue('CURRENT_CONFIG_NAME', '默认配置');
            }
            ctx.CONFIG = CONFIG;
        }

        GM_setValue('saved_configs', configs);
        return Object.keys(configs).length;
    }

    // ===== 重命名 =====
    function renameConfig(oldName, newName) {
        if (oldName === newName) return false;
        const configs = GM_getValue('saved_configs', {});
        if (!configs[oldName]) return false;

        configs[newName] = configs[oldName];
        delete configs[oldName];
        GM_setValue('saved_configs', configs);

        if (CONFIG.CURRENT_CONFIG_NAME === oldName) {
            CONFIG.CURRENT_CONFIG_NAME = newName;
            GM_setValue('CURRENT_CONFIG_NAME', newName);
        }
        return true;
    }

    // ===== 导出 =====
    function updateConfigSelectors(settingsPanel, summaryPanel) {
        const configs = getAllConfigs();
        const configNames = Object.keys(configs);
        const currentConfigName = CONFIG.CURRENT_CONFIG_NAME;

        // 设置面板：含"+ 新建配置"
        if (settingsPanel) {
            const sel = settingsPanel.querySelector('#config-select');
            if (sel) {
                var options = configNames.map(function(name) {
                    return '<option value="' + name + '" ' +
                        (name === currentConfigName ? 'selected' : '') + '>' + name + '</option>';
                });
                options.push('<option value="__new__">+ 新建配置</option>');
                sel.innerHTML = options.join('');

                var configSelected = sel.value !== '' && sel.value !== '__new__';
                var deleteBtn = settingsPanel.querySelector('.delete-config-btn');
                var renameBtn = settingsPanel.querySelector('.rename-config-btn');
                if (deleteBtn) deleteBtn.style.display = configSelected ? 'inline-block' : 'none';
                if (renameBtn) renameBtn.style.display = configSelected ? 'inline-block' : 'none';
            }
        }

        // 总结面板：仅列出已保存配置（用于切换应用）
        if (summaryPanel) {
            var sel = summaryPanel.querySelector('.ai-config-select');
            if (sel) {
                var options = configNames.map(function(name) {
                    return '<option value="' + name + '" ' +
                        (name === currentConfigName ? 'selected' : '') + '>' + name + '</option>';
                });
                sel.innerHTML = options.join('');
            }
        }
    }

    // ===== 内部：确保至少存在一个默认配置 =====
    function _ensureDefaultExists(configs) {
        if (!configs) configs = GM_getValue('saved_configs', {});
        var name = '默认配置';
        if (!configs[name]) {
            configs[name] = { ...DEFAULT_CONFIG };
        }
        GM_setValue('saved_configs', configs);
        GM_setValue('CURRENT_CONFIG_NAME', name);
        return name;
    }

    // ===== 导出 =====
    ctx.loadConfig = loadConfig;
    ctx.updateCurrentConfig = updateCurrentConfig;
    ctx.applyConfig = applyConfig;
    ctx.getAllConfigs = getAllConfigs;
    ctx.loadSavedConfig = loadSavedConfig;
    ctx.saveConfigAs = saveConfigAs;
    ctx.deleteConfig = deleteConfig;
    ctx.renameConfig = renameConfig;
    ctx.updateConfigSelectors = updateConfigSelectors;

    // ===== 显示设置（独立于 AI 配置存储） =====
    var DEFAULT_DISPLAY = ctx.DEFAULT_DISPLAY_SETTINGS;

    function loadDisplaySettings() {
        var saved = GM_getValue('display_settings', null);
        if (!saved) {
            saved = { ...DEFAULT_DISPLAY };
            GM_setValue('display_settings', saved);
        }
        ctx.DISPLAY_SETTINGS = saved;
        return saved;
    }

    function saveDisplaySettings(changes) {
        var current = GM_getValue('display_settings', DEFAULT_DISPLAY);
        var updated = { ...current, ...changes };
        GM_setValue('display_settings', updated);
        ctx.DISPLAY_SETTINGS = updated;
        return updated;
    }

    function matchesDomain(hostname, pattern) {
        // 去掉首尾空格
        pattern = pattern.trim();
        // 转换通配符为正则：*.example.com → 匹配 example.com 及其子域名
        var regexStr = '^' + pattern
            .replace(/\./g, '\\.')
            .replace(/\\\.\\\*/g, '(\\.)?')   // 把 * 转为 (\\.)? 使其成为可选通配段
            .replace(/\*/g, '[^.]*') + '$';
        var regex = new RegExp(regexStr, 'i');
        return regex.test(hostname);
    }

    function shouldShowButton() {
        var ds = ctx.DISPLAY_SETTINGS;
        if (!ds) {
            ds = loadDisplaySettings();
        }
        var hostname = window.location.hostname;
        var whitelist = (ds.whitelist || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        var blacklist = (ds.blacklist || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);

        if (ds.showButtonByDefault) {
            // 黑名单模式：默认显示，但黑名单中的不显示
            for (var i = 0; i < blacklist.length; i++) {
                if (matchesDomain(hostname, blacklist[i])) return false;
            }
            return true;
        } else {
            // 白名单模式：默认不显示，仅白名单中的显示
            for (var j = 0; j < whitelist.length; j++) {
                if (matchesDomain(hostname, whitelist[j])) return true;
            }
            return false;
        }
    }

    ctx.loadDisplaySettings = loadDisplaySettings;
    ctx.saveDisplaySettings = saveDisplaySettings;
    ctx.shouldShowButton = shouldShowButton;
    ctx.matchesDomain = matchesDomain;
})();
