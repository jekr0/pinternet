/* =========================== Переключение видимости пароля ========================== */

class PasswordToggleComponent {
    init() {
        this.buttons = document.querySelectorAll('[data-component="password_toggle"]');
        if (this.buttons.length === 0) return;

        this.buttons.forEach(button => {
            const iconPath = button.dataset.svgSrc;
            if (iconPath) App.utils.loadSVG(iconPath, button);

            button.addEventListener('click', () => this.toggle(button));
        });
    }

    toggle(button) {
        const passwordInput = button.parentElement?.querySelector('input[type="password"], input[type="text"]');
        if (!passwordInput) return;

        const isPasswordHidden = passwordInput.type === 'password';
        passwordInput.type = isPasswordHidden ? 'text' : 'password';

        const openedIcon = button.dataset.openIcon;
        const closedIcon = button.dataset.closedIcon;
        const nextIcon = isPasswordHidden ? openedIcon : closedIcon;

        if (nextIcon) {
            button.dataset.svgSrc = nextIcon;
            App.utils.loadSVG(nextIcon, button);
        }

        button.setAttribute('aria-label', isPasswordHidden ? 'Скрыть пароль' : 'Показать пароль');
    }
}

App.register('password_toggle.js', PasswordToggleComponent);
