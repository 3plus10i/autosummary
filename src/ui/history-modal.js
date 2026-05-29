(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function createHistoryPanel(shadow) {
        const getHistory = ctx.getHistory;
        const markdownRenderer = ctx.markdownRenderer;

        const overlay = document.createElement('div');
        overlay.className = 'ai-history-overlay';

        const modal = document.createElement('div');
        modal.className = 'ai-history-modal';
        modal.innerHTML = `
            <div class="ai-history-header">
                <h3>历史总结<span class="ai-history-subtitle">最近10条总结记录</span></h3>
                <button class="ai-history-close">&times;</button>
            </div>
            <div class="ai-history-body">
                <div class="ai-history-list"></div>
                <div class="ai-history-content"></div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `/* CSS_HISTORY_PLACEHOLDER */`;
        shadow.appendChild(style);
        shadow.appendChild(overlay);
        shadow.appendChild(modal);

        return { overlay, modal };
    }

    function refreshHistoryList(modal) {
        const listEl = modal.querySelector('.ai-history-list');
        const history = ctx.getHistory();

        if (!history.length) {
            listEl.innerHTML = '<div class="ai-history-list-empty">暂无历史总结记录</div>';
            return;
        }

        listEl.innerHTML = history.map((entry, idx) => {
            const timeStr = new Date(entry.time).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const title = entry.title || '无标题';
            const url = entry.url || '';
            const isActive = idx === 0 ? ' active' : '';
            return `
                <div class="ai-history-item${isActive}" data-id="${entry.id}">
                    <button class="ai-history-open-btn" title="在新标签页打开" data-url="${url.replace(/"/g, '&quot;')}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        <span>打开</span>
                    </button>
                    <div class="ai-history-item-time">${timeStr}</div>
                    <div class="ai-history-item-title">${title}</div>
                    ${url ? '<div class="ai-history-item-url">' + url.replace(/</g, '&lt;') + '</div>' : ''}
                </div>`;
        }).join('');

        showHistoryContent(modal, history[0]);
        const firstItem = listEl.querySelector('.ai-history-item');
        if (firstItem) firstItem.classList.add('active');
    }

    function showHistoryContent(modal, entry) {
        const contentEl = modal.querySelector('.ai-history-content');
        if (!entry) {
            contentEl.innerHTML = '<div class="ai-history-content-empty">选择左侧记录查看总结内容</div>';
            return;
        }
        try {
            const rendered = ctx.markdownRenderer.render(entry.content || '无内容');
            contentEl.innerHTML = rendered;
        } catch (e) {
            contentEl.innerHTML = '<div class="ai-history-content-empty">内容渲染失败</div>';
        }
    }

    ctx.createHistoryPanel = createHistoryPanel;
    ctx.refreshHistoryList = refreshHistoryList;
    ctx.showHistoryContent = showHistoryContent;
})();
