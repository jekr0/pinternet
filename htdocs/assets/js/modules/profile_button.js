/* --------------------------- Компонент профиля --------------------------------- */

class ProfileComponent {
    constructor() {
        this.buttons = [];
    }

    // Инициализация: поиск всех элементов с data-component="profile_button"
    init() {
        this.buttons = document.querySelectorAll('[data-component="profile_button"]');
        if (this.buttons.length === 0) return;

        this.buttons.forEach(button => {
            this.prepareButton(button);
            button.addEventListener('click', (e) => this.handleClick(e, button));
        });
    }

    // Подготовка кнопки: решает, показывать аватар или иконку по умолчанию
    prepareButton(button) {
        const needImage = Number(button.dataset.profileImg) === 1;
        if (needImage) {
            this.loadAvatar(button);
        } else {
            this.setDefaultIcon(button);
        }
    }

    loadAvatar(button) {
        App.utils.loadImage(
            App.store.profile.avatarPath,
            (img) => this.showAvatar(button, img),
            () => this.showDefaultIcon(button)
        );
    }

    showAvatar(button, img) {
        button.innerHTML = '';
        img.classList.add('header__profile-avatar');
        button.appendChild(img);
    }

    setDefaultIcon(button) {
        button.innerHTML = '<img class="header__profile-icon" src="assets/images/icons/at-sign.svg" alt="Profile">';
    }

    showDefaultIcon(button) {
        this.setDefaultIcon(button);
    }

    handleClick(e, button) {
        e.preventDefault();
        console.log('Profile button clicked', button);
        const url = button.dataset.profileUrl || '/profile';
        window.location.href = url;
    }
}

// Регистрация
App.register('profile_button.js', ProfileComponent);