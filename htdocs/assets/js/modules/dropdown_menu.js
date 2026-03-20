/* --------------------------- Выпадающее меню (независимый компонент) -------------------- */

class DropdownMenuComponent {
    constructor() {
        this.buttons = [];               // все кнопки с data-component="dropdown_button"
        this.menuMap = new Map();        // связь кнопка → меню
        this.globalHandler = null;       // ссылка на обработчик документа
        this.activeMenu = null;          // текущее открытое меню
    }

    init() {
        this.buttons = document.querySelectorAll('[data-component="dropdown_button"]');
        if (this.buttons.length === 0) return;

        this.buttons.forEach(button => {
            // Определяем связанное меню: либо по data-dropdown-target, либо по умолчанию
            let menu = null;
            const targetSelector = button.dataset.dropdownTarget;
            if (targetSelector) {
                menu = document.querySelector(targetSelector);
            } else {
                // fallback – меню с id "header-dropdown-menu"
                menu = document.getElementById('header-dropdown-menu');
            }

            if (!menu) {
                console.warn('Dropdown menu not found for button:', button);
                return;
            }

            this.menuMap.set(button, menu);
            button.addEventListener('click', (e) => this.toggleMenu(button, e));
        });
    }

    toggleMenu(button, event) {
        event.stopPropagation(); // чтобы клик по кнопке не сработал как клик вне

        const menu = this.menuMap.get(button);
        if (!menu) return;

        const isHidden = menu.classList.contains('dropdown--hidden');

        // Если уже открыто другое меню, закрываем его
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
        menu.classList.remove('dropdown--hidden');
        this.activeMenu = menu;

        // Добавляем глобальный обработчик, если ещё не добавлен
        if (!this.globalHandler) {
            this.globalHandler = (e) => this.handleOutsideClick(e);
            document.addEventListener('click', this.globalHandler);
        }
    }

    closeMenu(menu) {
        menu.classList.add('dropdown--hidden');
        if (this.activeMenu === menu) {
            this.activeMenu = null;
        }

        // Если нет открытых меню, удаляем глобальный обработчик
        if (!this.activeMenu && this.globalHandler) {
            document.removeEventListener('click', this.globalHandler);
            this.globalHandler = null;
        }
    }

    closeAllMenus() {
        if (this.activeMenu) {
            this.closeMenu(this.activeMenu);
        }
    }

    handleOutsideClick(event) {
        // Если клик был вне активного меню и не по кнопке, закрываем меню
        if (!this.activeMenu) return;

        const target = event.target;
        const isMenuClick = this.activeMenu.contains(target);
        const isButtonClick = Array.from(this.buttons).some(btn => btn.contains(target));

        if (!isMenuClick && !isButtonClick) {
            this.closeMenu(this.activeMenu);
        }
    }
}

// Регистрация компонента
App.register('dropdown_menu.js', DropdownMenuComponent);