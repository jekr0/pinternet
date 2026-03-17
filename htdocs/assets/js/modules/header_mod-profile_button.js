/* --------------------------- Профиль --------------------------------------------------------------------------------- */

class ProfileComponent {
    constructor() {
        this.button = null;
        this.defaultIcon = null;
    }

    /* Инициализация */
    init() {
        this.button = App.utils.getElement('#header_mod-profile_button');

        // Если кнопки нет на странице — выходим
        if (!this.button) return;
        this.defaultIcon = this.button.querySelector('.header__profile-icon');
        this.loadAvatar();
        this.attachEvents();
    }

    /* Загрузка аватара */
    loadAvatar() {
        App.utils.loadImage(
            App.store.profile.avatarPath,
            (img) => this.showAvatar(img),
            () => this.showDefaultIcon()   // вызываем при ошибке
        );
    }

    // Обработка исключения
    showDefaultIcon() {
        console.warn('Avatar failed to load, showing default icon');
        this.button.innerHTML = '<img class="header__profile-icon" src="assets/images/icons/at-sign.svg">';
    }

    /* Показать загруженный аватар */
    showAvatar(img) {
        this.button.innerHTML = '';
        img.classList.add('header__profile-avatar'); 
        this.button.appendChild(img);
    }

    /* Обработчики событий */
    attachEvents() {
        this.button.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }

    /* Клик по кнопке профиля */
    handleClick(e) {
        console.log('header_mod-profile_button was clicked');
        window.location.href = '/profile';
    }
}