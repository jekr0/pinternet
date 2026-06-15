class FooterLayout {
    init() {
        this.menu = document.querySelector('[data-component="footer-menu"]');
        if (!this.menu || this.menu.dataset.bound === '1') return;

        this.menu.dataset.bound = '1';
        this.toggleButton = this.menu.querySelector('.footer-menu__toggle');
        this.compressButton = this.menu.querySelector('.footer-menu__compress');

        this.loadIcons();
        this.bindHandlers();
        this.closeMenu();
    }

    loadIcons() {
        this.menu.querySelectorAll('[data-svg-src]').forEach((icon) => {
            const src = icon.getAttribute('data-svg-src');
            if (src) {
                App.utils.loadSVG(src, icon);
            }
        });
    }

    bindHandlers() {
        this.openHandler = () => this.openMenu();
        this.closeHandler = (event) => {
            event.stopPropagation();
            this.closeMenu();
        };

        this.toggleButton?.addEventListener('click', this.openHandler);
        this.compressButton?.addEventListener('click', this.closeHandler);
    }

    openMenu() {
        this.menu.dataset.state = 'opened';
        this.toggleButton?.setAttribute('aria-expanded', 'true');
    }

    closeMenu() {
        this.menu.dataset.state = 'closed';
        this.toggleButton?.setAttribute('aria-expanded', 'false');
    }

    refresh() {
        this.loadIcons();
    }
}

App.register('footer_lo.js', FooterLayout);
