/* =========================== Главный объект приложения ========================== */

const App = {
    // Реестр зарегистрированных компонентов (ключ = имя файла модуля)
    registry: {},

    // Метод для регистрации компонента
    register: function (name, componentClass) {
        this.registry[name] = componentClass;
    },

    // Инициализация: создаём экземпляры только тех модулей, которые нужны на странице
    init: function () {
        console.log('App initialized');

        if (!window.activeModules || !Array.isArray(window.activeModules)) {
            console.warn('activeModules is not defined or not an array');
            return;
        }

        window.activeModules.forEach(moduleFile => {
            const ComponentClass = this.registry[moduleFile];
            if (ComponentClass) {
                try {
                    const instance = new ComponentClass();
                    instance.init();               // компонент сам ищет свои элементы
                    this.components[moduleFile] = instance; // опционально, для хранения экземпляров
                } catch (e) {
                    console.error(`Component initialization error ${moduleFile}:`, e);
                }
            } else {
                console.warn(`No registered class for module: ${moduleFile}`);
            }
        });
    },

    // Хранилище для экземпляров (можно использовать позже)
    components: {},

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
        // другие глобальные данные
    }
};

// Инициализируем после полной загрузки DOM (все скрипты уже выполнены)
document.addEventListener('DOMContentLoaded', () => App.init());