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


    history: {
        skipNextModalOnlyPop: false,
        getCurrentUrl: function () {
            return window.location.pathname + window.location.search;
        },
        getUrl: function (url = window.location.href) {
            try {
                return new URL(url, window.location.origin);
            } catch (_error) {
                return new URL(window.location.href);
            }
        },
        getModalKeyFromPath: function (pathname = window.location.pathname) {
            if (pathname === '/post/create' || /^\/post\/\d+\/edit$/.test(pathname)) return 'post-modal';
            if (pathname === '/collections-editing') return 'collection-modal';
            return null;
        },
        isModalPath: function (pathname = window.location.pathname) {
            return !!this.getModalKeyFromPath(pathname);
        },
        isModalUrl: function (url) {
            return this.isModalPath(this.getUrl(url).pathname);
        },
        getPostFullIdFromUrl: function (url = window.location.href) {
            const parsedUrl = this.getUrl(url);
            if (parsedUrl.pathname !== '/post') return 0;
            const postId = Number(parsedUrl.searchParams.get('id') || 0);
            return Number.isInteger(postId) && postId > 0 ? postId : 0;
        },
        getPostFullUrl: function (postId) {
            const normalizedPostId = Number(postId || 0);
            return normalizedPostId > 0 ? `/post?id=${encodeURIComponent(String(normalizedPostId))}` : '/';
        },
        isPostFullUrl: function (url = window.location.href) {
            return this.getPostFullIdFromUrl(url) > 0;
        },
        markNextPopAsModalOnly: function () {
            this.skipNextModalOnlyPop = true;
        },
        consumeNextModalOnlyPop: function () {
            const shouldSkip = this.skipNextModalOnlyPop;
            this.skipNextModalOnlyPop = false;
            return shouldSkip;
        }
    },

    nav: {
        navigate: function (url, options = {}) {
            const { pushUrl = true, target = '#app-main', swap = 'outerHTML', replaceUrl = false } = options;
            if (!url) return;

            if (window.htmx) {
                const nextUrl = String(url);
                const currentUrl = window.location.pathname + window.location.search;
                const swapTarget = typeof target === 'string' ? document.querySelector(target) : target;
                if (!swapTarget) {
                    window.location.href = nextUrl;
                    return;
                }

                if (nextUrl !== currentUrl) {
                    if (replaceUrl) {
                        window.history.replaceState({}, '', nextUrl);
                    } else if (pushUrl) {
                        window.history.pushState({}, '', nextUrl);
                    }
                }

                window.htmx.ajax('GET', nextUrl, { target: swapTarget, swap });
                return;
            }

            window.location.href = url;
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

    App.initWithSvgPreload()
        .then(() => App.initWithin(target))
        .finally(() => openUrlDrivenModalState());
});

let isDirtyHistoryPromptOpen = false;

window.addEventListener('popstate', () => {
    const postModalInstance = App.components['post_modal.js'];
    const collectionModalInstance = App.components['collection_modul.js'];
    const isPostModalOpen = !!(postModalInstance?.modal && !postModalInstance.modal.classList.contains('post-modal--hidden'));
    const isCollectionModalOpen = !!(collectionModalInstance?.root && !collectionModalInstance.root.classList.contains('collection-modal--hidden'));
    const activeModalUrl = isPostModalOpen
        ? postModalInstance?.getModalUrl?.()
        : (isCollectionModalOpen ? collectionModalInstance?.getModalUrl?.() : null);
    const isPostDirty = !!(isPostModalOpen && typeof postModalInstance.hasUnsavedChanges === 'function' && postModalInstance.hasUnsavedChanges());
    const isCollectionDirty = !!(isCollectionModalOpen && typeof collectionModalInstance.hasUnsavedChanges === 'function' && collectionModalInstance.hasUnsavedChanges());

    if ((isPostDirty || isCollectionDirty) && activeModalUrl) {
        window.history.pushState({}, '', activeModalUrl);

        if (isDirtyHistoryPromptOpen || App.overlay?.get?.('warn-modal')) {
            return;
        }

        isDirtyHistoryPromptOpen = true;
        const warningPromise = App.warn?.open({
            title: 'Осторожно!',
            description: 'У вас остались несохранённые изменения. После закрытия окна они будут сброшены. Хотите продолжить?',
            confirmLabel: 'Закрыть окно',
            cancelLabel: 'Назад',
            onConfirm: async () => {
                isDirtyHistoryPromptOpen = false;
                if (isPostModalOpen) {
                    postModalInstance?.close({ skipHistorySync: true });
                }
                if (isCollectionModalOpen) {
                    collectionModalInstance?.close({ skipHistorySync: true });
                }
                App.history?.markNextPopAsModalOnly?.();
                window.history.back();
            }
        });

        Promise.resolve(warningPromise).finally(() => {
            isDirtyHistoryPromptOpen = false;
        });
        return;
    }

    if (App.history?.consumeNextModalOnlyPop?.()) {
        openUrlDrivenModalState();
        return;
    }

    const hasModalComponents = !!(postModalInstance?.modal || collectionModalInstance?.root);
    const isModalRoute = App.history?.isModalPath?.();
    if (hasModalComponents && (isModalRoute || isPostModalOpen || isCollectionModalOpen)) {
        openUrlDrivenModalState();
        return;
    }

    if (window.htmx) {
        const swapTarget = document.getElementById('app-main');
        if (swapTarget) {
            window.htmx.ajax('GET', window.location.pathname + window.location.search, {
                target: swapTarget,
                swap: 'outerHTML'
            });
            return;
        }

        window.location.reload();
        return;
    }

    openUrlDrivenModalState();
});


function openUrlDrivenModalState() {
    const pathname = window.location.pathname;
    const postModalInstance = App.components['post_modal.js'];
    const collectionModalInstance = App.components['collection_modul.js'];

    const isPostCreate = pathname === '/post/create';
    const isPostEdit = /^\/post\/(\d+)\/edit$/.test(pathname);
    const isCollectionsEditing = pathname === '/collections-editing';

    if ((isPostCreate || isPostEdit) && collectionModalInstance?.root && !collectionModalInstance.root.classList.contains('collection-modal--hidden')) {
        collectionModalInstance.close({ skipHistorySync: true });
    }

    if (isCollectionsEditing && postModalInstance?.modal && !postModalInstance.modal.classList.contains('post-modal--hidden')) {
        postModalInstance.close({ skipHistorySync: true });
    }

    if (!isPostCreate && !isPostEdit && postModalInstance?.modal && !postModalInstance.modal.classList.contains('post-modal--hidden')) {
        postModalInstance.close({ skipHistorySync: true });
    }

    if (!isCollectionsEditing && collectionModalInstance?.root && !collectionModalInstance.root.classList.contains('collection-modal--hidden')) {
        collectionModalInstance.close({ skipHistorySync: true });
    }

    if (!isPostCreate && !isPostEdit && !isCollectionsEditing) {
        App.modalCtrl?.closeAll?.();
        return;
    }

    if (isPostCreate) {
        document.dispatchEvent(new CustomEvent('post-modal:open', { detail: { fromHistory: true } }));
        return;
    }

    if (isCollectionsEditing) {
        document.dispatchEvent(new CustomEvent('collection-modal:open', { detail: { fromHistory: true } }));
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
            detail: { postId, description, imageSrc, tags, fromHistory: true }
        }));
    }
}
