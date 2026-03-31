/* --------------------------- Модуль dropdown-board --------------------------- */

class DropdownBoardComponent {
    constructor() {
        this.dropdown = null;
        this.list = null;
        this.clearButton = null;
        this.activeButton = null;
        this.activeCard = null;
        this.activePostId = 0;

        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscape = this.handleEscape.bind(this);
        this.reposition = this.reposition.bind(this);
    }

    init() {
        this.createDropdown();

        document.addEventListener('dropdown-board:open', async (event) => {
            const button = event.detail?.button;
            const card = event.detail?.card;
            const postId = Number(event.detail?.postId || 0);
            if (!button || !card || !postId) return;

            this.activeButton = button;
            this.activeCard = card;
            this.activePostId = postId;
            this.activeCard.classList.add('post-card--dropdown-open');

            await this.loadBoards();
            this.positionToButton(button);
            this.open();
        });
    }

    createDropdown() {
        if (this.dropdown) return;

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'dropdown-board';
        this.dropdown.setAttribute('aria-hidden', 'true');

        const title = document.createElement('h3');
        title.className = 'dropdown-board__title';
        title.textContent = 'Сохранить в коллекцию';

        this.list = document.createElement('ul');
        this.list.className = 'dropdown-board__collection-list';

        this.clearButton = document.createElement('button');
        this.clearButton.type = 'button';
        this.clearButton.className = 'dropdown-board__clear-button';
        this.clearButton.textContent = 'удалить';
        this.clearButton.addEventListener('click', async () => {
            await this.clearPost();
        });

        this.dropdown.appendChild(title);
        this.dropdown.appendChild(this.list);
        this.dropdown.appendChild(this.clearButton);
        document.body.appendChild(this.dropdown);
    }

    open() {
        if (!this.dropdown) return;
        this.dropdown.classList.remove('dropdown-board--closing');
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
        this.dropdown.classList.add('dropdown-board--closing');
        this.dropdown.setAttribute('aria-hidden', 'true');

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
        const width = this.dropdown.offsetWidth || 200;
        const height = this.dropdown.offsetHeight || 300;
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
            button.className = 'dropdown-board__collection-item';
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
        addButton.className = 'dropdown-board__collection-item dropdown-board__collection-item--add';
        addButton.textContent = '+';
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
                this.close();
            }
        } catch (error) {
            console.warn('Unable to toggle board', error);
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
            this.close();
        }
    }
}

App.register('dropdown_board.js', DropdownBoardComponent);
