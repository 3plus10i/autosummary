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

        var sheet = new CSSStyleSheet();
        sheet.replaceSync(`/* CSS_DRAG_PLACEHOLDER */`);
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];

        loadPosition(container);

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
            container.style.transition = 'none';
            container.style.opacity = '1';
            nearSide = '';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            var w = container.offsetWidth;
            var h = container.offsetHeight;

            if (e.clientX < HIDE_THRESHOLD) {
                nearSide = 'left';
            } else if (e.clientX > window.innerWidth - HIDE_THRESHOLD) {
                nearSide = 'right';
            } else {
                nearSide = '';
            }

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

            var nx = e.clientX - offsetX;
            var ny = e.clientY - offsetY;
            nx = Math.max(0, Math.min(nx, window.innerWidth - w));
            ny = Math.max(0, Math.min(ny, window.innerHeight - h));
            container.style.left = nx + 'px';
            container.style.top = ny + 'px';
            container.style.right = 'auto';
            startX = nx;
            startY = ny;
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
                savePosition(container);
            }
            nearSide = '';
        }

        // 核心：使用 pointer 事件 + setPointerCapture
        // pointerup/pointercancel 后浏览器自动释放捕获，无需手动 releasePointerCapture
        dragHandle.addEventListener('pointerdown', onPointerDown);
        dragHandle.addEventListener('pointermove', onPointerMove);
        dragHandle.addEventListener('pointerup', endDrag);
        dragHandle.addEventListener('pointercancel', endDrag);

        // 窗口尺寸变化时恢复位置
        window.addEventListener('resize', function() {
            if (!container.classList.contains('hidden')) {
                loadPosition(container);
            }
        });
    }

    ctx.initializeDrag = initializeDrag;
})();
