(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    async function summarizeContent(content, shadow, contentContainer) {
        const CONFIG = ctx.CONFIG;
        const typeWriter = ctx.typeWriter;
        const markdownRenderer = ctx.markdownRenderer;

        contentContainer.innerHTML = '<div class="ai-loading"><div class="ai-loading-spinner"></div><span>正在生成总结...</span></div>';

        let summary = '';
        const timeoutId = setTimeout(() => {
            contentContainer.innerHTML = '<div class="ai-summary-error"><strong>错误：</strong>请求超时，请检查API URL、API Key和网络连接</div>';
        }, 30000);

        try {
            // 执行层追加 /chat/completions 后缀，config 中不保存此后缀
            var apiUrl = CONFIG.API_URL;
            if (apiUrl && !apiUrl.endsWith('/chat/completions')) {
                apiUrl = apiUrl.replace(/\/+$/, '') + '/chat/completions';
            }

            // DEBUG: 打印发送给AI的网页内容
            console.log('[AI Summary] 发送的网页内容:', content);

            const requestPromise = new Promise((resolve, reject) => {
                console.log('[AI Summary] Sending request to:', apiUrl);
                GM.xmlHttpRequest({
                    method: 'POST',
                    url: apiUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + CONFIG.API_KEY
                    },
                    data: JSON.stringify({
                        model: CONFIG.MODEL,
                        messages: [
                            { role: 'system', content: CONFIG.PROMPT },
                            { role: 'user', content: content }
                        ],
                        max_tokens: CONFIG.MAX_TOKENS,
                        temperature: 0.7,
                        stream: false
                    }),
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const result = JSON.parse(response.responseText);
                                summary = result.choices[0].message.content;
                                ctx.originalMarkdownText = summary;
                                typeWriter(contentContainer, summary, 30, 5);
                                clearTimeout(timeoutId);
                                resolve(summary);
                            } catch (e) {
                                clearTimeout(timeoutId);
                                reject(new Error('解析响应失败: ' + e.message));
                            }
                        } else {
                            clearTimeout(timeoutId);
                            let errMsg = 'API请求失败 (' + response.status + ')';
                            try {
                                const errResult = JSON.parse(response.responseText);
                                if (errResult.error && errResult.error.message) {
                                    errMsg += ': ' + errResult.error.message;
                                }
                            } catch (e) { }
                            reject(new Error(errMsg));
                        }
                    },
                    onerror: function(error) {
                        clearTimeout(timeoutId);
                        reject(new Error('网络请求错误，请检查API URL和网络连接'));
                    },
                    ontimeout: function() {
                        clearTimeout(timeoutId);
                        reject(new Error('请求超时'));
                    }
                });
            });

            summary = await requestPromise;
            return summary;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('总结生成错误:', error);
            ctx.showError(contentContainer, error.message);
            throw error;
        }
    }

    ctx.summarizeContent = summarizeContent;
})();
