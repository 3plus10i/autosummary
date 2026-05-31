(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    const HISTORY_KEY = 'summary_history';
    const MAX_HISTORY = 10;

    function getHistory() {
        try {
            const raw = GM_getValue(HISTORY_KEY, '[]');
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    }

    function saveHistory(entries) {
        GM_setValue(HISTORY_KEY, JSON.stringify(entries));
    }

    function addHistory(content, url, title) {
        const history = getHistory();
        history.unshift({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            url: url || window.location.href,
            title: title || document.title,
            content: content
        });
        // 裁剪到10条
        if (history.length > MAX_HISTORY) {
            history.length = MAX_HISTORY;
        }
        saveHistory(history);
    }

    function deleteHistory(id) {
        const history = getHistory().filter(h => h.id !== id);
        saveHistory(history);
    }

    function clearHistory() {
        GM_setValue(HISTORY_KEY, '[]');
    }

    ctx.getHistory = getHistory;
    ctx.addHistory = addHistory;
    ctx.deleteHistory = deleteHistory;
})();
