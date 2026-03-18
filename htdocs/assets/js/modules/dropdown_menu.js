/* --------------------------- Выпадающее меню (независимый компонент) --------------------------------------------------------------------------------- */

class DropdownMenuComponent {
    constructor() {
        this.buttons = [];
    }

    // Инициализация
    init() {
        // Ищем все элементы с data-component="dropdown_button"
        this.buttons = document.querySelectorAll('[data-component="dropdown_button"]');
        if (this.buttons.length === 0) return;

        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => this.handleClick(e, button));
        });
    }

    // Обработчик
    handleClick(e, button) {
        e.preventDefault(); // опционально
        console.log('Dropdown button clicked', button);
        // ...
    }
}