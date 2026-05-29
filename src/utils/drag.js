(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    const DOCK_POSITIONS = { LEFT: 'left', RIGHT: 'right', NONE: 'none' };
    const DEBOUNCE_TIME = 10;
    const FOLD_DELAY = 1000;
    const DOCK_THRESHOLD = 100;

    function savePosition(container) {
        const position = {
            left: container.style.left,
            top: container.style.top,
            right: container.style.right,
            bottom: container.style.bottom,
            dockPosition: container.dataset.dockPosition || DOCK_POSITIONS.NONE,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        GM_setValue('containerPosition', position);
    }

    function loadPosition(container) {
        const savedPosition = GM_getValue('containerPosition');
        if (!savedPosition) return;
        const currentWindowRatio = window.innerWidth / savedPosition.windowWidth;
        const heightRatio = window.innerHeight / (savedPosition.windowHeight || window.innerHeight);
        if (savedPosition.dockPosition === DOCK_POSITIONS.LEFT) {
            dockToLeft(container);
        } else if (savedPosition.dockPosition === DOCK_POSITIONS.RIGHT) {
            dockToRight(container);
        } else {
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const left = parseInt(savedPosition.left) * currentWindowRatio;
            const maxLeft = window.innerWidth - containerWidth;
            const safeLeft = Math.max(0, Math.min(left, maxLeft));
            const rawTop = parseInt(savedPosition.top);
            let safeTop;
            if (rawTop * heightRatio > window.innerHeight - containerHeight) {
                safeTop = window.innerHeight - containerHeight - 20;
            } else {
                safeTop = Math.max(0, Math.min(rawTop * heightRatio, window.innerHeight - containerHeight));
            }
            container.style.left = safeLeft + 'px';
            container.style.top = safeTop + 'px';
            container.style.right = 'auto';
            container.style.bottom = 'auto';
        }
    }

    function dockToLeft(container) {
        container.classList.add('docked', 'left-dock');
        container.dataset.dockPosition = DOCK_POSITIONS.LEFT;
        container.style.left = '0';
        container.style.right = 'auto';
    }

    function dockToRight(container) {
        container.classList.add('docked', 'right-dock');
        container.dataset.dockPosition = DOCK_POSITIONS.RIGHT;
        container.style.right = '0';
        container.style.left = 'auto';
    }

    function initializeDrag(container, dragHandle, shadow) {
        let isDragging = false, currentX, currentY, initialX, initialY, foldTimeout;

        const style = document.createElement('style');
        style.textContent = `/* CSS_DRAG_PLACEHOLDER */`;
        shadow.appendChild(style);

        container.addEventListener('mouseenter', () => {
            clearTimeout(foldTimeout);
            if (container.classList.contains('docked')) {
                container.classList.add('show-btn');
            }
        });

        container.addEventListener('mouseleave', () => {
            if (container.classList.contains('docked')) {
                foldTimeout = setTimeout(() => {
                    container.classList.remove('show-btn');
                }, FOLD_DELAY);
            }
        });

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => { clearTimeout(timeout); func(...args); };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        loadPosition(container);

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            if (container.classList.contains('right-dock')) {
                currentX = window.innerWidth - container.offsetWidth;
            } else if (container.classList.contains('left-dock')) {
                currentX = 0;
            } else {
                currentX = rect.left;
            }
            currentY = rect.top;
            container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');
            container.dataset.dockPosition = DOCK_POSITIONS.NONE;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const newX = e.clientX - initialX;
            const newY = e.clientY - initialY;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            if (e.clientX < DOCK_THRESHOLD) {
                dockToLeft(container);
                container.classList.add('show-btn');
            } else if (e.clientX > window.innerWidth - DOCK_THRESHOLD) {
                dockToRight(container);
                container.classList.add('show-btn');
            } else {
                const maxX = window.innerWidth - containerWidth;
                const maxY = window.innerHeight - containerHeight;
                currentX = Math.max(0, Math.min(newX, maxX));
                currentY = Math.max(0, Math.min(newY, maxY));
                container.style.left = currentX + 'px';
                container.style.top = currentY + 'px';
                container.style.right = 'auto';
                container.dataset.dockPosition = DOCK_POSITIONS.NONE;
                container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = 'auto';
                savePosition(container);
            }
        });

        const debouncedLoadPosition = debounce(() => { loadPosition(container); }, DEBOUNCE_TIME);
        window.addEventListener('resize', debouncedLoadPosition);
    }

    ctx.initializeDrag = initializeDrag;
})();
