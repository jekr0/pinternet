/* =========================== Главный объект приложения ================================================================================= */

const App = {
    supabaseClient: null,

    init: function () {
        console.log('App initialized');

        // Инициализируем Supabase
        this.initSupabase();

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

    /* Для работы с клиентом */
    initSupabase: function () {
        const SUPABASE_URL = 'https://fulgfacmboxgmmkjsgrg.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_XjU6Y4sctj3KdOuPv7_xlw_C8xKgKp2';

        this.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
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