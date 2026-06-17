class FooterLayout {
    init() {
        this.menu = document.querySelector('[data-component="footer-menu"]');
        if (!this.menu || this.menu.dataset.bound === '1') return;

        this.menu.dataset.bound = '1';
        this.isPinned = false;
        this.substate = 'home_state';
        this.stateTransitionTimer = null;
        this.collections = [];
        this.toggleButton = this.menu.querySelector('.footer-menu__toggle');
        this.compressButton = this.menu.querySelector('.footer-menu__compress');
        this.pinButton = this.menu.querySelector('.footer-menu__pin');
        this.pinIcon = this.pinButton?.querySelector('[data-svg-src]') || null;
        this.titleNode = this.menu.querySelector('[data-component="footer-menu-title"]');
        this.content = this.menu.querySelector('.footer-menu__content');
        this.authShakeTimer = null;

        this.renderState('home_state', { animate: false });
        this.loadIcons();
        this.bindHandlers();
        this.closeMenu();
    }

    loadIcons() {
        if (!this.menu) return;
        this.menu.querySelectorAll('[data-svg-src]').forEach((icon) => this.loadIcon(icon));
    }

    loadIcon(icon) {
        const src = icon?.getAttribute('data-svg-src');
        if (src) {
            App.utils.loadSVG(src, icon);
        }
    }

    bindHandlers() {
        this.openHandler = (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            this.openMenu();
        };
        this.closeHandler = (event) => {
            event.stopPropagation();
            this.closeMenu();
        };
        this.pinHandler = (event) => {
            event.stopPropagation();
            if (this.substate !== 'home_state') {
                this.renderState('home_state');
                return;
            }
            this.togglePinned();
        };
        this.contentClickHandler = (event) => {
            const button = event.target?.closest?.('[data-footer-menu-action], [data-footer-collection]');
            if (!button || !this.content?.contains(button)) return;
            event.stopPropagation();
            this.handleContentAction(button.dataset.footerMenuAction || '', button);
        };
        this.outsideClickHandler = (event) => {
            if (!this.menu || this.menu.dataset.state !== 'opened' || this.isPinned) return;
            if (this.menu.contains(event.target)) return;
            this.closeMenu();
        };

        this.toggleButton?.addEventListener('click', this.openHandler);
        this.compressButton?.addEventListener('click', this.closeHandler);
        this.pinButton?.addEventListener('click', this.pinHandler);
        this.content?.addEventListener('click', this.contentClickHandler);
        document.addEventListener('click', this.outsideClickHandler);
    }

    openMenu() {
        if (!this.menu) return;
        if (this.menu.dataset.authenticated !== '1') {
            this.showAuthRequired();
            return;
        }

        this.menu.dataset.state = 'opened';
        this.toggleButton?.setAttribute('aria-expanded', 'true');
        this.renderState(this.substate || 'home_state', { animate: false });
    }

    showAuthRequired() {
        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message: 'Для этого действия требуется авторизация' }
        }));

        clearTimeout(this.authShakeTimer);
        this.menu.classList.remove('is-auth-required-shake');
        void this.menu.offsetWidth;
        this.menu.classList.add('is-auth-required-shake');
        this.authShakeTimer = setTimeout(() => {
            this.menu.classList.remove('is-auth-required-shake');
            this.authShakeTimer = null;
        }, 1000);
    }

    closeMenu() {
        if (!this.menu) return;
        this.menu.dataset.state = 'closed';
        this.toggleButton?.setAttribute('aria-expanded', 'false');
    }

    closeAfterAction() {
        if (!this.isPinned) {
            this.closeMenu();
        }
    }

    handleContentAction(action, button) {
        if (action === 'profile') {
            this.closeAfterAction();
            if (App.nav?.navigate) {
                App.nav.navigate('/profile');
                return;
            }
            window.location.href = '/profile';
            return;
        }

        if (['messages', 'notifications', 'friends', 'collections'].includes(action)) {
            this.renderState(`${action}_state`);
            return;
        }

        if (button?.dataset.footerCollection) {
            return;
        }

        if (action === 'create-post') {
            this.closeAfterAction();
            document.dispatchEvent(new CustomEvent('post-modal:open'));
        }
    }

    renderState(nextState, options = {}) {
        const { animate = true } = options;
        const normalizedState = this.getKnownState(nextState);
        if (!this.menu || !this.content || !this.titleNode) return;

        if (!animate || normalizedState === this.substate) {
            this.applyState(normalizedState);
            return;
        }

        clearTimeout(this.stateTransitionTimer);
        this.menu.classList.add('is-substate-transitioning-out');
        this.stateTransitionTimer = setTimeout(() => {
            this.applyState(normalizedState);
            this.menu.classList.remove('is-substate-transitioning-out');
            this.menu.classList.add('is-substate-transitioning-in');
            this.stateTransitionTimer = setTimeout(() => {
                this.menu?.classList.remove('is-substate-transitioning-in');
                this.stateTransitionTimer = null;
            }, 200);
        }, 200);
    }

    getKnownState(state) {
        return ['home_state', 'messages_state', 'notifications_state', 'friends_state', 'collections_state'].includes(state)
            ? state
            : 'home_state';
    }

    applyState(state) {
        this.substate = state;
        this.menu.dataset.substate = state;
        this.titleNode.textContent = this.getStateTitle(state);
        this.content.innerHTML = this.getStateContent(state);
        this.updatePinControlForState(state);
        this.loadIcons();

        if (state === 'collections_state') {
            void this.loadCollectionsState();
        }
    }

    getStateTitle(state) {
        return {
            home_state: 'Меню',
            messages_state: 'Сообщения',
            notifications_state: 'Уведомления',
            friends_state: 'Друзья',
            collections_state: 'Коллекции'
        }[state] || 'Меню';
    }

    getStateContent(state) {
        if (state === 'home_state') {
            return `
                <div class="footer-menu__content-main">
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="profile">Профиль</button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="messages">Сообщения</button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="notifications">Уведомления</button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="friends">Друзья</button>
                    <button class="footer-menu__content-button" type="button" data-footer-menu-action="collections">Коллекции</button>
                </div>
                <button class="footer-menu__create-post" type="button" data-footer-menu-action="create-post">Создать пост</button>
            `;
        }

        if (state === 'collections_state') {
            return '<ul class="footer-menu__collections-list" data-component="footer-menu-collections-list"><li class="footer-menu__collections-placeholder">Загрузка...</li></ul>';
        }

        return '<div class="footer-menu__state-placeholder">Скоро здесь появится содержимое</div>';
    }

    async loadCollectionsState() {
        const list = this.content?.querySelector('[data-component="footer-menu-collections-list"]');
        if (!list) return;

        try {
            const response = await fetch('/collections/list', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.collections)) {
                throw new Error(payload?.error || 'Не удалось загрузить коллекции');
            }
            this.collections = payload.collections;
            this.renderCollectionsList(list, this.collections);
        } catch (error) {
            console.warn('Unable to load footer collections', error);
            list.innerHTML = '<li class="footer-menu__collections-placeholder">Не удалось загрузить коллекции</li>';
        }
    }

    renderCollectionsList(list, collections) {
        const normalizedCollections = collections
            .map((collection) => String(collection || '').trim())
            .filter(Boolean)
            .map((collection) => this.isProfileCollectionName(collection) ? 'Профиль' : collection);

        if (normalizedCollections.length === 0) {
            normalizedCollections.push('Профиль');
        }

        list.innerHTML = normalizedCollections.map((collection) => `
            <li>
                <button class="footer-menu__collection-item" type="button" data-footer-collection="${this.escapeHtml(collection)}">
                    ${this.escapeHtml(collection)}
                </button>
            </li>
        `).join('');
    }

    isProfileCollectionName(collectionName) {
        const normalized = String(collectionName || '').trim().toLowerCase();
        return normalized === 'profile' || normalized === 'профиль';
    }

    updatePinControlForState(state) {
        if (!this.pinButton || !this.pinIcon) return;

        const isHomeState = state === 'home_state';
        this.pinButton.classList.toggle('footer-menu__pin--back', !isHomeState);
        this.pinButton.classList.toggle('is-active', isHomeState && this.isPinned);
        this.pinButton.setAttribute('aria-label', isHomeState ? (this.isPinned ? 'Открепить меню' : 'Закрепить меню') : 'Назад');
        this.pinButton.setAttribute('aria-pressed', isHomeState ? (this.isPinned ? 'true' : 'false') : 'false');
        this.pinIcon.setAttribute('data-svg-src', isHomeState ? (this.isPinned ? '/assets/images/icons/pin-fill.svg' : '/assets/images/icons/pin.svg') : '/assets/images/icons/L-arrow.svg');
        this.loadIcon(this.pinIcon);
    }

    togglePinned() {
        this.isPinned = !this.isPinned;
        this.updatePinControlForState(this.substate || 'home_state');
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

    refresh() {
        const currentMenu = document.querySelector('[data-component="footer-menu"]');
        if (!currentMenu) {
            this.unbindHandlers();
            this.menu = null;
            return;
        }

        this.unbindHandlers();
        currentMenu.dataset.bound = '0';
        this.menu = currentMenu;
        this.init();
    }

    unbindHandlers() {
        this.toggleButton?.removeEventListener('click', this.openHandler);
        this.compressButton?.removeEventListener('click', this.closeHandler);
        this.pinButton?.removeEventListener('click', this.pinHandler);
        this.content?.removeEventListener('click', this.contentClickHandler);
        document.removeEventListener('click', this.outsideClickHandler);
        clearTimeout(this.stateTransitionTimer);
        clearTimeout(this.authShakeTimer);
    }
}

App.register('footer_lo.js', FooterLayout);
