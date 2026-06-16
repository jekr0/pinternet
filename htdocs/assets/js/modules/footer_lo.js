class FooterLayout {
    init() {
        this.menu = document.querySelector('[data-component="footer-menu"]');
        if (!this.menu || this.menu.dataset.bound === '1') return;

        this.menu.dataset.bound = '1';
        this.isPinned = false;
        this.toggleButton = this.menu.querySelector('.footer-menu__toggle');
        this.compressButton = this.menu.querySelector('.footer-menu__compress');
        this.pinButton = this.menu.querySelector('.footer-menu__pin');
        this.pinIcon = this.pinButton?.querySelector('[data-svg-src]') || null;
        this.contentButtons = Array.from(this.menu.querySelectorAll('[data-footer-menu-action]'));

        this.loadIcons();
        this.bindHandlers();
        this.closeMenu();
    }

    loadIcons() {
        this.menu.querySelectorAll('[data-svg-src]').forEach((icon) => this.loadIcon(icon));
    }

    loadIcon(icon) {
        const src = icon?.getAttribute('data-svg-src');
        if (src) {
            App.utils.loadSVG(src, icon);
        }
    }

    bindHandlers() {
        this.openHandler = () => this.openMenu();
        this.closeHandler = (event) => {
            event.stopPropagation();
            this.closeMenu();
        };
        this.pinHandler = (event) => {
            event.stopPropagation();
            this.togglePinned();
        };
        this.contentClickHandler = (event) => {
            event.stopPropagation();
            this.handleContentAction(event.currentTarget?.dataset.footerMenuAction || '');
        };
        this.outsideClickHandler = (event) => {
            if (this.menu.dataset.state !== 'opened' || this.isPinned) return;
            if (this.menu.contains(event.target)) return;
            this.closeMenu();
        };

        this.toggleButton?.addEventListener('click', this.openHandler);
        this.compressButton?.addEventListener('click', this.closeHandler);
        this.pinButton?.addEventListener('click', this.pinHandler);
        this.contentButtons.forEach((button) => button.addEventListener('click', this.contentClickHandler));
        document.addEventListener('click', this.outsideClickHandler);
    }

    openMenu() {
        this.menu.dataset.state = 'opened';
        this.toggleButton?.setAttribute('aria-expanded', 'true');
    }

    closeMenu() {
        this.menu.dataset.state = 'closed';
        this.toggleButton?.setAttribute('aria-expanded', 'false');
    }

    closeAfterAction() {
        if (!this.isPinned) {
            this.closeMenu();
        }
    }

    handleContentAction(action) {
        if (action === 'profile') {
            this.closeAfterAction();
            if (App.nav?.navigate) {
                App.nav.navigate('/profile');
                return;
            }
            window.location.href = '/profile';
            return;
        }

        if (action === 'collections') {
            this.closeAfterAction();
            document.dispatchEvent(new CustomEvent('collection-modal:open'));
        }
    }

    togglePinned() {
        this.isPinned = !this.isPinned;
        this.pinButton?.classList.toggle('is-active', this.isPinned);
        this.pinButton?.setAttribute('aria-pressed', this.isPinned ? 'true' : 'false');
        this.pinButton?.setAttribute('aria-label', this.isPinned ? 'Открепить меню' : 'Закрепить меню');

        if (!this.pinIcon) return;
        this.pinIcon.setAttribute(
            'data-svg-src',
            this.isPinned ? '/assets/images/icons/pin-fill.svg' : '/assets/images/icons/pin.svg'
        );
        this.loadIcon(this.pinIcon);
    }

    refresh() {
        this.loadIcons();
    }
}

App.register('footer_lo.js', FooterLayout);
