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
        const avatarClass = button.dataset.avatarClass || 'header__profile-avatar';
        img.classList.add(avatarClass);
        button.appendChild(img);
    }

    setDefaultIcon(button) {
        const placeholderClass = button.dataset.placeholderClass || 'header__profile-icon';
        const placeholderSrc = button.dataset.placeholderSrc || '/assets/images/icons/planet.svg';
        const placeholderAlt = button.dataset.placeholderAlt || 'Profile';
        const placeholderSize = Number(button.dataset.placeholderSize || 0);

        const img = document.createElement('img');
        img.classList.add(placeholderClass);
        img.src = placeholderSrc;
        img.alt = placeholderAlt;

        if (placeholderSize > 0) {
            img.width = placeholderSize;
            img.height = placeholderSize;
        }

        button.innerHTML = '';
        button.appendChild(img);
    }

    handleClick(e, button) {
        e.preventDefault();
        const url = button.dataset.profileUrl || '/profile';
        window.location.href = url;
    }
}

App.register('profile_button.js', ProfileComponent);