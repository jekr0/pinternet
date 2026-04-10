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
        },

        /* Загрузка SVG из файла и вставка инлайн (с кешированием) */
        _svgCache: {},
        _svgRequestState: new WeakMap(),
        _bodyScrollLocks: 0,
        loadSVG: function (src, container) {
            if (!container) return;

            const requestId = (this._svgRequestState.get(container) || 0) + 1;
            this._svgRequestState.set(container, requestId);

            const isLatestRequest = () => {
                const latestRequestId = this._svgRequestState.get(container);
                const currentSrc = container.getAttribute('data-svg-src');
                return latestRequestId === requestId && (!currentSrc || currentSrc === src);
            };

            if (this._svgCache[src]) {
                if (!isLatestRequest()) return;
                container.innerHTML = this._svgCache[src];
                return;
            }
            fetch(src)
                .then(r => {
                    if (!r.ok) throw new Error(`SVG not found: ${src}`);
                    return r.text();
                })
                .then(svg => {
                    this._svgCache[src] = svg;
                    if (!isLatestRequest()) return;
                    container.innerHTML = svg;
                })
                .catch(err => console.warn(err));
        },
        lockBodyScroll: function () {
            this._bodyScrollLocks += 1;
            if (this._bodyScrollLocks === 1) {
                document.body.classList.add('body--scroll-locked');
            }
        },
        unlockBodyScroll: function () {
            this._bodyScrollLocks = Math.max(0, this._bodyScrollLocks - 1);
            if (this._bodyScrollLocks === 0) {
                document.body.classList.remove('body--scroll-locked');
            }
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
