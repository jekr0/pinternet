/* --------------------------- Модуль dropdown-search --------------------------- */

class DropdownSearchComponent {
    constructor() {
        this.field = null;
        this.input = null;
        this.dropdown = null;
        this.scroll = null;
        this.history = [];
        this.hideTimer = null;
    }

    init() {
        this.field = document.querySelector('.header__search-field');
        this.input = document.querySelector('.header__search-input');
        this.dropdown = document.querySelector('[data-component="dropdown-search"]');
        this.scroll = this.dropdown?.querySelector('[data-component="dropdown-search-scroll"]') || null;
        if (!this.field || !this.input || !this.dropdown || !this.scroll) return;

        this.field.addEventListener('focusin', async () => {
            clearTimeout(this.hideTimer);
            await this.loadHistory();
            this.open();
        });

        this.input.addEventListener('keydown', async (event) => {
            if (event.key !== 'Enter') return;
            const query = this.normalizeQuery(this.input.value);
            if (!query) return;
            await this.saveQuery(query);
            await this.loadHistory();
            this.open();
        });

        this.field.addEventListener('focusout', (event) => {
            const nextTarget = event.relatedTarget;
            if (nextTarget && this.field.contains(nextTarget)) return;
            clearTimeout(this.hideTimer);
            this.hideTimer = window.setTimeout(() => this.close(), 120);
        });

        this.dropdown.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
    }

    normalizeQuery(value) {
        return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 128);
    }

    async loadHistory() {
        try {
            const response = await fetch('/search/history?limit=10', {
                headers: { 'Accept': 'application/json' }
            });
            const payload = await response.json();
            if (!response.ok || !payload?.success || !Array.isArray(payload?.queries)) {
                this.history = [];
                this.render();
                return;
            }
            this.history = payload.queries
                .map((query) => this.normalizeQuery(query))
                .filter(Boolean)
                .slice(0, 10);
            this.render();
        } catch (error) {
            console.warn('Unable to load search history', error);
            this.history = [];
            this.render();
        }
    }

    async saveQuery(query) {
        try {
            await fetch('/search/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ query }).toString()
            });
        } catch (error) {
            console.warn('Unable to save search query', error);
        }
    }

    render() {
        if (!this.scroll) return;
        this.scroll.innerHTML = '';

        this.history.forEach((queryText) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dropdown-search__item';
            button.innerHTML = `
                <span class="dropdown-search__item-icon" data-svg-src="/assets/images/icons/S-temp.svg" aria-hidden="true"></span>
                <span class="dropdown-search__item-text"></span>
            `;
            const textNode = button.querySelector('.dropdown-search__item-text');
            if (textNode) {
                textNode.textContent = queryText;
            }
            const iconNode = button.querySelector('[data-svg-src]');
            if (iconNode) {
                const src = iconNode.getAttribute('data-svg-src');
                if (src) {
                    App.utils.loadSVG(src, iconNode);
                }
            }
            button.addEventListener('click', async () => {
                this.input.value = queryText;
                this.input.focus();
                await this.saveQuery(queryText);
            });

            this.scroll.appendChild(button);
        });
    }

    open() {
        this.dropdown.classList.add('is-open');
        this.dropdown.setAttribute('aria-hidden', 'false');
    }

    close() {
        this.dropdown.classList.remove('is-open');
        this.dropdown.setAttribute('aria-hidden', 'true');
    }
}

App.register('dropdown_search.js', DropdownSearchComponent);
