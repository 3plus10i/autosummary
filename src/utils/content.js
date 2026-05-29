(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function getPageContent() {
        const title = document.title;
        const content = document.body.innerText;
        return { title, content };
    }

    ctx.getPageContent = getPageContent;
})();
