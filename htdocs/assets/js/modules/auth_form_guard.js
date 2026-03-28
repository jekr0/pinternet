class AuthFormGuardComponent {
    init() {
        const forms = Array.from(document.querySelectorAll('.auth__form'));
        if (forms.length === 0) return;

        forms.forEach((form) => {
            this.bindFieldRestrictions(form);
            this.bindFormValidation(form);
        });
    }

    bindFieldRestrictions(form) {
        const usernameField = form.querySelector('input[name="username"]');
        if (usernameField) {
            usernameField.addEventListener('input', () => {
                const normalized = usernameField.value.replace(/[^a-zа-яё0-9_]/gi, '').slice(0, 12);
                if (normalized !== usernameField.value) {
                    usernameField.value = normalized;
                }
            });
        }
    }

    bindFormValidation(form) {
        form.setAttribute('novalidate', 'novalidate');

        form.addEventListener('submit', (event) => {
            const action = form.querySelector('input[name="action"]')?.value;
            const email = form.querySelector('input[name="email"]')?.value.trim() || '';
            const password = form.querySelector('input[name="password"]')?.value || '';
            const username = form.querySelector('input[name="username"]')?.value.trim() || '';

            if (!email || !password || (action === 'registration' && !username)) {
                event.preventDefault();
                this.showBanner(form, 'Заполните все поля');
                return;
            }

            if (action === 'registration') {
                if (!/^[A-Za-zА-Яа-яЁё0-9_]{3,12}$/u.test(username)) {
                    event.preventDefault();
                    this.showBanner(form, 'Только латиница, кириллица, цифры и "_"');
                    return;
                }

                if (password.length < 6) {
                    event.preventDefault();
                    this.showBanner(form, 'Пароль должен быть не короче 6 символов');
                    return;
                }
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                event.preventDefault();
                this.showBanner(form, 'Некорректный формат почты');
            }
        });
    }

    showBanner(form, message) {
        const container = form.closest('.auth__container');
        if (!container) return;

        let banner = container.querySelector('.auth__error');
        if (!banner) {
            banner = document.createElement('p');
            banner.className = 'auth__error';
            container.insertBefore(banner, form);
        }
        banner.textContent = message;
    }
}

App.register('auth_form_guard.js', AuthFormGuardComponent);
