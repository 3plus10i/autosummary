(function() {
    'use strict';

    const ctx = window.__AI_SUMMARY__;

    function validateShortcut(shortcut) {
        const regex = /^((Ctrl|Alt|Shift|Meta|Option)\+)*[A-Za-z]$/;
        return regex.test(shortcut);
    }

    function isShortcutPressed(event, shortcut) {
        const keys = shortcut.split('+');
        let ctrl = false, alt = false, shift = false, meta = false, key = null;
        keys.forEach(k => {
            const lower = k.toLowerCase();
            if (lower === 'ctrl') ctrl = true;
            if (lower === 'alt' || lower === 'option') alt = true;
            if (lower === 'shift') shift = true;
            if (lower === 'meta') meta = true;
            if (lower.length === 1 && /^[a-z]$/.test(lower)) key = lower;
        });
        if (key && event.key.toLowerCase() === key) {
            return event.ctrlKey === ctrl && event.altKey === alt &&
                   event.shiftKey === shift && event.metaKey === meta;
        }
        return false;
    }

    function getSystemShortcutDisplay(shortcut) {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if (!isMac) return shortcut;
        return shortcut.replace(/Alt\+/g, 'Option+').replace(/Ctrl\+/g, '⌘+').replace(/Meta\+/g, '⌘+');
    }

    ctx.validateShortcut = validateShortcut;
    ctx.isShortcutPressed = isShortcutPressed;
    ctx.getSystemShortcutDisplay = getSystemShortcutDisplay;
})();
