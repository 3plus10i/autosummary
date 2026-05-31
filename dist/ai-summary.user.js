// ==UserScript==
// @name         AI网页内容总结
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  使用AI总结网页内容，提升浏览效率
// @author       3plus10i
// @icon         https://gh-proxy.org/https://github.com/3plus10i/autosummary/main/public/as.png
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js
// @license      Apache-2.0
// ==/UserScript==

// Original work Copyright 2024 Jinfeng
// Modified work Copyright 2026 3plus10i
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function() {
    'use strict';

    // 默认配置 - 用户必须自行配置API信息
    // CURRENT_CONFIG_NAME 由 storage.js 管理，不在此处定义
    const DEFAULT_CONFIG = {
        API_URL: 'https://api.deepseek.com',
        API_KEY: '',
        MAX_TOKENS: 5000,
        PROMPT: '概括总结以下网页内容中最主要最重要的观点和事实。要求准确、有条理，不超过300字。提示：重点放在内容中最重要的少量信息上，可以使用bulletList，不要重复显然的信息（大标题）或者琐碎的细节（附属信息，页面中的其他非主要内容）。',
        MODEL: 'deepseek-v4-flash'
    };

    // 暴露到全局作用域供其他模块使用
    window.__AI_SUMMARY__ = window.__AI_SUMMARY__ || {};
    window.__AI_SUMMARY__.DEFAULT_CONFIG = DEFAULT_CONFIG;
})();


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
})();


(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    // 预定义的提示词模版
    const PROMPT_TEMPLATES = [
        {
            title: "通用网页总结",
            content: "请用markdown格式全面总结以下网页内容，包含主要观点、关键信息和重要细节。总结需要完整、准确、有条理。"
        },
        {
            title: "简短概括",
            content: "概括总结以下网页内容中最主要最重要的观点和事实。要求准确、有条理，不超过300字。提示：重点放在内容中最重要的少量信息上，可以使用bulletList，不要重复显然的信息（大标题）或者琐碎的细节（附属信息，页面中的其他非主要内容）。"
        },
        {
            title: "学术论文总结",
            content: "请用markdown格式总结这篇学术论文，包含以下要点：\n1. 研究目的和背景\n2. 研究方法\n3. 主要发现\n4. 结论和意义\n请确保总结准确、专业，并突出论文的创新点。"
        },
        {
            title: "新闻事件总结",
            content: "请用markdown格式总结这则新闻，包含以下要点：\n1. 事件梗概（时间、地点、人物）\n2. 事件经过\n3. 影响和意义\n4. 各方反应\n请确保总结客观、准确，并突出新闻的重要性。"
        },
        {
            title: "时间轴梳理",
            content: "请将内容按时间顺序整理成清晰的时间轴：\n\n### 时间轴\n- [时间点1]：事件/进展描述\n- [时间点2]：事件/进展描述\n\n### 关键节点分析\n[分析重要时间节点的意义]\n\n注意：要突出重要时间节点，并分析其意义。"
        },
        {
            title: "观点对比",
            content: "请以对比的形式总结文中的不同观点或方面：\n\n### 正面观点/优势\n- 观点1\n- 观点2\n\n### 负面观点/劣势\n- 观点1\n- 观点2\n\n### 中立分析\n综合以上观点的分析和建议\n\n注意：要客观公正，论据充分。"
        },
        {
            title: "知乎专业解答",
            content: "请以知乎回答的风格总结这段内容。要求：\n1. 开头要吸引眼球\n2. 分点论述，层次分明\n3. 使用专业术语\n4. 适当举例佐证\n5. 语气要专业且自信\n6. 结尾点题升华\n注意：要用markdown格式，保持知乎体特有的严谨专业但不失亲和力的风格。"
        },
        {
            title: "深度分析",
            content: "请对内容进行深度分析，包含：\n1. 表层信息提炼\n2. 深层原因分析\n3. 可能的影响和发展\n4. 个人见解和建议\n注意：分析要有洞察力，观点要有独特性，论述要有逻辑性。使用markdown格式。"
        },
        {
            title: "表格化总结",
            content: "请将内容重点提取并整理成markdown表格格式。表格应当包含以下列：\n| 主题/概念 | 核心要点 | 补充说明 |\n要求条理清晰，重点突出，易于阅读。"
        },
        {
            title: "要点清单",
            content: "请将内容整理成简洁的要点清单，要求：\n1. 用markdown的项目符号格式\n2. 每点都简洁明了（不超过20字）\n3. 按重要性排序\n4. 分类呈现（如适用）\n5. 突出关键词或数字"
        },
        {
            title: "关键问题分析",
            content: "请对文中提出的关键问题进行详细分析，包含以下要点：\n1. 问题的背景与成因\n2. 当前解决方案及其效果\n3. 可能的解决方案和优缺点\n4. 解决这一问题的长期影响和潜在风险\n要求：分析要有深度，确保逻辑严密，提出建设性意见。"
        },
        {
            title: "步骤指南",
            content: "请将这段内容总结成一个清晰的操作步骤指南。要求：\n- 每一步操作清晰简洁\n- 每一步的目标或目的要明确\n- 适当提供示例或注意事项\n- 步骤顺序按逻辑组织"
        }
    ];

    ctx.PROMPT_TEMPLATES = PROMPT_TEMPLATES;
})();


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

        let content = source.innerText;
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


(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    const HIDE_THRESHOLD = 100;    // 靠近边缘多少像素触发隐藏
    const ANIM_DURATION = 300;     // 移出动画时长(ms)

    // ===== 持久化位置 =====
    function savePosition(container) {
        if (container.classList.contains('hidden')) return;
        const position = {
            left: container.style.left,
            top: container.style.top,
            right: container.style.right,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        GM_setValue('containerPosition', position);
    }

    function loadPosition(container) {
        const saved = GM_getValue('containerPosition', null);
        if (!saved) return;
        if (saved.top) {
            const w = container.offsetWidth;
            const h = container.offsetHeight;
            const rw = window.innerWidth / saved.windowWidth;
            const rh = window.innerHeight / (saved.windowHeight || window.innerHeight);
            const left = parseInt(saved.left) * rw;
            const top = parseInt(saved.top) * rh;
            container.style.left = Math.max(0, Math.min(left, window.innerWidth - w)) + 'px';
            container.style.top = Math.max(0, Math.min(top, window.innerHeight - h)) + 'px';
            container.style.right = 'auto';
        }
    }

    // ===== 隐藏/恢复 =====
    function createEdgeIndicator() {
        // 已在 document.body 中创建过则复用
        let el = document.querySelector('.ai-edge-indicator');
        if (el) return el;
        el = document.createElement('div');
        el.className = 'ai-edge-indicator';
        el.innerHTML = '<span></span>';
        el.style.cssText = `
            position:fixed;top:50%;z-index:99991;
            width:6px;height:36px;cursor:pointer;
            background:rgba(22,119,255,0.12);
            border-radius:0 4px 4px 0;
            transition:background 0.2s,width 0.2s;
            display:none;
        `;
        el.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(22,119,255,0.28)';
            this.style.width = '10px';
        });
        el.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(22,119,255,0.12)';
            this.style.width = '6px';
        });
        document.body.appendChild(el);
        return el;
    }

    function hideContainer(container, side, top) {
        var w = container.offsetWidth;
        var rect = container.getBoundingClientRect();
        // 保存原位供恢复使用
        container.dataset.savedTop = rect.top;
        container.dataset.savedLeft = rect.left;
        container.style.transition = 'all ' + ANIM_DURATION + 'ms ease';
        container.style.opacity = '0';
        container.dataset.hideSide = side;
        if (side === 'right') {
            container.style.right = '-' + w + 'px';
            container.style.left = 'auto';
        } else {
            container.style.left = '-' + w + 'px';
            container.style.right = 'auto';
        }
        setTimeout(function() {
            container.classList.add('hidden');
            container.style.display = 'none';
            // 显示边缘指示器
            var indicator = createEdgeIndicator();
            var h = indicator.offsetHeight || 36;
            var safeTop = Math.max(10, Math.min(top - h / 2, window.innerHeight - h - 10));
            indicator.style.top = safeTop + 'px';
            if (side === 'right') {
                indicator.style.left = 'auto';
                indicator.style.right = '0';
                indicator.style.borderRadius = '4px 0 0 4px';
            } else {
                indicator.style.right = 'auto';
                indicator.style.left = '0';
                indicator.style.borderRadius = '0 4px 4px 0';
            }
            indicator.style.display = 'block';
            indicator.onclick = function() { restoreContainer(container); };
        }, ANIM_DURATION + 50);
    }

    function restoreContainer(container) {
        // 隐藏边缘指示器
        var indicator = document.querySelector('.ai-edge-indicator');
        if (indicator) indicator.style.display = 'none';
        // 在原位置恢复
        var savedTop = parseFloat(container.dataset.savedTop) || window.innerHeight / 2;
        var savedLeft = parseFloat(container.dataset.savedLeft) || 0;
        container.classList.remove('hidden');
        container.style.display = 'flex';
        container.style.transition = 'all ' + ANIM_DURATION + 'ms ease';
        container.style.opacity = '0';
        var side = container.dataset.hideSide || 'right';
        if (side === 'right') {
            container.style.right = '0px';
            container.style.left = 'auto';
        } else {
            container.style.left = '0px';
            container.style.right = 'auto';
        }
        container.style.top = Math.max(10, Math.min(savedTop, window.innerHeight - container.offsetHeight - 10)) + 'px';
        requestAnimationFrame(function() {
            container.style.opacity = '1';
        });
        container.dataset.hideSide = '';
    }

    // ===== 拖拽初始化 =====
    function initializeDrag(container, dragHandle, shadow) {
        var isDragging = false, startX, startY, offsetX, offsetY, nearSide = '';

        var style = document.createElement('style');
        style.textContent = `/* 边缘指示器 */
.ai-edge-indicator {
    position: fixed;
    top: 50%;
    z-index: 99991;
    width: 6px;
    height: 36px;
    cursor: pointer;
    background: rgba(22, 119, 255, 0.12);
    transition: background 0.2s, width 0.2s;
    display: none;
}
.ai-edge-indicator:hover {
    background: rgba(22, 119, 255, 0.28);
    width: 10px;
}

/* 拖拽中的容器 */
.ai-summary-container {
    transition: opacity 0.15s ease;
}
.ai-summary-container.near-edge {
    opacity: 0.45;
    pointer-events: none;
}
.ai-summary-container.hidden {
    display: none;
}
.ai-drag-handle {
    pointer-events: auto !important;
}
`;
        shadow.appendChild(style);

        loadPosition(container);

        dragHandle.addEventListener('mousedown', function(e) {
            // 如果是隐藏状态，点击恢复
            if (container.classList.contains('hidden')) {
                restoreContainer(container);
                return;
            }
            isDragging = true;
            var rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            startX = rect.left;
            startY = rect.top;
            container.style.transition = 'none';
            container.style.opacity = '1';
            nearSide = '';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            e.preventDefault();
            var w = container.offsetWidth;
            var h = container.offsetHeight;

            // 判断靠近哪一侧
            if (e.clientX < HIDE_THRESHOLD) {
                nearSide = 'left';
            } else if (e.clientX > window.innerWidth - HIDE_THRESHOLD) {
                nearSide = 'right';
            } else {
                nearSide = '';
            }

            // 半透明视效 + 提示文字
            var btnSpan = container.querySelector('.ai-summary-btn span');
            if (nearSide) {
                container.style.opacity = '0.45';
                container.classList.add('near-edge');
                if (btnSpan) btnSpan.textContent = '松手隐藏';
            } else {
                container.style.opacity = '1';
                container.classList.remove('near-edge');
                if (btnSpan) btnSpan.textContent = '总结网页';
            }

            // 计算位置
            var nx = e.clientX - offsetX;
            var ny = e.clientY - offsetY;
            nx = Math.max(0, Math.min(nx, window.innerWidth - w));
            ny = Math.max(0, Math.min(ny, window.innerHeight - h));
            container.style.left = nx + 'px';
            container.style.top = ny + 'px';
            container.style.right = 'auto';
            startX = nx;
            startY = ny;
        });

        document.addEventListener('mouseup', function() {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = 'auto';
            container.classList.remove('near-edge');
            var btnSpan = container.querySelector('.ai-summary-btn span');
            if (btnSpan) btnSpan.textContent = '总结网页';

            if (nearSide) {
                hideContainer(container, nearSide, startY + container.offsetHeight / 2);
            } else {
                container.style.opacity = '';
                container.style.transition = '';
                savePosition(container);
            }
            nearSide = '';
        });

        // 窗口尺寸变化时恢复位置
        window.addEventListener('resize', function() {
            if (!container.classList.contains('hidden')) {
                loadPosition(container);
            }
        });
    }

    ctx.initializeDrag = initializeDrag;
})();


(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    // README 内容（由 build.js 从 README.md 截取"快速开始"之前内容注入）
    var README_CONTENT = `# AutoSummary - AI网页内容总结

在网页右下角添加一个常驻“总结网页”按钮，一键调用 AI 对当前页面进行快速总结。

## 功能

- 常驻右下角浮动按钮，一键总结网页内容
- 可折叠浮窗显示总结结果，等AI响应时不中断浏览
- 多种预设提示词模板，不同的总结风格
- 多配置切换、保存、重命名
- 保留最近 10 条历史总结记录，支持跳转原页面
- 推荐使用 DeepSeek V4 Flash 或同等级模型平衡成本与质量

项目地址：[https://github.com/3plus10i/autosummary](https://github.com/3plus10i/autosummary)

当前版本 v2.0`;

    ctx.README_CONTENT = README_CONTENT;

    function createSettingsPanel(shadow) {
        const CONFIG = ctx.CONFIG;
        const PROMPT_TEMPLATES = ctx.PROMPT_TEMPLATES;
        const getAllConfigs = ctx.getAllConfigs;

        const panel = document.createElement('div');
        panel.className = 'ai-settings-panel';
        panel.innerHTML = `
            <h3>⚙ 设置</h3>
            <div class="form-group inline">
                <label for="api-url">API URL<span class="ai-info-icon" title="不用写最后的&quot;/chat/completions&quot;，但如果有v1等要保留，例如 &quot;https://api.siliconflow.cn/v1&quot;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </span></label>
                <input type="text" id="api-url" value="${CONFIG.API_URL}" placeholder="例如: https://api.openai.com/v1">
            </div>
            <div class="form-group inline">
                <label for="api-key">API Key</label>
                <input type="text" id="api-key" class="ai-password-mask" value="${CONFIG.API_KEY}" placeholder="请输入你的API Key">
            </div>
            <div class="form-group inline">
                <label for="model">模型</label>
                <input type="text" id="model" value="${CONFIG.MODEL}" placeholder="例如: gpt-4o-mini">
            </div>
            <div class="form-group inline">
                <label for="max-tokens">最大Token数</label>
                <input type="number" id="max-tokens" value="${CONFIG.MAX_TOKENS}" min="100" max="128000">
            </div>
            <div class="form-group">
                <div class="prompt-label-row">
                    <label for="prompt">总结提示词</label>
                    <span class="prompt-template-inline">采用预设提示词<span class="ai-info-icon" title="用一个预设提示词覆盖当前提示词。">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </span>
                    <select class="ai-prompt-template-select" id="prompt-template-select">
                        <option value="">--选择--</option>
                        ${PROMPT_TEMPLATES.map(t =>
                            '<option value="' + t.title + '">' + t.title + '</option>'
                        ).join('')}
                    </select>
                    </span>
                </div>
                <textarea id="prompt">${CONFIG.PROMPT}</textarea>
            </div>
            <div class="form-group config-select-group">
                <label for="config-select">配置管理<span class="ai-info-icon" title="配置包括：上方所有内容，即API URL 和 Key，模型名，最大Token数，提示词。">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </span></label>
                <select class="ai-config-select" id="config-select">
                    <option value="">--选择配置--</option>
                    ${Object.keys(getAllConfigs()).map(name =>
                        '<option value="' + name + '">' + name + '</option>'
                    ).join('')}
                    <option value="__new__">+ 新建配置</option>
                </select>
                <button class="delete-config-btn" style="display: none;">删除</button>
                <button class="rename-config-btn" style="display: none;">重命名</button>
            </div>
            <div class="form-group rename-group" style="display: none;">
                <label for="rename-config">重命名配置</label>
                <div class="rename-input-group">
                    <input type="text" id="rename-config" placeholder="输入新配置名称">
                    <button class="confirm-rename-btn">确认重命名</button>
                    <button class="cancel-rename-btn">取消</button>
                </div>
            </div>
            <div class="form-group action-buttons">
                <div class="action-buttons-left">
                    <button class="about-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>关于</span>
                    </button>
                    <button class="history-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>历史总结</span>
                    </button>
                </div>
                <div class="action-buttons-right">
                    <button class="cancel-btn">关闭</button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `/* 设置面板 - Ant Design 风格 */

.ai-settings-panel {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ffffff;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08), 0 3px 6px rgba(0, 0, 0, 0.04), 0 9px 28px rgba(0, 0, 0, 0.05);
    width: 90%;
    max-width: 560px;
    max-height: 85vh;
    overflow-y: auto;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    font-size: 14px;
    z-index: 100001;
    animation: ai-settings-slide-in 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);
}

@keyframes ai-settings-slide-in {
    from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

.ai-settings-panel h3 {
    margin: 0 0 20px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
    color: #262626;
    font-size: 16px;
    font-weight: 600;
}

.form-group {
    margin-bottom: 16px;
}

/* 横向排列（前5个输入项） */
.form-group.inline {
    display: flex;
    align-items: center;
    gap: 10px;
}

.form-group.inline label {
    flex: 0 0 auto;
    margin-bottom: 0;
    white-space: nowrap;
    min-width: 90px;
}

.form-group.inline input,
.form-group.inline select {
    flex: 1;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    color: #434343;
    font-weight: 500;
    font-size: 14px;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 6px 11px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    background: #ffffff;
    color: #262626;
    transition: all 0.2s;
    outline: none;
}

.form-group input:hover,
.form-group textarea:hover {
    border-color: #4096ff;
}

.form-group input:focus,
.form-group textarea:focus {
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

/* API Key 输入框使用 text 类型伪装密码（避免触发浏览器密码管理器） */
.ai-password-mask {
    -webkit-text-security: disc;
}

.form-group textarea {
    height: 100px;
    resize: vertical;
    font-family: inherit;
}

.form-group.config-select-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
}

.form-group.config-select-group label {
    flex: 0 0 auto;
    margin-bottom: 0;
}

/* 操作按钮行 */
.action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 16px !important;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}

.action-buttons .history-btn {
    padding: 4px 15px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    height: 32px;
    background: #ffffff;
    color: #595959;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.action-buttons .history-btn:hover {
    color: #1677ff;
    border-color: #1677ff;
}

.action-buttons .about-btn {
    padding: 4px 15px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    height: 32px;
    background: #ffffff;
    color: #595959;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.action-buttons .about-btn:hover {
    color: #1677ff;
    border-color: #1677ff;
}

.action-buttons-right {
    display: flex;
    gap: 8px;
}

.action-buttons-left {
    display: flex;
    gap: 8px;
}

.action-buttons-right button {
    padding: 4px 20px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 400;
    transition: all 0.2s;
    height: 32px;
    line-height: 1.5715;
    background: #ffffff;
    color: #595959;
}

.action-buttons-right button:hover {
    color: #1677ff;
    border-color: #1677ff;
}

.action-buttons-right .cancel-btn:hover {
    color: #ff4d4f !important;
    border-color: #ff4d4f !important;
}

.ai-config-select,
.ai-prompt-template-select {
    padding: 4px 8px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    background: #ffffff;
    color: #595959;
    height: 32px;
    outline: none;
    transition: all 0.2s;
}

.ai-config-select {
    flex-grow: 1;
}

.ai-prompt-template-select {
    max-width: 160px;
}

.ai-config-select:hover,
.ai-prompt-template-select:hover {
    border-color: #4096ff;
}

.ai-config-select:focus,
.ai-prompt-template-select:focus {
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

/* info 图标 tooltip */
.ai-info-icon {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    color: #bfbfbf;
    cursor: help;
    position: relative;
    vertical-align: middle;
}

.ai-info-icon:hover {
    color: #1677ff;
}

/* 提示词标签行：label 左对齐，预设选择右对齐 */
.prompt-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.prompt-label-row label {
    margin-bottom: 0;
}

.prompt-template-inline {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #595959;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
}

.delete-config-btn {
    color: #ff4d4f !important;
    border: 1px solid #ffccc7;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    height: 32px;
    background: #ffffff;
    white-space: nowrap;
    flex-shrink: 0;
}

.delete-config-btn:hover {
    color: #ffffff !important;
    background: #ff4d4f !important;
    border-color: #ff4d4f !important;
}

.rename-config-btn {
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    height: 32px;
    background: #ffffff;
    color: #595959;
    white-space: nowrap;
    flex-shrink: 0;
}

.rename-config-btn:hover {
    color: #1677ff;
    border-color: #1677ff;
}

.rename-input-group {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
}

.rename-input-group input {
    flex: 1;
    padding: 4px 11px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    height: 32px;
    box-sizing: border-box;
}

.rename-input-group input:focus {
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
    outline: none;
}

.rename-input-group button {
    padding: 4px 15px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    height: 32px;
    white-space: nowrap;
    transition: all 0.2s;
    background: #ffffff;
    color: #595959;
}

.rename-input-group button:hover {
    color: #1677ff;
    border-color: #1677ff;
}

.confirm-rename-btn {
    background: #1677ff !important;
    border-color: #1677ff !important;
    color: #ffffff !important;
}

.confirm-rename-btn:hover {
    background: #4096ff !important;
    border-color: #4096ff !important;
}

/* 设置面板覆盖层 */
.ai-settings-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100000;
    animation: ai-overlay-fade-in 0.2s ease;
}

@keyframes ai-overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* 响应式 */
@media (max-width: 768px) {
    .ai-settings-panel {
        width: 95%;
        max-height: 90vh;
    }
}

/* 关于弹窗 */
.ai-about-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100000;
}

.ai-about-modal {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 640px;
    max-height: 80vh;
    background: #ffffff;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    z-index: 100001;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.ai-about-header {
    padding: 14px 20px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    background: #fafafa;
    border-radius: 8px 8px 0 0;
}

.ai-about-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #262626;
}

.ai-about-close {
    background: none;
    border: 1px solid transparent;
    font-size: 20px;
    cursor: pointer;
    color: #8c8c8c;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.ai-about-close:hover {
    color: #ff4d4f;
    background: #fff2f0;
    border-color: #ffccc7;
}

.ai-about-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    line-height: 1.8;
    color: #434343;
    font-size: 14px;
}

.ai-about-body h1 { font-size: 1.6em; margin: 0.4em 0 0.6em; font-weight: 600; color: #262626; }
.ai-about-body h2 { font-size: 1.35em; margin: 0.8em 0 0.5em; font-weight: 600; color: #262626; }
.ai-about-body h3 { font-size: 1.15em; margin: 0.6em 0 0.4em; font-weight: 600; color: #262626; }
.ai-about-body p { margin: 0.6em 0; }
.ai-about-body ul, .ai-about-body ol { margin: 0.4em 0; padding-left: 1.5em; }
.ai-about-body li { margin: 0.2em 0; }
.ai-about-body code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.9em;
    color: #ff4d4f;
}
.ai-about-body pre {
    background: #f6f8fa;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.6em 0;
}
.ai-about-body pre code {
    background: none;
    color: inherit;
    padding: 0;
    font-size: inherit;
}
`;
        shadow.appendChild(style);

        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none';

        const overlayStyle = document.createElement('style');
        overlayStyle.textContent = `
            .ai-settings-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.45);
                z-index: 100000;
            }
        `;
        shadow.appendChild(overlayStyle);
        shadow.appendChild(settingsOverlay);
        shadow.appendChild(panel);

        // 关于弹窗
        const aboutOverlay = document.createElement('div');
        aboutOverlay.className = 'ai-about-overlay';
        aboutOverlay.style.display = 'none';
        shadow.appendChild(aboutOverlay);

        const aboutModal = document.createElement('div');
        aboutModal.className = 'ai-about-modal';
        aboutModal.innerHTML = `
            <div class="ai-about-header">
                <h3>关于 AI网页内容总结</h3>
                <button class="ai-about-close">&times;</button>
            </div>
            <div class="ai-about-body"></div>
        `;
        aboutModal.style.display = 'none';
        shadow.appendChild(aboutModal);

        return { panel, overlay: settingsOverlay, aboutOverlay, aboutModal };
    }

    function showAboutModal(aboutModal, aboutOverlay) {
        aboutModal.style.display = 'flex';
        aboutOverlay.style.display = 'block';
        const body = aboutModal.querySelector('.ai-about-body');
        body.innerHTML = ctx.markdownRenderer.render(ctx.README_CONTENT);
    }

    ctx.createSettingsPanel = createSettingsPanel;
    ctx.showAboutModal = showAboutModal;
})();


(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function createElements() {
        const getAllConfigs = ctx.getAllConfigs;
        const createSettingsPanel = ctx.createSettingsPanel;

        // Shadow DOM根容器
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';
        const shadow = rootContainer.attachShadow({ mode: 'open' });

        // === 样式 ===
        const mainStyle = document.createElement('style');
        mainStyle.textContent = `/* 右侧浮动总结面板 - Ant Design 风格 */

.ai-summary-panel {
    display: none;
    position: fixed;
    top: 10vh;
    left: 75%;
    transform: translateX(-50%);
    width: 420px;
    max-width: 30vw;
    min-width: 320px;
    max-height: 80vh;
    background: #ffffff;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.05), 0 9px 28px rgba(0, 0, 0, 0.06);
    z-index: 99995;
    flex-direction: column;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
    overflow: hidden;
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
}

/* 面板可见时 */
.ai-summary-panel.visible {
    display: flex;
}

/* 收起态 - 只显示标题栏 */
.ai-summary-panel.collapsed {
    max-height: none;
}

.ai-summary-panel.collapsed .ai-summary-content,
.ai-summary-panel.collapsed .ai-panel-footer {
    display: none;
}

.ai-summary-panel.collapsed .ai-panel-header {
    border-radius: 8px;
    border-bottom: none;
}

.ai-summary-panel.loading {
    overflow: hidden;
}

/* 有内容后自动扩展 */
.ai-summary-panel.has-content {
    max-height: 80vh;
}

.ai-panel-header {
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    background: #fafafa;
    border-radius: 8px 8px 0 0;
    cursor: grab;
    user-select: none;
}

.ai-panel-header:active {
    cursor: grabbing;
}

/* 拖拽时防止文本选中 */
.ai-panel-header.dragging {
    cursor: grabbing;
}

.ai-panel-title {
    margin: 0;
    padding: 0;
    font-size: 14px;
    font-weight: 600;
    color: #262626;
    line-height: 1.4;
    flex-shrink: 0;
}

.ai-token-info {
    font-size: 11px;
    font-weight: 400;
    color: #8c8c8c;
    margin-left: 8px;
}

.ai-panel-drag-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333333;
    padding: 0 8px;
    flex-shrink: 0;
    pointer-events: none;
}

.ai-panel-drag-icon svg {
    width: 14px;
    height: 14px;
}

/* 左右边缘拖拽缩放 */
.ai-panel-resize-left,
.ai-panel-resize-right {
    position: absolute;
    top: 0;
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    z-index: 10;
}

.ai-panel-resize-left {
    left: 0;
}

.ai-panel-resize-right {
    right: 0;
}

.ai-panel-resize-left:hover,
.ai-panel-resize-right:hover {
    background: rgba(22, 119, 255, 0.1);
}

/* 头部按钮容器 */
.ai-panel-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
}

.ai-panel-collapse {
    background: none;
    border: 1px solid transparent;
    font-size: 18px;
    cursor: pointer;
    color: #8c8c8c;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.ai-panel-collapse:hover {
    color: #1677ff;
    background: #e6f4ff;
    border-color: #bae0ff;
}

.ai-panel-collapse:active {
    background: #bae0ff;
}

.ai-panel-close {
    background: none;
    border: 1px solid transparent;
    font-size: 20px;
    cursor: pointer;
    color: #8c8c8c;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-weight: 300;
}

.ai-panel-close:hover {
    color: #ff4d4f;
    background: #fff2f0;
    border-color: #ffccc7;
}

.ai-panel-close:active {
    background: #ffd8d2;
}

.ai-summary-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    line-height: 1.8;
    color: #434343;
    font-size: 14px;
    -webkit-overflow-scrolling: touch;
    min-height: 60px;
}

.ai-summary-content h1 {
    font-size: 1.6em;
    margin: 0.8em 0 0.6em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #f0f0f0;
    font-weight: 600;
    color: #262626;
}

.ai-summary-content h2 {
    font-size: 1.35em;
    margin: 0.8em 0 0.5em;
    padding-bottom: 0.2em;
    border-bottom: 1px solid #f5f5f5;
    font-weight: 600;
    color: #262626;
}

.ai-summary-content h3 {
    font-size: 1.15em;
    margin: 0.7em 0 0.4em;
    font-weight: 600;
    color: #262626;
}

.ai-summary-content p {
    margin: 0.6em 0;
}

.ai-summary-content ul,
.ai-summary-content ol {
    margin: 0.6em 0;
    padding-left: 1.5em;
}

.ai-summary-content li {
    margin: 0.25em 0;
}

.ai-summary-content blockquote {
    margin: 0.6em 0;
    padding: 10px 14px;
    border-left: 3px solid #1677ff;
    background: #f0f5ff;
    color: #434343;
    border-radius: 0 6px 6px 0;
}

.ai-summary-content code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace;
    font-size: 0.9em;
    color: #ff4d4f;
    border: 1px solid #f0f0f0;
}

.ai-summary-content pre {
    background: #f6f8fa;
    color: #262626;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.6em 0;
    border: 1px solid #f0f0f0;
}

.ai-summary-content pre code {
    background: none;
    color: inherit;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
    border: none;
}

.ai-summary-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.6em 0;
}

.ai-summary-content th,
.ai-summary-content td {
    border: 1px solid #f0f0f0;
    padding: 8px 10px;
    text-align: left;
}

.ai-summary-content th {
    background: #fafafa;
    font-weight: 600;
    color: #262626;
}

.ai-panel-footer {
    padding: 10px 20px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
    background: #fafafa;
    flex-wrap: wrap;
}

.ai-panel-footer button {
    padding: 2px 10px;
    background: #ffffff;
    color: #595959;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
    font-size: 12px;
    height: 28px;
    font-family: inherit;
}

.ai-panel-footer button:hover {
    color: #1677ff;
    border-color: #1677ff;
}

.ai-panel-footer button:active {
    color: #0958d9;
    border-color: #0958d9;
}

.ai-panel-footer button svg {
    width: 12px;
    height: 12px;
}

/* 总结模式下拉框 */
.ai-panel-footer .ai-config-label {
    font-size: 12px;
    color: #8c8c8c;
    white-space: nowrap;
}

.ai-panel-footer .ai-config-select {
    padding: 2px 6px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 12px;
    background: #fff;
    color: #595959;
    height: 28px;
    outline: none;
    transition: all 0.2s;
    max-width: 100px;
}

.ai-panel-footer .ai-config-select:hover {
    border-color: #1677ff;
}

.ai-panel-footer .ai-config-select:focus {
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

/* 加载状态 */
.ai-loading {
    text-align: center;
    padding: 28px 20px;
    color: #8c8c8c;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.ai-loading-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid #f0f0f0;
    border-top-color: #1677ff;
    border-radius: 50%;
    animation: ai-spin 0.8s linear infinite;
}

@keyframes ai-spin {
    to { transform: rotate(360deg); }
}

/* 错误提示 */
.ai-summary-error {
    color: #ff4d4f;
    padding: 14px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 6px;
    font-size: 13px;
}

/* 响应式 */
@media (max-width: 768px) {
    .ai-summary-panel {
        top: 5vh;
        left: 50%;
        transform: translateX(-50%);
        width: 92vw;
        max-width: 92vw;
        min-width: 0;
        max-height: 85vh;
    }
}
`;

        // === 浮动按钮容器（右下角常驻） ===
        const container = document.createElement('div');
        container.className = 'ai-summary-container';
        container.innerHTML = `
            <div class="ai-drag-handle">
                <svg width="12" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                </svg>
            </div>
            <button class="ai-summary-btn" title="总结网页">
                <span>总结网页</span>
            </button>
            <button class="ai-settings-quick-btn" title="打开设置">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
        `;

        // 浮动按钮样式
        const btnStyle = document.createElement('style');
        btnStyle.textContent = `
            .ai-summary-container {
                position: fixed;
                display: flex;
                align-items: center;
                z-index: 99990;
                user-select: none;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                border-radius: 6px;
                background: #ffffff;
                border: 1px solid #f0f0f0;
                overflow: hidden;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .ai-summary-container:hover {
                opacity: 1;
            }
            .ai-drag-handle {
                width: 16px;
                height: 28px;
                background: #fafafa;
                cursor: move;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333333;
                font-size: 12px;
                border-right: 1px solid #f0f0f0;
                transition: color 0.2s;
            }
            .ai-drag-handle:hover {
                color: #1677ff;
            }
            .ai-summary-btn {
                padding: 4px 10px;
                background: #ffffff;
                color: #1677ff;
                border: none;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s;
                height: 28px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
                white-space: nowrap;
            }
            .ai-summary-btn:hover {
                background: #e6f4ff;
                color: #0958d9;
            }
            .ai-summary-btn:active {
                background: #bae0ff;
            }
            .ai-settings-quick-btn {
                padding: 4px 8px;
                background: #ffffff;
                color: #8c8c8c;
                border: none;
                border-left: 1px solid #f0f0f0;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .ai-settings-quick-btn:hover {
                background: #fafafa;
                color: #1677ff;
            }
            .ai-settings-quick-btn:active {
                background: #f0f0f0;
            }
            .ai-settings-quick-btn svg {
                width: 12px;
                height: 12px;
            }
            /* 拖拽至边缘隐藏 */
            .ai-summary-container.near-edge {
                opacity: 0.45;
                pointer-events: none;
            }
            @media (max-width: 768px) {
                .ai-summary-container {
                    bottom: 10px;
                    right: 10px;
                }
            }
        `;

        // === 右侧浮动总结面板 ===
        const summaryPanel = document.createElement('div');
        summaryPanel.className = 'ai-summary-panel';
        summaryPanel.style.display = 'none';
        summaryPanel.innerHTML = `
            <div class="ai-panel-resize-left"></div>
            <div class="ai-panel-resize-right"></div>
            <div class="ai-panel-header">
                <div class="ai-panel-drag-icon" title="拖动窗口">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                    </svg>
                </div>
                <h3 class="ai-panel-title">网页总结</h3>
                <div class="ai-panel-header-actions">
                    <button class="ai-panel-collapse" title="收起面板">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button class="ai-panel-close" title="关闭面板">&times;</button>
                </div>
            </div>
            <div class="ai-summary-content"></div>
            <div class="ai-panel-footer">
                <span class="ai-config-label">当前配置：</span>
                <select class="ai-config-select">
                    ${Object.keys(getAllConfigs()).map(name =>
                        '<option value="' + name + '">' + name + '</option>'
                    ).join('')}
                </select>
                <button class="ai-settings-btn" title="打开设置">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
                <button class="ai-retry-btn" title="重新总结">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.5 17.6A9 9 0 1 0 2 11"></path>
                    </svg>
                </button>
                <button class="ai-copy-btn" title="复制总结">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>复制</span>
                </button>
                <button class="ai-history-summary-btn" title="查看历史总结">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>历史</span>
                </button>
            </div>
        `;

        // 创建设置面板
        const { panel: settingsPanel, overlay: settingsOverlay, aboutModal, aboutOverlay } = createSettingsPanel(shadow);

        // 组装到Shadow DOM
        shadow.appendChild(mainStyle);
        shadow.appendChild(btnStyle);
        shadow.appendChild(container);
        shadow.appendChild(summaryPanel);

        document.body.appendChild(rootContainer);

        return {
            rootContainer,
            container,
            button: container.querySelector('.ai-summary-btn'),
            settingsQuickBtn: container.querySelector('.ai-settings-quick-btn'),
            summaryPanel,
            dragHandle: container.querySelector('.ai-drag-handle'),
            settingsPanel,
            settingsOverlay,
            aboutModal,
            aboutOverlay,
            shadow
        };
    }

    ctx.createElements = createElements;
})();


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
        style.textContent = `/* 历史总结模态框 */

.ai-history-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100000;
}

.ai-history-modal {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 85vw;
    max-width: 960px;
    height: 80vh;
    background: #ffffff;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    z-index: 100001;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.ai-history-header {
    padding: 14px 20px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    background: #fafafa;
    border-radius: 8px 8px 0 0;
}

.ai-history-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #262626;
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.ai-history-subtitle {
    font-size: 12px;
    font-weight: 400;
    color: #bfbfbf;
}

.ai-history-close {
    background: none;
    border: 1px solid transparent;
    font-size: 20px;
    cursor: pointer;
    color: #8c8c8c;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.ai-history-close:hover {
    color: #ff4d4f;
    background: #fff2f0;
    border-color: #ffccc7;
}

.ai-history-body {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* 左侧列表 */
.ai-history-list {
    width: 42%;
    min-width: 260px;
    border-right: 1px solid #f0f0f0;
    overflow-y: auto;
    background: #fafafa;
    flex-shrink: 0;
}

.ai-history-list-empty {
    padding: 60px 20px;
    text-align: center;
    color: #bfbfbf;
    font-size: 14px;
}

.ai-history-item {
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.15s;
    background: #ffffff;
    position: relative;
    border-left: 3px solid transparent;
}

.ai-history-item:hover {
    background: #e6f4ff;
}

.ai-history-item.active {
    background: #e6f4ff;
    border-left-color: #1677ff;
}

.ai-history-open-btn {
    padding: 2px 6px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #ffffff;
    color: #595959;
    font-size: 11px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    width: 24px;
    height: 22px;
}

.ai-history-open-btn:hover {
    color: #1677ff;
    border-color: #1677ff;
    background: #e6f4ff;
}

.ai-history-open-btn svg {
    width: 11px;
    height: 11px;
}

.ai-history-item-btns {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    z-index: 1;
}

.ai-history-delete-btn {
    padding: 2px 6px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #ffffff;
    color: #595959;
    font-size: 11px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    width: 24px;
    height: 22px;
}

.ai-history-delete-btn:hover {
    color: #ff4d4f;
    border-color: #ff4d4f;
    background: #fff2f0;
}

.ai-history-delete-btn svg {
    width: 11px;
    height: 11px;
}

.ai-history-item-time {
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 4px;
}

.ai-history-item-title {
    font-size: 13px;
    color: #262626;
    font-weight: 500;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

/* 右侧内容区 */
.ai-history-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    line-height: 1.8;
    color: #434343;
    font-size: 14px;
}

.ai-history-content-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #bfbfbf;
    font-size: 14px;
}

.ai-history-content h1 {
    font-size: 1.6em;
    margin: 0.8em 0 0.6em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #f0f0f0;
    font-weight: 600;
    color: #262626;
}

.ai-history-content h2 {
    font-size: 1.35em;
    margin: 0.8em 0 0.5em;
    padding-bottom: 0.2em;
    border-bottom: 1px solid #f5f5f5;
    font-weight: 600;
    color: #262626;
}

.ai-history-content h3 {
    font-size: 1.15em;
    margin: 0.7em 0 0.4em;
    font-weight: 600;
    color: #262626;
}

.ai-history-content p { margin: 0.6em 0; }

.ai-history-content ul,
.ai-history-content ol {
    margin: 0.6em 0;
    padding-left: 1.5em;
}

.ai-history-content li { margin: 0.25em 0; }

.ai-history-content blockquote {
    margin: 0.6em 0;
    padding: 10px 14px;
    border-left: 3px solid #1677ff;
    background: #f0f5ff;
    border-radius: 0 6px 6px 0;
}

.ai-history-content code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace;
    font-size: 0.9em;
    color: #ff4d4f;
    border: 1px solid #f0f0f0;
}

.ai-history-content pre {
    background: #f6f8fa;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.6em 0;
    border: 1px solid #f0f0f0;
}

.ai-history-content pre code {
    background: none;
    color: inherit;
    padding: 0;
    font-size: inherit;
    border: none;
}

.ai-history-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.6em 0;
}

.ai-history-content th,
.ai-history-content td {
    border: 1px solid #f0f0f0;
    padding: 8px 10px;
    text-align: left;
}

.ai-history-content th {
    background: #fafafa;
    font-weight: 600;
    color: #262626;
}

/* 响应式 */
@media (max-width: 768px) {
    .ai-history-modal {
        width: 95vw;
        height: 90vh;
    }
    .ai-history-body {
        flex-direction: column;
    }
    .ai-history-list {
        width: 100%;
        max-height: 40%;
        min-width: 0;
        border-right: none;
        border-bottom: 1px solid #f0f0f0;
    }
}
`;
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
            modal.querySelector('.ai-history-content').innerHTML = '<div class="ai-history-content-empty">暂无历史总结记录</div>';
            return;
        }

        listEl.innerHTML = history.map((entry, idx) => {
            const timeStr = new Date(entry.time).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const title = entry.title || '无标题';
            const isActive = idx === 0 ? ' active' : '';
            return `
                <div class="ai-history-item${isActive}" data-id="${entry.id}">
                    <div class="ai-history-item-btns">
                        <button class="ai-history-delete-btn" title="删除此记录" data-id="${entry.id}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                        <button class="ai-history-open-btn" title="在新标签页打开" data-id="${entry.id}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="ai-history-item-time">[${idx + 1}] ${timeStr}</div>
                    <div class="ai-history-item-title">${title}</div>
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


(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function initializeEvents(elements) {
        const { container, button, settingsQuickBtn, summaryPanel, dragHandle, settingsPanel, settingsOverlay, shadow, historyModal, historyOverlay, aboutModal, aboutOverlay } = elements;
        const CONFIG = ctx.CONFIG;
        const getAllConfigs = ctx.getAllConfigs;
        const saveConfigAs = ctx.saveConfigAs;
        const deleteConfig = ctx.deleteConfig;
        const renameConfig = ctx.renameConfig;
        const updateCurrentConfig = ctx.updateCurrentConfig;
        const applyConfig = ctx.applyConfig;
        const updateConfigSelectors = ctx.updateConfigSelectors;
        const getPageContent = ctx.getPageContent;
        const showError = ctx.showError;
        const summarizeContent = ctx.summarizeContent;
        const initializeDrag = ctx.initializeDrag;
        const addHistory = ctx.addHistory;
        const refreshHistoryList = ctx.refreshHistoryList;
        const estimateTokens = ctx.estimateTokens;

        // 初始化拖拽
        initializeDrag(container, dragHandle, shadow);

        // === 总结面板边缘缩放 ===
        initEdgeResize(summaryPanel);

        // === 总结按钮点击 ===
        button.addEventListener('click', async () => {
            if (!CONFIG.API_KEY || !CONFIG.API_URL) {
                alert('请先配置API URL和API Key。');
                settingsPanel.style.display = 'block';
                settingsOverlay.style.display = 'block';
                return;
            }
            openSummaryPanel(summaryPanel);
            startLoading(summaryPanel);
            const contentContainer = summaryPanel.querySelector('.ai-summary-content');
            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }
                await summarizeContent(content, shadow, contentContainer);
                // 估算token用量
                var inputTokens = estimateTokens(content) + estimateTokens(CONFIG.PROMPT);
                var outputTokens = estimateTokens(ctx.originalMarkdownText);
                finishLoading(summaryPanel, inputTokens, outputTokens);
                // 保存历史
                addHistory(ctx.originalMarkdownText, window.location.href, document.title);
            } catch (error) {
                console.error('Summary Error:', error);
                showError(contentContainer, error.message);
                finishLoading(summaryPanel);
            }
        });

        // === 齿轮按钮点击 ===
        settingsQuickBtn.addEventListener('click', () => {
            refreshSettingsPanelValues(settingsPanel);
            settingsPanel.style.display = 'block';
            settingsOverlay.style.display = 'block';
        });

        // === 关闭总结面板 ===
        summaryPanel.querySelector('.ai-panel-close').addEventListener('click', () => {
            closeSummaryPanel(summaryPanel);
        });

        // === 收起/展开面板 ===
        summaryPanel.querySelector('.ai-panel-collapse').addEventListener('click', () => {
            toggleCollapse(summaryPanel);
        });

        // === 标题栏拖拽 ===
        initPanelDrag(summaryPanel);

        // === 复制按钮 ===
        summaryPanel.querySelector('.ai-copy-btn').addEventListener('click', () => {
            if (!ctx.originalMarkdownText) {
                alert('总结内容尚未生成或已失效。');
                return;
            }
            navigator.clipboard.writeText(ctx.originalMarkdownText).then(() => {
                const copyBtn = summaryPanel.querySelector('.ai-copy-btn');
                const textSpan = copyBtn.querySelector('span');
                const originalText = textSpan.textContent;
                textSpan.textContent = '已复制！';
                textSpan.style.color = '#52c41a';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    textSpan.style.color = '';
                }, 2000);
            }).catch(() => {
                alert('复制失败，请手动复制内容。');
            });
        });

        // === ESC 关闭 ===
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (settingsPanel.style.display === 'block') {
                    settingsPanel.style.display = 'none';
                    settingsOverlay.style.display = 'none';
                }
                if (summaryPanel.classList.contains('visible')) {
                    closeSummaryPanel(summaryPanel);
                }
            }
        });

        // === 重试按钮 ===
        summaryPanel.querySelector('.ai-retry-btn').addEventListener('click', async () => {
            const contentContainer = summaryPanel.querySelector('.ai-summary-content');
            startLoading(summaryPanel);
            contentContainer.innerHTML = '<div class="ai-loading"><div class="ai-loading-spinner"></div><span>正在重新生成总结...</span></div>';
            openSummaryPanel(summaryPanel);
            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }
                await summarizeContent(content, shadow, contentContainer);
                var inputTokens = estimateTokens(content) + estimateTokens(CONFIG.PROMPT);
                var outputTokens = estimateTokens(ctx.originalMarkdownText);
                finishLoading(summaryPanel, inputTokens, outputTokens);
                addHistory(ctx.originalMarkdownText, window.location.href, document.title);
            } catch (error) {
                showError(contentContainer, error.message);
                finishLoading(summaryPanel);
            }
        });

        // === 设置按钮（总结面板内）===
        summaryPanel.querySelector('.ai-settings-btn').addEventListener('click', () => {
            refreshSettingsPanelValues(settingsPanel);
            settingsPanel.style.display = 'block';
            settingsOverlay.style.display = 'block';
        });

        // === 设置面板事件 ===
        settingsPanel.querySelector('.cancel-btn').addEventListener('click', () => {
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });
        settingsOverlay.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });

        // === 配置选择与自动保存 ===
        const configSelect = settingsPanel.querySelector('#config-select');
        const promptTemplateSelect = settingsPanel.querySelector('#prompt-template-select');
        const promptTextarea = settingsPanel.querySelector('#prompt');

        // 自动保存（去抖 500ms）
        var autoSaveTimer = null;
        var _savingConfigName = null;

        function scheduleAutoSave() {
            clearTimeout(autoSaveTimer);
            _savingConfigName = configSelect.value;
            autoSaveTimer = setTimeout(function() {
                if (configSelect.value !== _savingConfigName) return;
                if (!_savingConfigName || _savingConfigName === '__new__') return;
                var changes = {
                    API_URL: settingsPanel.querySelector('#api-url').value.trim(),
                    API_KEY: settingsPanel.querySelector('#api-key').value.trim(),
                    MAX_TOKENS: parseInt(settingsPanel.querySelector('#max-tokens').value) || 5000,
                    PROMPT: promptTextarea.value.trim() || ctx.DEFAULT_CONFIG.PROMPT,
                    MODEL: settingsPanel.querySelector('#model').value.trim() || ctx.DEFAULT_CONFIG.MODEL
                };
                updateCurrentConfig(changes);
            }, 500);
        }

        ['#api-url', '#api-key', '#model', '#max-tokens'].forEach(function(sel) {
            settingsPanel.querySelector(sel).addEventListener('input', scheduleAutoSave);
        });
        promptTextarea.addEventListener('input', scheduleAutoSave);

        // 配置选择下拉
        configSelect.addEventListener('change', function(e) {
            var val = e.target.value;
            if (val === '__new__') {
                var allConfigs = getAllConfigs();
                var idx = 1;
                while (allConfigs['新配置' + idx]) idx++;
                var newName = '新配置' + idx;
                saveConfigAs(newName, { ...ctx.DEFAULT_CONFIG });
                applyConfig(newName);
                updateConfigSelectors(settingsPanel, summaryPanel);
                configSelect.value = newName;
                populateFormFromConfig(settingsPanel, ctx.CONFIG);
                settingsPanel.querySelector('.delete-config-btn').style.display = 'inline-block';
                settingsPanel.querySelector('.rename-config-btn').style.display = 'inline-block';
                return;
            }
            var hasSelection = val !== '';
            if (hasSelection && applyConfig(val)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
                populateFormFromConfig(settingsPanel, ctx.CONFIG);
            }
            settingsPanel.querySelector('.delete-config-btn').style.display = hasSelection ? 'inline-block' : 'none';
            settingsPanel.querySelector('.rename-config-btn').style.display = hasSelection ? 'inline-block' : 'none';
        });

        // 提示词模板选择（触发自动保存）
        promptTemplateSelect.addEventListener('change', function(e) {
            var selected = ctx.PROMPT_TEMPLATES.find(function(t) { return t.title === e.target.value; });
            if (selected) {
                promptTextarea.value = selected.content;
                scheduleAutoSave();
            }
        });

        // 删除配置（最后一个被删时 storage 层自动创建默认配置）
        settingsPanel.querySelector('.delete-config-btn').addEventListener('click', function() {
            var configName = configSelect.value;
            if (!configName) { alert('请先选择要删除的配置'); return; }
            if (confirm('确定要删除配置"' + configName + '"吗？')) {
                deleteConfig(configName);
                updateConfigSelectors(settingsPanel, summaryPanel);
                refreshSettingsPanelValues(settingsPanel);
            }
        });

        // 重命名配置
        settingsPanel.querySelector('.rename-config-btn').addEventListener('click', function() {
            var name = configSelect.value;
            if (!name) { alert('请先选择要重命名的配置'); return; }
            var renameGroup = settingsPanel.querySelector('.rename-group');
            var renameInput = settingsPanel.querySelector('#rename-config');
            renameInput.value = name;
            renameGroup.style.display = 'block';
            renameInput.focus();
            renameInput.select();
        });
        settingsPanel.querySelector('.confirm-rename-btn').addEventListener('click', function() {
            var oldName = configSelect.value;
            var newName = settingsPanel.querySelector('#rename-config').value.trim();
            if (!oldName) return;
            if (!newName) { alert('请输入新配置名称'); return; }
            if (oldName === newName) return;
            if (getAllConfigs()[newName] && !confirm('配置名"' + newName + '"已存在，是否覆盖？')) return;
            if (renameConfig(oldName, newName)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
                settingsPanel.querySelector('.rename-group').style.display = 'none';
                settingsPanel.querySelector('#rename-config').value = '';
                refreshSettingsPanelValues(settingsPanel);
            }
        });
        settingsPanel.querySelector('.cancel-rename-btn').addEventListener('click', function() {
            settingsPanel.querySelector('.rename-group').style.display = 'none';
            settingsPanel.querySelector('#rename-config').value = '';
        });

        // 总结面板配置切换：仅应用配置，不自动触发总结
        summaryPanel.querySelector('.ai-config-select').addEventListener('change', function(e) {
            var configName = e.target.value;
            if (configName && applyConfig(configName)) {
                updateConfigSelectors(settingsPanel, summaryPanel);
            }
        });

        // 初始化下拉框
        updateConfigSelectors(settingsPanel, summaryPanel);

        // === 关于按钮 ===
        settingsPanel.querySelector('.about-btn').addEventListener('click', () => {
            ctx.showAboutModal(aboutModal, aboutOverlay);
        });

        // === 关于弹窗关闭 ===
        aboutOverlay.addEventListener('click', () => {
            aboutModal.style.display = 'none';
            aboutOverlay.style.display = 'none';
        });
        aboutModal.querySelector('.ai-about-close').addEventListener('click', () => {
            aboutModal.style.display = 'none';
            aboutOverlay.style.display = 'none';
        });

        // === 历史总结按钮（设置面板） ===
        settingsPanel.querySelector('.history-btn').addEventListener('click', () => {
            openHistoryModal(historyModal, historyOverlay);
        });

        // === 历史总结按钮（总结面板底部） ===
        summaryPanel.querySelector('.ai-history-summary-btn').addEventListener('click', () => {
            openHistoryModal(historyModal, historyOverlay);
        });

        // === 历史模态框 ===
        historyOverlay.addEventListener('click', () => {
            historyModal.style.display = 'none';
            historyOverlay.style.display = 'none';
        });
        historyModal.querySelector('.ai-history-close').addEventListener('click', () => {
            historyModal.style.display = 'none';
            historyOverlay.style.display = 'none';
        });

        // 列表项点击（选中、打开链接、删除）
        historyModal.querySelector('.ai-history-list').addEventListener('click', (e) => {
            const item = e.target.closest('.ai-history-item');
            if (!item) return;

            // 删除按钮
            const delBtn = e.target.closest('.ai-history-delete-btn');
            if (delBtn) {
                e.stopPropagation();
                ctx.deleteHistory(delBtn.dataset.id);
                ctx.refreshHistoryList(historyModal);
                return;
            }

            // 打开按钮 → 新标签页打开
            const openBtn = e.target.closest('.ai-history-open-btn');
            if (openBtn) {
                e.stopPropagation();
                const history = ctx.getHistory();
                const entry = history.find(h => h.id === item.dataset.id);
                if (entry && entry.url) {
                    window.open(entry.url, '_blank');
                }
                return;
            }

            // 默认：选中并显示内容
            historyModal.querySelectorAll('.ai-history-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            const id = item.dataset.id;
            const history = ctx.getHistory();
            const entry = history.find(h => h.id === id);
            ctx.showHistoryContent(historyModal, entry);
        });
    }

    function openHistoryModal(modal, overlay) {
        modal.style.display = 'flex';
        overlay.style.display = 'block';
        ctx.refreshHistoryList(modal);
    }

    function openSummaryPanel(panel) {
        panel.style.display = 'flex';
        panel.classList.add('visible');
        panel.classList.remove('collapsed');
        // 切换到收起图标
        const collapseBtn = panel.querySelector('.ai-panel-collapse');
        if (collapseBtn) {
            collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
            collapseBtn.title = '收起面板';
        }
    }

    function closeSummaryPanel(panel) {
        panel.style.display = 'none';
        panel.classList.remove('visible', 'loading', 'has-content', 'collapsed');
    }

    function toggleCollapse(panel) {
        if (panel.classList.contains('collapsed')) {
            // 展开
            panel.classList.remove('collapsed');
            const collapseBtn = panel.querySelector('.ai-panel-collapse');
            collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
            collapseBtn.title = '收起面板';
            // 展开后更新位置以防止溢出
            clampPanelPosition(panel);
        } else {
            // 收起
            panel.classList.add('collapsed');
            const collapseBtn = panel.querySelector('.ai-panel-collapse');
            collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            collapseBtn.title = '展开面板';
        }
    }

    function clampPanelPosition(panel) {
        const rect = panel.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        const currentLeft = parseInt(panel.style.left) || rect.left;
        const currentTop = parseInt(panel.style.top) || rect.top;
        if (currentLeft < 0) panel.style.left = '0px';
        if (currentLeft > maxX) panel.style.left = maxX + 'px';
        if (currentTop < 0) panel.style.top = '0px';
        if (currentTop > maxY) panel.style.top = maxY + 'px';
    }

    function initPanelDrag(panel) {
        const header = panel.querySelector('.ai-panel-header');
        let isDragging = false, startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            // 不拦截按钮点击
            if (e.target.closest('button')) return;
            isDragging = true;
            header.classList.add('dragging');
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            // 将 transform 转为 left/top
            panel.style.transform = 'none';
            panel.style.left = startLeft + 'px';
            panel.style.top = startTop + 'px';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;
            const panelWidth = panel.offsetWidth;
            const panelHeight = panel.offsetHeight;
            const maxX = window.innerWidth - panelWidth;
            const maxY = window.innerHeight - panelHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            header.classList.remove('dragging');
            document.body.style.userSelect = '';
        });
    }

    function initEdgeResize(panel) {
        const leftHandle = panel.querySelector('.ai-panel-resize-left');
        const rightHandle = panel.querySelector('.ai-panel-resize-right');
        let isResizing = false, edge, startX, startWidth, startLeft;

        function onMouseDown(e, whichEdge) {
            isResizing = true;
            edge = whichEdge;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            startLeft = panel.getBoundingClientRect().left;
            panel.style.transform = 'none';
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
            e.preventDefault();
            e.stopPropagation();
        }

        leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
        rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            let newWidth;
            if (edge === 'right') {
                newWidth = startWidth + dx;
            } else {
                newWidth = startWidth - dx;
            }
            newWidth = Math.max(280, Math.min(newWidth, window.innerWidth * 0.6));
            panel.style.width = newWidth + 'px';
            if (edge === 'left') {
                const newLeft = startLeft + (startWidth - newWidth);
                panel.style.left = Math.max(0, newLeft) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        });
    }

    function startLoading(panel) {
        panel.classList.add('loading');
        panel.classList.remove('has-content');
        const title = panel.querySelector('.ai-panel-title');
        if (title) title.textContent = '正在总结网页...';
    }

    function formatTokenCount(n) {
        if (n >= 1000) {
            var k = n / 1000;
            return k >= 100 ? k.toFixed(0) + 'k' : k.toFixed(1) + 'k';
        }
        return String(n);
    }

    function finishLoading(panel, inputTokens, outputTokens) {
        panel.classList.remove('loading');
        panel.classList.add('has-content');
        const title = panel.querySelector('.ai-panel-title');
        if (title) {
            if (inputTokens != null) {
                var inp = formatTokenCount(inputTokens);
                var out = formatTokenCount(outputTokens);
                title.innerHTML = '网页总结 <span class="ai-token-info">\u2191 ' + inp + ' tokens &nbsp; \u2193 ' + out + ' tokens</span>';
            } else {
                title.textContent = '网页总结';
            }
        }
    }

    function populateFormFromConfig(panel, config) {
        panel.querySelector('#api-url').value = config.API_URL;
        panel.querySelector('#api-key').value = config.API_KEY;
        panel.querySelector('#max-tokens').value = config.MAX_TOKENS;
        panel.querySelector('#prompt').value = config.PROMPT;
        panel.querySelector('#model').value = config.MODEL;
    }

    function refreshSettingsPanelValues(panel) {
        populateFormFromConfig(panel, ctx.CONFIG);
    }

    ctx.initializeEvents = initializeEvents;
})();


(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    async function summarizeContent(content, shadow, contentContainer) {
        const CONFIG = ctx.CONFIG;
        const typeWriter = ctx.typeWriter;

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

            const requestPromise = new Promise((resolve, reject) => {
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


(function() {
    'use strict';

    // 不在 iframe 内运行
    if (window.self !== window.top) return;

    const ctx = window.__AI_SUMMARY__;

    // 1. 加载配置
    ctx.loadConfig();

    // 2. 创建元素
    const elements = ctx.createElements();

    // 3. 创建历史面板
    const historyEls = ctx.createHistoryPanel(elements.shadow);
    elements.historyModal = historyEls.modal;
    elements.historyOverlay = historyEls.overlay;

    // 4. 初始化事件
    ctx.initializeEvents(elements);

    // 5. 检查配置是否完整 - 不再弹出自动设置面板，
    //    而是让用户点总结按钮时提示配置
})();