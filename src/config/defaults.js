(function() {
    'use strict';

    // 默认配置 - 用户必须自行配置API信息
    // CURRENT_CONFIG_NAME 由 storage.js 管理，不在此处定义
    const DEFAULT_CONFIG = {
        API_URL: 'https://api.deepseek.com',
        API_KEY: '',
        MAX_TOKENS: 5000,
        PROMPT: '概括总结以下网页内容中最主要最重要的观点和事实。要求准确、有条理，不超过200字。提示：重点放在内容中最重要的少量信息上，可以使用bulletList，不要重复显然的信息（大标题）或者琐碎的细节（附属信息，页面中的其他非主要内容）。',
        MODEL: 'deepseek-v4-flash'
    };

    // 暴露到全局作用域供其他模块使用
    window.__AI_SUMMARY__ = window.__AI_SUMMARY__ || {};
    window.__AI_SUMMARY__.DEFAULT_CONFIG = DEFAULT_CONFIG;

    // 显示设置默认值（与 AI 配置独立存储）
    var DEFAULT_DISPLAY_SETTINGS = {
        showButtonByDefault: true,     // false=白名单模式, true=黑名单模式
        whitelist: '*.zhihu.com\nlinux.do',
        blacklist: '*.github.com'
    };
    window.__AI_SUMMARY__.DEFAULT_DISPLAY_SETTINGS = DEFAULT_DISPLAY_SETTINGS;
})();
