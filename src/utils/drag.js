(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    const HIDE_THRESHOLD = 20;    // 靠近边缘多少像素触发隐藏
    const ANIM_DURATION = 300;     // 移出动画时长(ms)
    const DEFAULT_MARGIN_RIGHT = 20;     // 默认右下角边距(px)
    const DEFAULT_MARGIN_BOTTOM = 40;     // 默认右下角边距(px)


    // ===== 初始化位置（始终右下角） =====
    function initPosition(container) {
        container.style.right = DEFAULT_MARGIN_RIGHT + 'px';
        container.style.bottom = DEFAULT_MARGIN_BOTTOM + 'px';
        container.style.left = 'auto';
        container.style.top = 'auto';
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
        container.style.bottom = 'auto';
        requestAnimationFrame(function() {
            container.style.opacity = '1';
        });
        container.dataset.hideSide = '';
    }

    // ===== 拖拽初始化 =====
    function initializeDrag(container, dragHandle, shadow) {
        var isDragging = false, startX, startY, offsetX, offsetY, nearSide = '';
        var containerW, containerH, btnSpan, pendingFrame;

        var sheet = new CSSStyleSheet();
        sheet.replaceSync(`/* CSS_DRAG_PLACEHOLDER */`);
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];

        initPosition(container);

        dragHandle.style.touchAction = 'none';

        function onPointerDown(e) {
            if (container.classList.contains('hidden')) {
                restoreContainer(container);
                return;
            }
            isDragging = true;
            dragHandle.setPointerCapture(e.pointerId);
            var rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            startX = rect.left;
            startY = rect.top;
            containerW = container.offsetWidth;
            containerH = container.offsetHeight;
            btnSpan = container.querySelector('.ai-summary-btn span');
            container.style.transition = 'none';
            container.style.opacity = '1';
            nearSide = '';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            e.preventDefault();

            var nx = e.clientX - offsetX;
            var ny = e.clientY - offsetY;
            nx = Math.max(0, Math.min(nx, window.innerWidth - containerW));
            ny = Math.max(0, Math.min(ny, window.innerHeight - containerH));
            startX = nx;
            startY = ny;

            if (nx < HIDE_THRESHOLD) {
                nearSide = 'left';
            } else if (nx + containerW > window.innerWidth - HIDE_THRESHOLD) {
                nearSide = 'right';
            } else {
                nearSide = '';
            }

            // 写操作合并在一个 rAF 中，避免每次 pointermove 都强制 reflow
            if (pendingFrame) return;
            pendingFrame = requestAnimationFrame(function() {
                pendingFrame = null;
                if (!isDragging) return;
                if (nearSide) {
                    container.style.opacity = '0.45';
                    container.classList.add('near-edge');
                    if (btnSpan) btnSpan.textContent = '松手隐藏';
                } else {
                    container.style.opacity = '1';
                    container.classList.remove('near-edge');
                    if (btnSpan) btnSpan.textContent = '总结网页';
                }
                container.style.right = (window.innerWidth - startX - containerW) + 'px';
                container.style.bottom = (window.innerHeight - startY - containerH) + 'px';
                container.style.left = 'auto';
                container.style.top = 'auto';
            });
        }

        function endDrag() {
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
            }
            nearSide = '';
        }

        // 核心：使用 pointer 事件 + setPointerCapture
        // pointerup/pointercancel 后浏览器自动释放捕获，无需手动 releasePointerCapture
        dragHandle.addEventListener('pointerdown', onPointerDown);
        dragHandle.addEventListener('pointermove', onPointerMove);
        dragHandle.addEventListener('pointerup', endDrag);
        dragHandle.addEventListener('pointercancel', endDrag);

        // 窗口尺寸变化时以 right/bottom 为基准保持按钮在视口内
        window.addEventListener('resize', function() {
            if (container.classList.contains('hidden')) return;
            var w = container.offsetWidth;
            var h = container.offsetHeight;
            var r = parseInt(container.style.right);
            var b = parseInt(container.style.bottom);
            if (!isNaN(r)) {
                r = Math.max(0, Math.min(r, window.innerWidth - w));
                container.style.right = r + 'px';
            }
            if (!isNaN(b)) {
                b = Math.max(0, Math.min(b, window.innerHeight - h));
                container.style.bottom = b + 'px';
            }
            // 实测发现，将窗口挤压到0高度后再放大，按钮的bottom位置为0。但是无所谓了很少有人这样，后果也不严重。
        });
    }

    ctx.initializeDrag = initializeDrag;
})();
