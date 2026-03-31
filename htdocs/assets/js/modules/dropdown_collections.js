/* ------------------------ Модуль dropdown-collections ------------------------ */

class DropdownCollectionsComponent {
    constructor() {
        this.dropdown = null;
        this.title = null;
        this.list = null;
        this.clearButton = null;
        this.addCollectionPanel = null;
        this.addCollectionInput = null;
        this.addCollectionCancelButton = null;
        this.addCollectionCreateButton = null;
        this.activeButton = null;
        this.activeCard = null;
        this.activePostId = 0;

        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscape = this.handleEscape.bind(this);
        this.reposition = this.reposition.bind(this);
    }

    init() {
        this.createDropdown();

        document.addEventListener('dropdown-collections:open', async (event) => {
            const button = event.detail?.button;
            const card = event.detail?.card;
            const postId = Number(event.detail?.postId || 0);
            if (!button || !card || !postId) return;

            this.activeButton = button;
            this.activeCard = card;
            this.activePostId = postId;
            this.activeCard.classList.add('post-card--dropdown-open');

            this.hideAddCollectionPanel();
            await this.loadBoards();
            this.positionToButton(button);
            this.open();
        });
    }

    createDropdown() {
        if (this.dropdown) return;

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'dropdown-collections';
        this.dropdown.setAttribute('aria-hidden', 'true');

        this.title = document.createElement('h3');
        this.title.className = 'dropdown-collections__title';
        this.title.textContent = 'Сохранить в коллекцию';

        this.list = document.createElement('ul');
        this.list.className = 'dropdown-collections__collection-list';

        this.clearButton = document.createElement('button');
        this.clearButton.type = 'button';
        this.clearButton.className = 'dropdown-collections__clear-button';
        this.clearButton.textContent = 'удалить';
        this.clearButton.addEventListener('click', async () => {
            await this.clearPost();
        });

        this.addCollectionPanel = document.createElement('div');
        this.addCollectionPanel.className = 'dropdown-collections__add-collection dropdown-collections__add-collection--hidden';

        this.addCollectionInput = document.createElement('input');
        this.addCollectionInput.type = 'text';
        this.addCollectionInput.className = 'create-post-modal__input create-post-modal__input--collection dropdown-collections__add-input';
        this.addCollectionInput.placeholder = 'Новая коллекция';

        this.addCollectionCancelButton = document.createElement('button');
        this.addCollectionCancelButton.type = 'button';
        this.addCollectionCancelButton.className = 'create-post-modal__button create-post-modal__button--cancel';
        this.addCollectionCancelButton.textContent = 'Отмена';
        this.addCollectionCancelButton.addEventListener('click', () => {
            this.hideAddCollectionPanel();
        });

        this.addCollectionCreateButton = document.createElement('button');
        this.addCollectionCreateButton.type = 'button';
        this.addCollectionCreateButton.className = 'create-post-modal__button create-post-modal__button--submit';
        this.addCollectionCreateButton.textContent = 'Создать';
        this.addCollectionCreateButton.addEventListener('click', async () => {
            await this.createCollection();
        });

        this.addCollectionInput.addEventListener('input', () => {
            const normalized = this.addCollectionInput.value
                .replace(/[^a-zа-яё0-9_ ]/gi, '')
                .slice(0, 32);
            if (normalized !== this.addCollectionInput.value) {
                this.addCollectionInput.value = normalized;
            }
        });

        this.addCollectionInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await this.createCollection();
            }
        });

        const addActions = document.createElement('div');
        addActions.className = 'dropdown-collections__add-actions';
        addActions.appendChild(this.addCollectionCancelButton);
        addActions.appendChild(this.addCollectionCreateButton);

        this.addCollectionPanel.appendChild(this.addCollectionInput);
        this.addCollectionPanel.appendChild(addActions);

        this.dropdown.appendChild(this.title);
        this.dropdown.appendChild(this.list);
        this.dropdown.appendChild(this.addCollectionPanel);
        this.dropdown.appendChild(this.clearButton);
        document.body.appendChild(this.dropdown);
    }

    open() {
        if (!this.dropdown) return;
        this.dropdown.classList.remove('dropdown-collections--closing');
        this.dropdown.classList.add('is-open');
        this.dropdown.setAttribute('aria-hidden', 'false');

        document.addEventListener('click', this.handleOutsideClick);
        document.addEventListener('keydown', this.handleEscape);
        window.addEventListener('resize', this.reposition);
        window.addEventListener('scroll', this.reposition, true);
    }

    close() {
        if (!this.dropdown) return;

        this.dropdown.classList.remove('is-open');
        this.dropdown.classList.add('dropdown-collections--closing');
        this.dropdown.setAttribute('aria-hidden', 'true');

        this.hideAddCollectionPanel();
        this.activeCard?.classList.remove('post-card--dropdown-open');
        this.activeButton = null;
        this.activeCard = null;
        this.activePostId = 0;

        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscape);
        window.removeEventListener('resize', this.reposition);
        window.removeEventListener('scroll', this.reposition, true);
    }

    reposition() {
        if (!this.dropdown || !this.activeButton || !this.dropdown.classList.contains('is-open')) return;
        this.positionToButton(this.activeButton);
    }

    positionToButton(button) {
        if (!this.dropdown) return;

        const rect = button.getBoundingClientRect();
        const width = this.dropdown.offsetWidth || 220;
        const height = this.dropdown.offsetHeight || 170;
        const spacing = 5;
        const viewportPadding = 10;

        const hasSpaceRight = rect.right + spacing + width <= window.innerWidth - viewportPadding;
        let left = hasSpaceRight ? rect.right + spacing : rect.left - spacing - width;
        let top = rect.top;

        left = Math.min(Math.max(left, viewportPadding), window.innerWidth - width - viewportPadding);
        top = Math.min(Math.max(top, viewportPadding), window.innerHeight - height - viewportPadding);

        this.dropdown.style.left = `${left}px`;
        this.dropdown.style.top = `${top}px`;
    }

    async loadBoards() {
        if (!this.list || !this.activePostId) return;

        let boards = [];
        try {
            const response = await fetch(`/posts/bookmark/boards?post_id=${encodeURIComponent(String(this.activePostId))}`);
            const payload = await response.json();
            if (response.ok && payload.success && Array.isArray(payload.boards)) {
                boards = payload.boards;
            }
        } catch (error) {
            console.warn('Unable to load boards', error);
        }

        this.renderBoards(boards);
    }

    renderBoards(boards) {
        if (!this.list) return;

        this.list.innerHTML = '';

        boards.forEach((boardData) => {
            const boardName = typeof boardData?.name === 'string'
                ? boardData.name
                : typeof boardData === 'string' ? boardData : '';
            if (!boardName) return;

            const item = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dropdown-collections__collection-item';
            button.textContent = boardName === 'Profile' ? 'Профиль' : boardName;
            button.dataset.board = boardName;
            button.classList.toggle('is-selected', !!boardData?.is_saved);
            button.addEventListener('click', async () => {
                await this.toggleBoard(button);
            });

            item.appendChild(button);
            this.list.appendChild(item);
        });

        const addItem = document.createElement('li');
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'dropdown-collections__collection-item dropdown-collections__collection-item--add';
        addButton.textContent = '+';
        addButton.addEventListener('click', () => {
            this.showAddCollectionPanel();
        });
        addItem.appendChild(addButton);
        this.list.appendChild(addItem);
    }

    async toggleBoard(button) {
        if (!button || !this.activePostId) return;

        const boardName = button.dataset.board || '';
        if (!boardName) return;

        try {
            const response = await fetch('/posts/bookmark/board-toggle', {
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

            button.classList.toggle('is-selected', !!payload.saved);
            if (!payload.has_any) {
                document.dispatchEvent(new CustomEvent('post-card:bookmark-updated', {
                    detail: { postId: this.activePostId, bookmarked: false }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('post-card:bookmark-updated', {
                    detail: { postId: this.activePostId, bookmarked: true }
                }));
            }
        } catch (error) {
            console.warn('Unable to toggle board', error);
        }
    }

    async createCollection() {
        if (!this.activePostId || !this.addCollectionInput) return;

        const boardName = this.addCollectionInput.value.trim();
        if (!boardName) return;

        this.addCollectionCreateButton.disabled = true;

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

            await this.loadBoards();
            this.hideAddCollectionPanel();
            document.dispatchEvent(new CustomEvent('post-card:bookmark-updated', {
                detail: { postId: this.activePostId, bookmarked: true }
            }));
        } catch (error) {
            console.warn('Unable to create board', error);
        } finally {
            this.addCollectionCreateButton.disabled = false;
        }
    }

    showAddCollectionPanel() {
        if (!this.addCollectionPanel || !this.list || !this.clearButton || !this.title) return;

        this.addCollectionInput.value = '';
        this.list.classList.add('dropdown-collections__collection-list--hidden');
        this.clearButton.classList.add('dropdown-collections__clear-button--hidden');
        this.title.textContent = 'Новая коллекция';
        this.addCollectionPanel.classList.remove('dropdown-collections__add-collection--hidden');

        requestAnimationFrame(() => {
            this.addCollectionInput?.focus();
            this.reposition();
        });
    }

    hideAddCollectionPanel() {
        if (!this.addCollectionPanel || !this.list || !this.clearButton || !this.title) return;

        this.title.textContent = 'Сохранить в коллекцию';
        this.addCollectionPanel.classList.add('dropdown-collections__add-collection--hidden');
        this.list.classList.remove('dropdown-collections__collection-list--hidden');
        this.clearButton.classList.remove('dropdown-collections__clear-button--hidden');
        if (this.addCollectionInput) {
            this.addCollectionInput.value = '';
        }
    }

    async clearPost() {
        if (!this.activePostId) return;

        try {
            const response = await fetch('/posts/bookmark/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ post_id: String(this.activePostId) }).toString()
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) return;

            document.dispatchEvent(new CustomEvent('post-card:bookmark-updated', {
                detail: { postId: this.activePostId, bookmarked: false }
            }));
            this.close();
        } catch (error) {
            console.warn('Unable to clear post from boards', error);
        }
    }

    handleOutsideClick(event) {
        if (!this.dropdown || !this.activeButton) return;
        const target = event.target;
        if (!target) return;
        if (this.dropdown.contains(target) || this.activeButton.contains(target)) return;
        this.close();
    }

    handleEscape(event) {
        if (event.key === 'Escape') {
            if (!this.addCollectionPanel?.classList.contains('dropdown-collections__add-collection--hidden')) {
                this.hideAddCollectionPanel();
                return;
            }
            this.close();
        }
    }
}

App.register('dropdown_collections.js', DropdownCollectionsComponent);
