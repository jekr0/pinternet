/* --------------------------- Профиль (независимый компонент) --------------------------------------------------------------------------------- */

class ProfileComponent {
    constructor() {
        this.buttons = [];
    }

    // Ищем компоненты с нужным параметром
    init() {
        this.buttons = document.querySelectorAll('[data-component="profile_button"]');
        if (this.buttons.length === 0) return;

        this.buttons.forEach(button => {
            this.prepareButton(button);
            button.addEventListener('click', (e) => this.handleClick(e, button));
        });
    }

    // Подготавливает кнопку: проверяет data-profile-img и решает, загружать аватар или нет.
    prepareButton(button) {
        const profileImgValue = button.dataset.profileImg;
        // Приводим к числу: если "1" -> true, иначе false
        const needImage = Number(profileImgValue) === 1;

        if (needImage) {
            this.loadAvatar(button);
        } else {
            this.setDefaultIcon(button);
        }
    }

    // загружаем аватар
    loadAvatar(button) {
        App.utils.loadImage(
            App.store.profile.avatarPath,
            (img) => this.showAvatar(button, img),
            () => this.showDefaultIcon(button)
        );
    }

    // показываем аватар
    showAvatar(button, img) {
        button.innerHTML = '';
        img.classList.add('header__profile-avatar');
        button.appendChild(img);
    }

    // если с аватаром траблы
    setDefaultIcon(button) {
        button.innerHTML = '<img class="header__profile-icon" src="assets/images/icons/at-sign.svg" alt="Profile">';
    }

    // показываем
    showDefaultIcon(button) {
        this.setDefaultIcon(button);
    }

    // обработчик события
    handleClick(e, button) {
        e.preventDefault();
        console.log('Profile button clicked', button);
        const url = button.dataset.profileUrl || '/profile';
        window.location.href = url;
    }
}