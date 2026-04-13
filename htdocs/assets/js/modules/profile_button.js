/* --------------------------- Компонент профиля --------------------------------- */

class ProfileComponent {
    constructor() {
        this.buttons = [];
    }

    init() {
        this.buttons = document.querySelectorAll('[data-component="profile_button"]');
        if (this.buttons.length === 0) return;

        this.buttons.forEach(button => {
            this.prepareButton(button);
            button.addEventListener('click', (e) => this.handleClick(e, button));
        });
    }

    prepareButton(button) {
        const needImage = Number(button.dataset.profileImg) === 1;
        if (needImage) {
            this.loadAvatar(button);
        } else {
            this.setDefaultIcon(button);
        }
    }

    loadAvatar(button) {
        // Путь к аватару берём из data-атрибута кнопки
        const src = button.dataset.avatarSrc || '';
        if (!src) {
            this.setDefaultIcon(button);
            return;
        }
        App.utils.loadImage(
            src,
            (img) => this.showAvatar(button, img),
            ()    => this.setDefaultIcon(button)
        );
    }

    showAvatar(button, img) {
        button.innerHTML = '';
        img.classList.add('header__profile-avatar');
        button.appendChild(img);
    }

    setDefaultIcon(button) {
        button.innerHTML = '<img class="header__profile-icon" src="/assets/images/icons/at-sign.svg" alt="Profile">';
    }

    handleClick(e, button) {
        e.preventDefault();
        const url = button.dataset.profileUrl || '/profile';
        window.location.href = url;
    }
}

App.register('profile_button.js', ProfileComponent);