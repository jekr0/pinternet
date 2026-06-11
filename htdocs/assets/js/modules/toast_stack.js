/* ---------------------------- Toast stack manager ---------------------------- */

class ToastStackComponent {
    constructor() {
        this.container = null;
        this.maxToasts = 3;
    }

    init() {
        this.ensureContainer();

        document.addEventListener('app:toast', (event) => {
            const html = String(event.detail?.html || '').trim();
            const message = String(event.detail?.message || '').trim();
            if (!message && !html) return;
            this.show(message, { html });
        });
    }

    ensureContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'toast-stack';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(this.container);
    }

    show(message, options = {}) {
        this.ensureContainer();

        while (this.container.children.length >= this.maxToasts) {
            const oldest = this.container.firstElementChild;
            if (!oldest) break;
            oldest.remove();
        }

        const item = document.createElement('div');
        item.className = 'toast-stack__item toast-stack__item--hidden';
        if (options.html) {
            item.innerHTML = options.html;
        } else {
            item.textContent = message;
        }

        this.container.appendChild(item);

        window.requestAnimationFrame(() => {
            item.classList.remove('toast-stack__item--hidden');
        });

        setTimeout(() => {
            item.classList.add('toast-stack__item--hidden');
        }, 2000);

        setTimeout(() => {
            item.remove();
        }, 3000);
    }
}

App.register('toast_stack.js', ToastStackComponent);
