/* ----------------------------- Auto god module ------------------------------ */

class AutoGodComponent {
    init() {
        const form = document.querySelector('.auth__form');
        if (!form) return;

        const usernameInput = form.querySelector('input[name="username"]');
        if (!usernameInput) return;

        const applyHint = () => {
            const isRegistration = form.dataset.authMode === 'registration';
            const isAutoGod = isRegistration && (usernameInput.value || '').trim().toLowerCase() === 'jekro';
            usernameInput.dataset.autoGod = isAutoGod ? '1' : '0';
        };

        usernameInput.addEventListener('input', applyHint);
        form.querySelector('[data-component="auth-mode-toggle"]')?.addEventListener('click', () => {
            window.requestAnimationFrame(applyHint);
        });
        applyHint();
    }
}

App.register('auto-god.js', AutoGodComponent);
