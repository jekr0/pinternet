/* --------------------------- Выпадающее меню профиля (независимый компонент) -------------------- */

class DropdownProfileComponent {
    constructor() {
        this.buttons = [];
        this.menuMap = new Map();
        this.globalHandler = null;
        this.activeMenu = null;
    }

    init() {
        this.buttons = document.querySelectorAll('[data-component="dropdown_button"]');
        if (this.buttons.length === 0) return;

        const logOutBtn = document.getElementById('dropdown-profile-log-out');
        if (logOutBtn) {
            logOutBtn.addEventListener('click', () => {
                window.location.href = '/logout';
            });
        }

        this.buttons.forEach(button => {
            const svgSrc = button.dataset.svgSrc;
            if (svgSrc) App.utils.loadSVG(svgSrc, button);

            let menu = null;
            const targetSelector = button.dataset.dropdownTarget;
            if (targetSelector) {
                menu = document.querySelector(targetSelector);
            } else {
                menu = document.getElementById('header-dropdown-profile');
            }

            if (!menu) {
                console.warn('Dropdown profile not found for button:', button);
                return;
            }

            this.menuMap.set(button, menu);
            button.addEventListener('click', (e) => this.toggleMenu(button, e));
        });
    }

    toggleMenu(button, event) {
        event.stopPropagation();

        const menu = this.menuMap.get(button);
        if (!menu) return;

        const isHidden = menu.classList.contains('dropdown-profile--hidden');

        if (this.activeMenu && this.activeMenu !== menu) {
            this.closeMenu(this.activeMenu);
        }

        if (isHidden) {
            this.openMenu(menu);
        } else {
            this.closeMenu(menu);
        }
    }

    openMenu(menu) {
        menu.classList.remove('dropdown-profile--hidden');
        this.activeMenu = menu;

        if (!this.globalHandler) {
            this.globalHandler = (e) => this.handleOutsideClick(e);
            document.addEventListener('click', this.globalHandler);
        }
    }

    closeMenu(menu) {
        menu.classList.add('dropdown-profile--hidden');
        if (this.activeMenu === menu) {
            this.activeMenu = null;
        }

        if (!this.activeMenu && this.globalHandler) {
            document.removeEventListener('click', this.globalHandler);
            this.globalHandler = null;
        }
    }

    handleOutsideClick(event) {
        if (!this.activeMenu) return;

        const target = event.target;
        const isMenuClick = this.activeMenu.contains(target);
        const isButtonClick = Array.from(this.buttons).some(btn => btn.contains(target));

        if (!isMenuClick && !isButtonClick) {
            this.closeMenu(this.activeMenu);
        }
    }
}

App.register('dropdown_profile.js', DropdownProfileComponent);
