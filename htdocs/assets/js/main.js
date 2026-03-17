/* =========================== Главный объект приложения ================================================================================= */

const App = {
    init: function () {
        console.log('App initialized');

        // Запуск всех модулей
        this.components = {
            profile: new ProfileComponent(),
        };

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
            avatarPath: 'uploads/avatars/avatar.jpg',
            defaultIcon: 'assets/images/icons/at-sign.svg'
        },
    }
};

/* Точка входа, запускаем приложение после полной загрузки DOM */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}