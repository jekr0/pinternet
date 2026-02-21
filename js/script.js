/* =========================== Главный объект приложения ================================================================================= */

const App = {
    /* Запуск после загрузки DOM */
    init: function () {
        console.log('App initialized');

        // Запуск всех модулей
        this.components = {
            profile: new ProfileComponent(),
            // example: new ExampleComponent(),
        };

        // Запуск всех компонентов
        Object.values(this.components).forEach(component => {
            if (component && typeof component.init === 'function') {
                component.init();
            }
        });
    },

    /* Утилиты для работы с DOM */
    utils: {
        /* Безопасный поиск элемента */
        getElement: function (selector) {
            const el = document.querySelector(selector);
            if (!el) {
                console.warn(`Element not found: ${selector}`);
            }
            return el;
        },

        /* Загрузка изображения с обработкой ошибок */
        loadImage: function (src, onSuccess, onError) {
            const img = new Image();
            img.src = src;
            img.onload = () => onSuccess?.(img);
            img.onerror = () => onError?.();
            return img;
        }
    },

    /* Хранилище данных приложения */
    store: {
        profile: {
            avatarPath: 'images/avatar.jpg',
            defaultIcon: 'icon-at-sign'
        },
    }
};

/* =========================== Компоненты (/методы) ================================================================================= */

/* --------------------------- Профиль --------------------------------------------------------------------------------- */

class ProfileComponent {
    constructor() {
        this.button = null;
        this.defaultIcon = null;
    }

    /* Инициализация */
    init() {
        this.button = App.utils.getElement('#profile-button');

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
            (img) => this.showAvatar(img)
        );
    }

    /* Показать загруженный аватар */
    showAvatar(img) {
        this.button.innerHTML = '';
        this.button.appendChild(img);
        console.log('Avatar loaded successfully');
    }

    /* Обработчики событий */
    attachEvents() {
        this.button.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }

    /* Клик по кнопке профиля */
    handleClick(e) {
        console.log('Profile button clicked');
        // Здесь будет логика открытия меню профиля и т.д.
    }
}

/* --------------------------- ??? --------------------------------------------------------------------------------- */






/* Точка входа, запускаем приложение после полной загрузки DOM */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}