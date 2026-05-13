class AuthFormGuardComponent {
    constructor() {
        this.hideTimers = new WeakMap();
        this.fadeTimers = new WeakMap();
    }

    init() {
        const forms = Array.from(document.querySelectorAll('.auth__form'));
        if (forms.length === 0) return;

        forms.forEach((form) => {
            this.bindModeToggle(form);
            this.bindFieldRestrictions(form);
            this.bindFormValidation(form);
            this.autoHideExistingBanner(form);
            this.applyMode(form, form.dataset.authMode === 'registration' ? 'registration' : 'login', false);
        });
    }


    bindModeToggle(form) {
        const toggleButtons = Array.from(form.querySelectorAll('[data-component="auth-mode-toggle"]'));
        if (toggleButtons.length === 0) return;

        toggleButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const nextMode = button.dataset.authModeTarget || 'login';
                if (nextMode === form.dataset.authMode) return;
                this.applyMode(form, nextMode);
            });
        });
    }

    applyMode(form, mode, animate = true) {
        const isRegistration = mode === 'registration';
        const actionInput = form.querySelector('input[name="action"]');
        const usernameField = form.querySelector('input[name="username"]');
        const identityField = form.querySelector('[data-component="auth-identity-input"]');
        const passwordField = form.querySelector('input[name="password"]');
        const submitButton = form.querySelector('[data-component="auth-submit-button"]');
        const modeButtons = Array.from(form.querySelectorAll('[data-component="auth-mode-toggle"]'));
        const previousMode = form.dataset.authMode === 'registration' ? 'registration' : 'login';

        form.dataset.authMode = isRegistration ? 'registration' : 'login';
        form.classList.toggle('auth__form--registration', isRegistration);

        if (actionInput) actionInput.value = isRegistration ? 'registration' : 'login';

        if (usernameField) {
            usernameField.disabled = !isRegistration;
            usernameField.required = isRegistration;
            if (!isRegistration && animate) usernameField.value = '';
        }

        if (identityField) {
            identityField.name = isRegistration ? 'email' : 'login';
            identityField.type = isRegistration ? 'email' : 'text';
            identityField.autocomplete = isRegistration ? 'email' : 'username';
            identityField.placeholder = 'example@gmail.com';
        }

        if (passwordField) {
            passwordField.autocomplete = isRegistration ? 'new-password' : 'current-password';
        }

        if (submitButton) {
            const nextText = isRegistration ? 'Создать аккаунт' : 'Войти';
            const currentTextNode = submitButton.querySelector('.auth__button--submit-text-current');
            const nextTextNode = submitButton.querySelector('.auth__button--submit-text-next');
            const prevMode = form.dataset.previousAuthMode || previousMode;
            const switchingToRegistration = prevMode === 'login' && isRegistration;
            const switchingToLogin = prevMode === 'registration' && !isRegistration;

            if (currentTextNode && nextTextNode && animate && (switchingToRegistration || switchingToLogin)) {
                const switchClass = switchingToRegistration ? 'is-switching-to-registration' : 'is-switching-to-login';
                submitButton.classList.remove('is-switching-to-registration', 'is-switching-to-login');
                nextTextNode.textContent = '';
                nextTextNode.textContent = nextText;
                void submitButton.offsetWidth;
                submitButton.classList.add(switchClass);

                window.setTimeout(() => {
                    currentTextNode.textContent = nextText;
                    nextTextNode.textContent = '';
                    window.requestAnimationFrame(() => {
                        submitButton.classList.remove('is-switching-to-registration', 'is-switching-to-login');
                    });
                }, 200);
            } else if (currentTextNode) {
                currentTextNode.textContent = nextText;
                if (nextTextNode) nextTextNode.textContent = '';
                submitButton.classList.remove('is-switching-to-registration', 'is-switching-to-login');
            } else {
                submitButton.textContent = nextText;
            }
        }
        form.dataset.previousAuthMode = form.dataset.authMode;
        modeButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.authModeTarget === form.dataset.authMode);
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

        form.addEventListener('submit', async (event) => {
            const action = form.querySelector('input[name="action"]')?.value;
            const email = form.querySelector('input[name="email"]')?.value.trim() || '';
            const login = form.querySelector('input[name="login"]')?.value.trim() || '';
            const password = form.querySelector('input[name="password"]')?.value || '';
            const username = form.querySelector('input[name="username"]')?.value.trim() || '';

            if (!password || (action === 'registration' ? (!email || !username) : !login)) {
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

            if (action === 'registration' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                event.preventDefault();
                this.showBanner(form, 'Некорректный формат почты');
                return;
            }

            if (action === 'registration') {
                event.preventDefault();
                const payload = new URLSearchParams({
                    action: 'registration_validate',
                    username,
                    email,
                    password
                });

                try {
                    const response = await fetch('/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                        body: payload.toString()
                    });
                    const data = await response.json();
                    if (!response.ok || !data.success) {
                        this.showBanner(form, data.error || 'Ошибка проверки регистрации');
                        return;
                    }

                    form.submit();
                } catch (error) {
                    this.showBanner(form, 'Ошибка сети. Попробуйте ещё раз');
                }
            }
        });
    }


    autoHideExistingBanner(form) {
        const container = form.closest('.auth__container');
        if (!container) return;

        const banner = container.querySelector('.auth__error');
        if (!banner || !banner.textContent.trim()) return;

        this.startBannerHideTimer(banner);
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
        banner.classList.remove('auth__error--hidden', 'auth__error--fade-out');
        banner.textContent = message;
        this.startBannerHideTimer(banner);
    }

    startBannerHideTimer(banner) {
        const oldFadeTimer = this.fadeTimers.get(banner);
        const oldHideTimer = this.hideTimers.get(banner);

        if (oldFadeTimer) clearTimeout(oldFadeTimer);
        if (oldHideTimer) clearTimeout(oldHideTimer);

        const fadeTimer = setTimeout(() => {
            banner.classList.add('auth__error--fade-out');
        }, 2500);

        const hideTimer = setTimeout(() => {
            banner.classList.add('auth__error--hidden');
            banner.classList.remove('auth__error--fade-out');
            banner.textContent = '';
        }, 3000);

        this.fadeTimers.set(banner, fadeTimer);
        this.hideTimers.set(banner, hideTimer);
    }
}

App.register('auth_form_guard.js', AuthFormGuardComponent);
