(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    // Markdown渲染器
    const markdownRenderer = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true
    });

    let originalMarkdownText = '';

    function typeWriter(element, text, speed, step) {
        if (speed === undefined) speed = 30;
        if (step === undefined) step = 5;
        let index = 0;
        element.innerHTML = '';

        function type() {
            if (index < text.length) {
                const currentIndex = Math.min(index + step, text.length);
                const currentText = text.substring(0, currentIndex);
                element.innerHTML = markdownRenderer.render(currentText);
                index = currentIndex;
                requestAnimationFrame(type);
            } else {
                element.innerHTML = markdownRenderer.render(text);
            }
        }
        type();
    }

    function showError(container, error, details) {
        if (details === undefined) details = '';
        container.innerHTML = `
            <div class="ai-summary-error" style="color: #ff4d4f; padding: 16px; background: #fff2f0; border: 1px solid #ffccc7; border-radius: 6px;">
                <strong>错误：</strong> ${error}
            </div>
            ${details ? '<div class="ai-summary-debug" style="margin-top: 8px; padding: 8px; background: #fafafa; border-radius: 6px; font-size: 12px; color: #999;">' + details + '</div>' : ''}
        `;
    }

    ctx.markdownRenderer = markdownRenderer;
    ctx.originalMarkdownText = originalMarkdownText;
    ctx.typeWriter = typeWriter;
    ctx.showError = showError;
})();
