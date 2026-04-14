/* ----------------------------- Auto god module ------------------------------ */

class AutoGodComponent {
    init() {
        const form = document.querySelector('.auth__form');
        if (!form) return;

        const actionInput = form.querySelector('input[name="action"]');
        if (!actionInput || actionInput.value !== 'registration') return;

        const usernameInput = form.querySelector('input[name="username"]');
        if (!usernameInput) return;

        const applyHint = () => {
            const isAutoGod = (usernameInput.value || '').trim().toLowerCase() === 'jekro';
            usernameInput.dataset.autoGod = isAutoGod ? '1' : '0';
        };

        usernameInput.addEventListener('input', applyHint);
        applyHint();
    }
}

App.register('auto-god.js', AutoGodComponent);
