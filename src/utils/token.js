(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function estimateTokens(text) {
        if (!text) return 0;
        var enChars = 0, cnChars = 0;
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (/^[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]$/.test(ch)) {
                cnChars++;
            } else if (/\S/.test(ch)) {
                enChars++;
            }
        }
        return Math.round(enChars * 0.3 + cnChars * 0.6);
    }

    ctx.estimateTokens = estimateTokens;
})();
