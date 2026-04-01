/* -------------------------- Модуль create-collection ------------------------- */

class CreateCollectionComponent {
    constructor() {
        this.overlay = null;
        this.input = null;
        this.cancelButton = null;
        this.createButton = null;
        this.activePostId = 0;

        this.handleEscape = this.handleEscape.bind(this);
    }

    init() {
        this.createOverlay();

        document.addEventListener('create-collection:open', (event) => {
            const postId = Number(event.detail?.postId || 0);
            if (!postId) return;

            this.activePostId = postId;
            this.open();
        });
    }

    createOverlay() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'create-collection create-collection--hidden';
        this.overlay.setAttribute('aria-hidden', 'true');

        const panel = document.createElement('div');
        panel.className = 'create-collection__panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'create-collection__input';
        this.input.placeholder = 'Создать коллекцию';

        const actions = document.createElement('div');
        actions.className = 'create-collection__actions';

        this.cancelButton = document.createElement('button');
        this.cancelButton.type = 'button';
        this.cancelButton.className = 'create-collection__button create-collection__button--cancel';
        this.cancelButton.textContent = 'Отмена';
        this.cancelButton.addEventListener('click', () => {
            this.close();
        });

        this.createButton = document.createElement('button');
        this.createButton.type = 'button';
        this.createButton.className = 'create-collection__button create-collection__button--create';
        this.createButton.textContent = 'Создать';
        this.createButton.addEventListener('click', async () => {
            await this.createCollection();
        });

        this.input.addEventListener('input', () => {
            const normalized = this.input.value
                .replace(/[^a-zа-яё0-9_ ]/gi, '')
                .slice(0, 32);
            if (normalized !== this.input.value) {
                this.input.value = normalized;
            }
        });

        this.input.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await this.createCollection();
            }
        });

        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.close();
            }
        });

        actions.appendChild(this.cancelButton);
        actions.appendChild(this.createButton);
        panel.appendChild(this.input);
        panel.appendChild(actions);
        this.overlay.appendChild(panel);
        document.body.appendChild(this.overlay);
    }

    open() {
        if (!this.overlay) return;

        this.overlay.classList.remove('create-collection--hidden');
        this.overlay.setAttribute('aria-hidden', 'false');
        document.addEventListener('keydown', this.handleEscape);

        this.input.value = '';
        requestAnimationFrame(() => {
            this.input?.focus();
        });
    }

    close() {
        if (!this.overlay) return;

        this.overlay.classList.add('create-collection--hidden');
        this.overlay.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', this.handleEscape);
        this.input.value = '';
    }

    handleEscape(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    async createCollection() {
        const boardName = this.input?.value.trim() || '';
        if (!boardName || !this.activePostId) return;

        this.createButton.disabled = true;

        try {
            const response = await fetch('/posts/bookmark/board-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    post_id: String(this.activePostId),
                    board: boardName
                }).toString()
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) return;

            document.dispatchEvent(new CustomEvent('create-collection:created', {
                detail: { postId: this.activePostId, board: payload.board || boardName }
            }));
            this.close();
        } catch (error) {
            console.warn('Unable to create collection', error);
        } finally {
            this.createButton.disabled = false;
        }
    }
}

App.register('create_collection.js', CreateCollectionComponent);
