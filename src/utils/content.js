(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    // 关键提取：按优先级尝试的核心内容选择器
    const CONTENT_SELECTORS = [
        'article',
        'main',
        '[role="main"]',
        '[itemprop="articleBody"]',

        '#content',
        '#main-content',
        '#article',
        '#post',

        '.content',
        '.article-content',
        '.article-body',
        '.post-content',
        '.post-body',
        '.entry-content',
        '.markdown-body',
        '.rich-text',
        '.prose'
    ];

    function getSummaryCount(url) {
        try {
            const history = ctx.getHistory();
            let count = 0;
            for (let i = 0; i < history.length; i++) {
                if (history[i].url === url) count++;
            }
            return count;
        } catch (e) {
            return 0;
        }
    }

    function getPageContent() {
        const title = document.title;
        const url = window.location.href;

        const count = getSummaryCount(url);

        // 降级: count=0 关键提取; count=1 跳过; count>=2 全跳过
        // 数据源 → 行级过滤(条件)

        let source = document.body;
        if (count === 0) {
            const semantic = findSemanticContent();
            if (semantic) source = semantic;
        }

        let content;
        if (count === 0 && isZhihuAnswerPage(url)) {
            content = getTextExcluding(source, ['.Card.MoreAnswers']);
        } else {
            content = source.innerText;
        }

        if (count <= 1) {
            content = cleanText(content);
        }

        return { title, content };
    }

    function findSemanticContent() {
        for (let i = 0; i < CONTENT_SELECTORS.length; i++) {
            const el = document.querySelector(CONTENT_SELECTORS[i]);
            if (el) return el;
        }
        return null;
    }

    function isZhihuAnswerPage(url) {
        return /^https:\/\/www\.zhihu\.com\/question\/[^/]+\/answer\/[^/]+/.test(url);
    }

    function getTextExcluding(source, excludeSelectors) {
        if (!excludeSelectors || excludeSelectors.length === 0) return source.innerText;
        const clone = source.cloneNode(true);
        for (let i = 0; i < excludeSelectors.length; i++) {
            const els = clone.querySelectorAll(excludeSelectors[i]);
            for (let j = 0; j < els.length; j++) {
                els[j].remove();
            }
        }
        return clone.innerText;
    }

    function cleanText(text) {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line) return false;
                if (line.length < 4) return false;
                if (/^[\d\s,.，。、；;：:]+$/.test(line)) return false;
                // 视频播放器调试信息
                if (/^(VID|Flowid|Kernel|Codec|Res|mystery|播放信息|上传日志|调试信息)/.test(line)) return false;
                if (/^视频信息|^播放流水|^播放内核|^显示器信息|^帧数|^缓冲健康度|^网络活动|^视频分辨率|^编码/.test(line)) return false;
                return true;
            })
            .join('\n');
    }

    ctx.getPageContent = getPageContent;
})();
