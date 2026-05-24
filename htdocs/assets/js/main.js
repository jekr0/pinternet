/* =========================== Главный объект приложения ========================== */

document.documentElement.classList.add('app-preloading');

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
                    this.destroyComponent(moduleFile);

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

    initWithin: function (_root) {
        // Пока модули сами ищут элементы глобально; root зарезервирован для следующей итерации.
        this.init();
    },
    destroyComponent: function (moduleFile) {
        const instance = this.components[moduleFile];
        if (!instance) return;

        if (typeof instance.destroy === 'function') {
            try {
                instance.destroy();
            } catch (error) {
                console.warn(`Component destroy error ${moduleFile}:`, error);
            }
        }

        delete this.components[moduleFile];
    },
    destroyAllComponents: function () {
        Object.keys(this.components).forEach((moduleFile) => this.destroyComponent(moduleFile));
    },

    destroyWithin: function (_root) {
        // На текущем этапе очищаем все компоненты перед swap контейнера.
        this.destroyAllComponents();
    },
    initWithSvgPreload: async function () {
        const svgNodes = Array.from(document.querySelectorAll('[data-svg-src]'));
        const svgPaths = svgNodes
            .map((node) => node.getAttribute('data-svg-src'))
            .filter(Boolean);

        await this.utils.preloadSVGs(svgPaths);
    },

    // Хранилище для экземпляров (можно использовать позже)
    components: {},

    /* Утилиты для работы с DOM */
    utils: {
        normalizePublicPath: function (src) {
            if (!src || typeof src !== 'string') return src;
            if (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
                return src;
            }

            return `/${src.replace(/^\.?\//, '')}`;
        },
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
            img.src = this.normalizePublicPath(src);
            img.onload = () => onSuccess?.(img);
            img.onerror = () => onError?.();
            return img;
        },

        /* Загрузка SVG из файла и вставка инлайн (с кешированием) */
        _svgCache: {},
        _svgRequestState: new WeakMap(),
        _bodyScrollLocks: 0,
        preloadSVGs: async function (srcList) {
            if (!Array.isArray(srcList) || srcList.length === 0) return;

            const uniqueSrcList = [...new Set(srcList.map((src) => this.normalizePublicPath(src)))];
            const pendingRequests = uniqueSrcList
                .filter((src) => !this._svgCache[src])
                .map((src) =>
                    fetch(src)
                        .then((response) => {
                            if (!response.ok) throw new Error(`SVG not found: ${src}`);
                            return response.text();
                        })
                        .then((svg) => {
                            this._svgCache[src] = svg;
                        })
                        .catch((error) => console.warn(error))
                );

            await Promise.all(pendingRequests);
        },
        loadSVG: function (src, container) {
            if (!container) return;
            const normalizedSrc = this.normalizePublicPath(src);

            const requestId = (this._svgRequestState.get(container) || 0) + 1;
            this._svgRequestState.set(container, requestId);

            const isLatestRequest = () => {
                const latestRequestId = this._svgRequestState.get(container);
                const currentSrc = container.getAttribute('data-svg-src');
                return latestRequestId === requestId && (!currentSrc || this.normalizePublicPath(currentSrc) === normalizedSrc);
            };

            if (this._svgCache[normalizedSrc]) {
                if (!isLatestRequest()) return;
                container.innerHTML = this._svgCache[normalizedSrc];
                return;
            }
            fetch(normalizedSrc)
                .then(r => {
                    if (!r.ok) throw new Error(`SVG not found: ${normalizedSrc}`);
                    return r.text();
                })
                .then(svg => {
                    this._svgCache[normalizedSrc] = svg;
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
            avatarPath: '/uploads/avatars/avatar.jpg',
            defaultIcon: '/assets/images/icons/planet.svg'
        },
        // другие глобальные данные
    }
};

// Инициализируем после полной загрузки DOM (все скрипты уже выполнены)
document.addEventListener('DOMContentLoaded', () => {
    App.initWithSvgPreload()
        .then(() => App.initWithin(document))
        .finally(() => {
            document.documentElement.classList.remove('app-preloading');
            openUrlDrivenModalState();
        });
});


document.addEventListener('htmx:beforeSwap', (event) => {
    const target = event.detail?.target;
    if (!target || target.id !== 'app-main') return;

    App.destroyWithin(target);
});


document.addEventListener('htmx:afterSwap', (event) => {
    const target = event.detail?.target;
    if (!target || target.id !== 'app-main') return;

    try {
        const modulesJson = target.getAttribute('data-active-modules') || '[]';
        const parsedModules = JSON.parse(modulesJson);
        window.activeModules = Array.isArray(parsedModules) ? parsedModules : [];
    } catch (error) {
        console.warn('Failed to parse active modules from swapped fragment', error);
        window.activeModules = [];
    }

    App.initWithSvgPreload().then(() => App.initWithin(target));
    openUrlDrivenModalState();
});


function openUrlDrivenModalState() {
    const pathname = window.location.pathname;

    if (pathname === '/post/create') {
        document.dispatchEvent(new CustomEvent('post-modal:open'));
        return;
    }

    if (pathname === '/collections-editing') {
        document.dispatchEvent(new CustomEvent('collection-modal:open'));
        return;
    }

    const postEditMatch = pathname.match(/^\/post\/(\d+)\/edit$/);
    if (postEditMatch) {
        const postId = Number(postEditMatch[1] || 0);
        const postFull = document.querySelector('.post-full');
        const description = postFull?.querySelector('.post-full__description-text')?.textContent?.trim() || '';
        const imageSrc = postFull?.dataset.postImageSrc || postFull?.querySelector('.post-full__image')?.getAttribute('src') || '';
        const tags = Array.from(postFull?.querySelectorAll('.post-full__tag-label') || [])
            .map((node) => String(node.textContent || '').replace(/^#/, '').trim())
            .filter(Boolean);

        document.dispatchEvent(new CustomEvent('post-modal:open-edit', {
            detail: { postId, description, imageSrc, tags }
        }));
    }
}
