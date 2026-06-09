/* --------------------------- Overlay manager module -------------------------- */

class OverlayManagerComponent {
    constructor() {
        this.instances = new Map();
    }

    init() {
        App.overlay = {
            open: (config) => this.open(config),
            close: (key) => this.close(key),
            get: (key) => this.instances.get(key) || null
        };
    }

    open(config) {
        const key = String(config?.key || '').trim();
        if (!key) return null;

        if (this.instances.has(key)) {
            return this.instances.get(key);
        }

        const overlayClass = String(config?.overlayClass || '').trim();
        const hiddenClass = String(config?.hiddenClass || '').trim();
        const panelClass = String(config?.panelClass || '').trim();
        const closeOnBackdrop = config?.closeOnBackdrop !== false;
        const lockScroll = config?.lockScroll !== false;
        const transitionMs = Number(config?.transitionMs || 200);

        const overlay = document.createElement('div');
        if (overlayClass) overlay.className = overlayClass;
        if (hiddenClass) overlay.classList.add(hiddenClass);

        const panel = document.createElement('div');
        if (panelClass) panel.className = panelClass;
        overlay.appendChild(panel);

        const close = () => this.close(key);

        if (typeof config?.buildPanel === 'function') {
            config.buildPanel(panel, close);
        }

        if (closeOnBackdrop) {
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    close();
                }
            });
        }

        document.body.appendChild(overlay);

        const instance = {
            key,
            overlay,
            panel,
            close,
            hiddenClass,
            lockScroll,
            transitionMs,
            onClose: typeof config?.onClose === 'function' ? config.onClose : null
        };

        this.instances.set(key, instance);

        if (lockScroll) {
            App.utils.lockBodyScroll();
        }

        if (hiddenClass) {
            void overlay.offsetWidth;
            window.setTimeout(() => {
                overlay.classList.remove(hiddenClass);
            }, 10);
        }

        return instance;
    }

    close(key) {
        const instance = this.instances.get(key);
        if (!instance) return;

        if (instance.isClosing) return;
        instance.isClosing = true;
        this.instances.delete(key);

        const { overlay, hiddenClass, lockScroll, transitionMs, onClose } = instance;

        if (hiddenClass) {
            overlay.classList.add(hiddenClass);
        }

        window.setTimeout(() => {
            if (lockScroll) {
                App.utils.unlockBodyScroll();
            }
            overlay.remove();
            onClose?.();
        }, transitionMs);
    }
}

App.register('overlay_manager.js', OverlayManagerComponent);
