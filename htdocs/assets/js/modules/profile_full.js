/* --------------------------- Модуль profile-full --------------------------- */

class ProfileFullComponent {
    constructor() {
        this.root = null;
        this.avatar = null;
        this.actions = null;
        this.zoomOverlay = null;
        this.zoomImage = null;
        this.zoomScale = 1;
        this.zoomHideTimer = null;
        this.zoomBaseWidth = 0;
        this.zoomBaseHeight = 0;
        this.zoomResizeHandler = null;
        this.zoomDragMoveHandler = null;
        this.zoomDragEndHandler = null;
        this.zoomDragging = false;
        this.zoomDragStartX = 0;
        this.zoomDragStartY = 0;
        this.zoomPanX = 0;
        this.zoomPanY = 0;
        this.zoomStartPanX = 0;
        this.zoomStartPanY = 0;
        this.clickHandler = null;
    }

    init() {
        this.root = document.querySelector('[data-component="profile-full"]');
        if (!this.root) return;

        this.avatar = this.root.querySelector('[data-profile-full-avatar]');
        this.actions = this.root.querySelector('.profile-full__actions');
        this.renderActionLine();
        this.initSvgIcons();
        this.bindActions();
    }

    initSvgIcons(scope = this.root) {
        scope.querySelectorAll('[data-svg-src]').forEach((node) => {
            const src = node.getAttribute('data-svg-src');
            if (src) {
                App.utils.loadSVG(src, node);
            }
        });
    }

    bindActions() {
        this.clickHandler = (event) => {
            const button = event.target.closest('[data-action]');
            if (!button || button.disabled || !this.root.contains(button)) return;

            const action = button.dataset.action;
            if (action === 'back') {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    App.nav.navigate('/', { pushUrl: true });
                }
                return;
            }

            if (action === 'maximize-avatar') {
                event.preventDefault();
                this.openZoomOverlay();
                return;
            }

            if (action === 'profile-subscribe') {
                event.preventDefault();
                if (!this.isViewerAuthorized()) {
                    this.notifyAuthRequired();
                    return;
                }
                this.subscribeToProfile();
                return;
            }

            if (action === 'profile-unsubscribe') {
                event.preventDefault();
                this.unsubscribeFromProfile();
                return;
            }

            if (action === 'profile-report') {
                event.preventDefault();
                if (!this.isViewerAuthorized()) {
                    this.notifyAuthRequired();
                    return;
                }
                this.openReportOverlay(button);
                return;
            }

            if (action === 'profile-bell') {
                event.preventDefault();
                void this.toggleBellButton(button);
                return;
            }

            if (action === 'profile-block') {
                event.preventDefault();
                if (!this.isViewerAuthorized()) {
                    this.notifyAuthRequired();
                    return;
                }
                void this.toggleBlockButton(button);
                return;
            }

            if (action === 'profile-message') {
                event.preventDefault();
                this.openFooterChat();
            }
        };

        this.root.addEventListener('click', this.clickHandler);
    }


    openFooterChat() {
        if (!this.actions) return;
        const user = {
            id: Number(this.actions.dataset.profileUserId || 0),
            username: String(this.actions.dataset.profileUsername || '').trim()
        };
        const footer = App.components?.['footer_lo.js'];
        if (footer?.openChatFromProfile) {
            footer.openChatFromProfile(user);
            return;
        }
        document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Меню сообщений недоступно' } }));
    }

    renderActionLine(state = null) {
        if (!this.actions) return;

        const nextState = state || this.actions.dataset.actionState || 'default';
        this.actions.dataset.actionState = nextState;

        const notificationsEnabled = this.actions.dataset.notificationsEnabled === 'true';
        const profileBlocked = this.actions.dataset.profileBlocked === 'true';
        const bellIcon = notificationsEnabled ? '/assets/images/icons/bell-fill.svg' : '/assets/images/icons/bell.svg';
        const blockIcon = profileBlocked ? '/assets/images/icons/block-fill.svg' : '/assets/images/icons/block.svg';
        const bellActiveClass = notificationsEnabled ? ' is-active' : '';
        const blockActiveClass = profileBlocked ? ' is-active' : '';
        const bellPressed = notificationsEnabled ? 'true' : 'false';
        const blockPressed = profileBlocked ? 'true' : 'false';

        const templates = {
            default: `
                <button class="profile-full__button profile-full__button--subscribe" type="button" data-action="profile-subscribe">Подписаться</button>
                <button class="profile-full__icon-button profile-full__icon-button--block${blockActiveClass}" type="button" data-action="profile-block" aria-label="Заблокировать пользователя" aria-pressed="${blockPressed}">
                    <span class="profile-full__meta-icon" data-icon="block" data-svg-src="${blockIcon}" aria-hidden="true"></span>
                </button>
                <button class="profile-full__icon-button profile-full__icon-button--report" type="button" data-action="profile-report" aria-label="Пожаловаться">
                    <span class="profile-full__meta-icon" data-icon="report" data-svg-src="/assets/images/icons/L-flag.svg" aria-hidden="true"></span>
                </button>
            `,
            yourself: `
                <button class="profile-full__button profile-full__button--subscribe profile-full__button--self-subscribe" type="button" disabled aria-disabled="true">Подписаться</button>
                <button class="profile-full__icon-button profile-full__icon-button--edit" type="button" data-action="profile-edit" aria-label="Редактировать профиль">
                    <span class="profile-full__meta-icon" data-icon="edit" data-svg-src="/assets/images/icons/L-edit.svg" aria-hidden="true"></span>
                </button>
            `,
            subscribed: `
                <button class="profile-full__button profile-full__button--unsubscribe" type="button" data-action="profile-unsubscribe">Отписаться</button>
                <button class="profile-full__icon-button profile-full__icon-button--bell${bellActiveClass}" type="button" data-action="profile-bell" aria-label="Уведомления" aria-pressed="${bellPressed}">
                    <span class="profile-full__meta-icon" data-icon="bell" data-svg-src="${bellIcon}" aria-hidden="true"></span>
                </button>
                <button class="profile-full__icon-button profile-full__icon-button--report" type="button" data-action="profile-report" aria-label="Пожаловаться">
                    <span class="profile-full__meta-icon" data-icon="report" data-svg-src="/assets/images/icons/L-flag.svg" aria-hidden="true"></span>
                </button>
            `,
            friends: `
                <button class="profile-full__button profile-full__button--message" type="button" data-action="profile-message">Сообщение</button>
                <div class="profile-full__friends-actions">
                    <button class="profile-full__button profile-full__button--unsubscribe" type="button" data-action="profile-unsubscribe">Отписаться</button>
                    <button class="profile-full__icon-button profile-full__icon-button--bell${bellActiveClass}" type="button" data-action="profile-bell" aria-label="Уведомления" aria-pressed="${bellPressed}">
                        <span class="profile-full__meta-icon" data-icon="bell" data-svg-src="${bellIcon}" aria-hidden="true"></span>
                    </button>
                    <button class="profile-full__icon-button profile-full__icon-button--report" type="button" data-action="profile-report" aria-label="Пожаловаться">
                        <span class="profile-full__meta-icon" data-icon="report" data-svg-src="/assets/images/icons/L-flag.svg" aria-hidden="true"></span>
                    </button>
                </div>
            `
        };

        this.actions.innerHTML = templates[nextState] || templates.default;
        this.initSvgIcons(this.actions);
    }

    isViewerAuthorized() {
        return this.actions?.dataset.viewerAuthorized === 'true';
    }

    notifyAuthRequired() {
        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message: 'Для этого действия требуется авторизация' }
        }));
    }

    async subscribeToProfile() {
        if (!this.actions) return;

        const userId = Number(this.actions.dataset.profileUserId || 0);
        const username = String(this.actions.dataset.profileUsername || '').trim();
        if (!userId) return;

        const button = this.actions.querySelector('[data-action="profile-subscribe"]');
        if (button) button.disabled = true;

        try {
            const response = await fetch('/profile/follow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ user_id: String(userId) }).toString()
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось подписаться.');
            }

            const nextState = payload.state === 'friends' ? 'friends' : 'subscribed';
            this.renderActionLine(nextState);
            this.showSubscribeToast(username || payload.username || '', nextState);
        } catch (error) {
            document.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: error?.message || 'Ошибка при подписке.' }
            }));
        } finally {
            if (button) button.disabled = false;
        }
    }

    async unsubscribeFromProfile() {
        if (!this.actions) return;

        const userId = Number(this.actions.dataset.profileUserId || 0);
        const username = String(this.actions.dataset.profileUsername || '').trim();
        if (!userId) return;

        const button = this.actions.querySelector('[data-action="profile-unsubscribe"]');
        if (button) button.disabled = true;

        try {
            const response = await fetch('/profile/unfollow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ user_id: String(userId) }).toString()
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось отписаться.');
            }

            this.actions.dataset.notificationsEnabled = 'false';
            this.renderActionLine('default');
            this.showUnsubscribeToast(username || payload.username || '');
        } catch (error) {
            document.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: error?.message || 'Ошибка при отписке.' }
            }));
        } finally {
            if (button) button.disabled = false;
        }
    }

    showUnsubscribeToast(username) {
        const normalizedUsername = String(username || '').replace(/^@/, '');
        const nickname = normalizedUsername ? `@${normalizedUsername}` : '@user';

        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: {
                html: `${this.escapeHtml('Вы отписались от ')}<span class="toast-stack__accent">${this.escapeHtml(nickname)}</span>`
            }
        }));
    }

    openReportOverlay(reportButton) {
        if (!this.actions) return;
        if (!this.isViewerAuthorized()) {
            this.notifyAuthRequired();
            return;
        }

        App.warn?.open({
            title: 'Подать жалобу на пользователя?',
            description: 'После отправки жалобы профиль будет проверен модерацией на несоответствие правилам площадки.',
            confirmLabel: 'Пожаловаться',
            cancelLabel: 'Назад',
            onConfirm: async () => {
                await this.submitProfileReport(reportButton);
            }
        });
    }

    async submitProfileReport(reportButton) {
        if (!this.actions) return;

        const userId = Number(this.actions.dataset.profileUserId || 0);
        if (!userId || !reportButton) return;

        reportButton.disabled = true;

        try {
            const response = await fetch('/profile/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ user_id: String(userId) }).toString()
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                document.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: payload?.error || 'Не удалось отправить жалобу.' }
                }));
                return;
            }

            document.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: payload.already_reported ? 'Жалоба на рассмотрении' : 'Жалоба отправлена' }
            }));
        } catch (error) {
            console.warn('Unable to report profile from profile-full', error);
            document.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Не удалось отправить жалобу.' }
            }));
        } finally {
            reportButton.disabled = false;
        }
    }

    showSubscribeToast(username, state) {
        const normalizedUsername = String(username || '').replace(/^@/, '');
        const nickname = normalizedUsername ? `@${normalizedUsername}` : '@user';
        const prefix = state === 'friends' ? 'Теперь вы с ' : 'Вы подписались на ';
        const suffix = state === 'friends' ? ' друзья' : '';

        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: {
                html: `${this.escapeHtml(prefix)}<span class="toast-stack__accent">${this.escapeHtml(nickname)}</span>${this.escapeHtml(suffix)}`
            }
        }));
    }

    escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[char]));
    }

    async toggleBellButton(button) {
        if (!this.actions) return;

        const isActive = !button.classList.contains('is-active');
        const userId = Number(this.actions.dataset.profileUserId || 0);
        if (!userId) return;

        button.disabled = true;
        try {
            const response = await fetch('/profile/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    user_id: String(userId),
                    enabled: isActive ? 'true' : 'false'
                }).toString()
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось обновить уведомления.');
            }

            this.actions.dataset.notificationsEnabled = payload.enabled ? 'true' : 'false';
            this.syncIconToggle(button, 'bell', payload.enabled, '/assets/images/icons/bell.svg', '/assets/images/icons/bell-fill.svg');
        } catch (error) {
            document.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: error?.message || 'Ошибка при обновлении уведомлений.' }
            }));
        } finally {
            button.disabled = false;
        }
    }

    async toggleBlockButton(button) {
        if (!this.actions) return;

        const isActive = !button.classList.contains('is-active');
        const userId = Number(this.actions.dataset.profileUserId || 0);
        const username = String(this.actions.dataset.profileUsername || '').trim();
        if (!userId) return;

        button.disabled = true;
        try {
            const response = await fetch('/profile/block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    user_id: String(userId),
                    blocked: isActive ? 'true' : 'false'
                }).toString()
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось обновить блокировку.');
            }

            this.actions.dataset.profileBlocked = payload.blocked ? 'true' : 'false';
            this.syncIconToggle(button, 'block', payload.blocked, '/assets/images/icons/block.svg', '/assets/images/icons/block-fill.svg');
            this.showBlockToast(username || payload.username || '', payload.blocked);
        } catch (error) {
            document.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: error?.message || 'Ошибка при обновлении блокировки.' }
            }));
        } finally {
            button.disabled = false;
        }
    }

    syncIconToggle(button, iconName, isActive, inactiveIcon, activeIcon) {
        const icon = button.querySelector(`[data-icon="${iconName}"]`);
        const nextIcon = isActive ? activeIcon : inactiveIcon;

        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        if (icon) {
            icon.setAttribute('data-svg-src', nextIcon);
            App.utils.loadSVG(nextIcon, icon);
        }
    }

    showBlockToast(username, isBlocked) {
        const normalizedUsername = String(username || '').replace(/^@/, '');
        const nickname = normalizedUsername ? `@${normalizedUsername}` : '@user';
        const prefix = isBlocked ? 'Вы заблокировали ' : 'Вы разблокировали ';

        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: {
                html: `${this.escapeHtml(prefix)}<span class="toast-stack__accent">${this.escapeHtml(nickname)}</span>`
            }
        }));
    }

    openZoomOverlay() {
        if (this.zoomOverlay || !this.avatar) return;

        const imageSrc = this.avatar.dataset.zoomSrc || '';
        if (!imageSrc) return;

        this.zoomScale = 1;
        this.zoomPanX = 0;
        this.zoomPanY = 0;

        const overlay = document.createElement('div');
        overlay.className = 'post-full-zoom post-full-zoom--hidden';

        const content = document.createElement('div');
        content.className = 'post-full-zoom__content';

        const image = document.createElement('img');
        image.className = 'post-full-zoom__image';
        image.src = imageSrc;
        image.alt = 'Аватар пользователя';

        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'post-full__action-button post-full-zoom__minimize';
        minimizeButton.type = 'button';
        minimizeButton.setAttribute('aria-label', 'Свернуть');

        const minimizeIcon = document.createElement('span');
        minimizeIcon.className = 'post-full__action-icon';
        minimizeIcon.setAttribute('aria-hidden', 'true');
        App.utils.loadSVG('/assets/images/icons/minimize.svg', minimizeIcon);

        minimizeButton.appendChild(minimizeIcon);
        content.appendChild(image);
        content.appendChild(minimizeButton);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        App.utils.lockBodyScroll();

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.closeZoomOverlay();
            }
        });

        minimizeButton.addEventListener('click', () => {
            this.closeZoomOverlay();
        });

        overlay.addEventListener('wheel', (event) => {
            if (!event.ctrlKey) return;
            event.preventDefault();

            const nextScale = this.zoomScale + (event.deltaY < 0 ? 0.1 : -0.1);
            this.setZoomScale(nextScale);
        }, { passive: false });

        this.zoomOverlay = overlay;
        this.zoomImage = image;
        this.zoomResizeHandler = () => {
            this.calculateZoomBaseSize();
            this.clampZoomPan();
            this.applyZoomTransform();
        };
        this.zoomDragMoveHandler = (event) => {
            if (!this.zoomOverlay || !this.zoomDragging) return;

            this.zoomPanX = this.zoomStartPanX + (event.clientX - this.zoomDragStartX);
            this.zoomPanY = this.zoomStartPanY + (event.clientY - this.zoomDragStartY);
            this.clampZoomPan();
            this.applyZoomTransform();
        };
        this.zoomDragEndHandler = () => {
            if (!this.zoomOverlay || !this.zoomDragging) return;
            this.zoomDragging = false;
            this.zoomOverlay.classList.remove('is-dragging');
        };

        image.addEventListener('load', () => {
            this.calculateZoomBaseSize();
            this.zoomPanX = 0;
            this.zoomPanY = 0;
            this.applyZoomTransform();
        }, { once: true });

        if (image.complete) {
            this.calculateZoomBaseSize();
            this.zoomPanX = 0;
            this.zoomPanY = 0;
            this.applyZoomTransform();
        }

        overlay.addEventListener('mousedown', (event) => {
            if (event.button !== 0 || !this.zoomOverlay || this.zoomScale <= 1) return;
            if (event.target.closest('.post-full-zoom__minimize')) return;

            this.zoomDragging = true;
            this.zoomDragStartX = event.clientX;
            this.zoomDragStartY = event.clientY;
            this.zoomStartPanX = this.zoomPanX;
            this.zoomStartPanY = this.zoomPanY;
            this.zoomOverlay.classList.add('is-dragging');
            event.preventDefault();
        });

        window.addEventListener('mousemove', this.zoomDragMoveHandler);
        window.addEventListener('mouseup', this.zoomDragEndHandler);
        window.addEventListener('resize', this.zoomResizeHandler);

        void overlay.offsetWidth;
        window.setTimeout(() => {
            overlay.classList.remove('post-full-zoom--hidden');
        }, 10);
    }

    closeZoomOverlay() {
        if (!this.zoomOverlay) return;

        const overlay = this.zoomOverlay;
        overlay.classList.add('post-full-zoom--hidden');

        clearTimeout(this.zoomHideTimer);
        this.zoomHideTimer = setTimeout(() => {
            if (this.zoomResizeHandler) {
                window.removeEventListener('resize', this.zoomResizeHandler);
            }
            if (this.zoomDragMoveHandler) {
                window.removeEventListener('mousemove', this.zoomDragMoveHandler);
            }
            if (this.zoomDragEndHandler) {
                window.removeEventListener('mouseup', this.zoomDragEndHandler);
            }

            this.zoomDragging = false;
            App.utils.unlockBodyScroll();
            overlay.remove();

            if (this.zoomOverlay === overlay) {
                this.zoomOverlay = null;
                this.zoomImage = null;
                this.zoomScale = 1;
                this.zoomBaseWidth = 0;
                this.zoomBaseHeight = 0;
                this.zoomPanX = 0;
                this.zoomPanY = 0;
                this.zoomResizeHandler = null;
                this.zoomDragMoveHandler = null;
                this.zoomDragEndHandler = null;
            }
        }, 200);
    }

    calculateZoomBaseSize() {
        if (!this.zoomImage) return;

        const naturalWidth = this.zoomImage.naturalWidth || 0;
        const naturalHeight = this.zoomImage.naturalHeight || 0;
        if (naturalWidth <= 0 || naturalHeight <= 0) return;

        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;
        const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);

        this.zoomBaseWidth = Math.max(1, Math.round(naturalWidth * ratio));
        this.zoomBaseHeight = Math.max(1, Math.round(naturalHeight * ratio));

        this.zoomImage.style.width = `${this.zoomBaseWidth}px`;
        this.zoomImage.style.height = `${this.zoomBaseHeight}px`;
    }

    setZoomScale(nextScale) {
        const clampedScale = Math.min(3, Math.max(0.5, Number(nextScale.toFixed(2))));
        if (Math.abs(clampedScale - this.zoomScale) < 0.001) return;

        this.zoomScale = clampedScale;
        this.zoomPanX = 0;
        this.zoomPanY = 0;

        this.clampZoomPan();
        this.applyZoomTransform();
    }

    clampZoomPan() {
        if (!this.zoomOverlay || this.zoomBaseWidth <= 0 || this.zoomBaseHeight <= 0) return;

        const scaledWidth = this.zoomBaseWidth * this.zoomScale;
        const scaledHeight = this.zoomBaseHeight * this.zoomScale;

        const maxOffsetX = Math.max(0, (scaledWidth - window.innerWidth) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - window.innerHeight) / 2);

        this.zoomPanX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.zoomPanX));
        this.zoomPanY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.zoomPanY));
    }

    applyZoomTransform() {
        if (!this.zoomImage || !this.zoomOverlay) return;

        this.zoomImage.style.transform = `translate3d(${Math.round(this.zoomPanX)}px, ${Math.round(this.zoomPanY)}px, 0) scale(${this.zoomScale})`;
        this.zoomOverlay.classList.toggle('can-pan', this.zoomScale > 1);
    }

    destroy() {
        if (this.root && this.clickHandler) {
            this.root.removeEventListener('click', this.clickHandler);
        }
        this.closeZoomOverlay();
        clearTimeout(this.zoomHideTimer);
    }
}

App.register('profile_full.js', ProfileFullComponent);
