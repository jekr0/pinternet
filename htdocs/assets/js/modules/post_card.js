/* --------------------------- Модуль карточки поста --------------------------- */

class PostCardComponent {
    constructor() {
        this.cards = [];
        this.toast = null;
        this.toastFadeTimer = null;
        this.toastHideTimer = null;
        this.shareActiveTimers = new WeakMap();
    }

    init() {
        this.cards = Array.from(document.querySelectorAll('[data-component="post-card"]'));
        if (this.cards.length === 0) return;

        this.toast = document.querySelector('[data-component="create-post-success-toast"]');

        this.cards.forEach((card) => {
            this.prepareCard(card);
            this.bindActions(card);
        });
    }

    prepareCard(card) {
        this.loadIcons(card);

        const likeButton = card.querySelector('[data-action="like"]');
        const bookmarkButton = card.querySelector('[data-action="bookmark"]');
        const isOwner = card.dataset.owner === '1';

        if (likeButton && card.dataset.liked === '1') {
            likeButton.classList.add('is-active');
        }

        if (bookmarkButton) {
            if (isOwner) {
                bookmarkButton.disabled = true;
                bookmarkButton.classList.remove('is-active');
                this.setBookmarkIcon(bookmarkButton, 'block');
            } else if (card.dataset.bookmarked === '1') {
                bookmarkButton.classList.add('is-active');
                this.setBookmarkIcon(bookmarkButton, 'plus');
            }
        }
    }

    loadIcons(card) {
        const iconContainers = card.querySelectorAll('[data-svg-src]');
        iconContainers.forEach((container) => {
            const src = container.getAttribute('data-svg-src');
            if (!src) return;
            App.utils.loadSVG(src, container);
        });
    }

    bindActions(card) {
        card.addEventListener('click', async (event) => {
            const button = event.target.closest('.post-card__action-button');
            if (!button || button.disabled) return;

            const action = button.dataset.action;
            if (action === 'like') {
                await this.toggleLike(card, button);
                return;
            }

            if (action === 'bookmark') {
                await this.handleBookmark(card, button);
                return;
            }

            if (action === 'share') {
                await this.sharePost(card);
            }
        });
    }

    async toggleLike(card, button) {
        const postId = Number(card.dataset.postId || 0);
        if (!postId) return;

        try {
            const response = await fetch('/posts/like', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ post_id: String(postId) }).toString()
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) return;

            const isLiked = !!payload.liked;
            card.dataset.liked = isLiked ? '1' : '0';
            button.classList.toggle('is-active', isLiked);
        } catch (error) {
            console.warn('Unable to toggle like', error);
        }
    }

    async handleBookmark(card, button) {
        if (card.dataset.owner === '1') return;

        if (card.dataset.bookmarked === '1') {
            this.openBookmarkDropdownPlaceholder();
            return;
        }

        const postId = Number(card.dataset.postId || 0);
        if (!postId) return;

        try {
            const response = await fetch('/posts/bookmark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ post_id: String(postId) }).toString()
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) return;

            card.dataset.bookmarked = '1';
            button.classList.add('is-active');
            this.setBookmarkIcon(button, 'plus');
        } catch (error) {
            console.warn('Unable to bookmark post', error);
        }
    }

    setBookmarkIcon(button, type) {
        const icon = button.querySelector('[data-icon="bookmark"]');
        if (!icon) return;

        const iconPath = type === 'block'
            ? 'assets/images/icons/bookmark-block.svg'
            : type === 'plus'
                ? 'assets/images/icons/bookmark-plus.svg'
                : 'assets/images/icons/bookmark.svg';

        icon.setAttribute('data-svg-src', iconPath);
        App.utils.loadSVG(iconPath, icon);
    }

    openBookmarkDropdownPlaceholder() {
        console.info('Bookmark dropdown menu will be added in a future task.');
    }

    async sharePost(card) {
        const postId = Number(card.dataset.postId || 0);
        if (!postId) return;

        const shareUrl = `${window.location.origin}/post/${postId}`;
        const shareButton = card.querySelector('[data-action="share"]');
        const markShared = () => {
            if (!shareButton) return;

            const existingTimer = this.shareActiveTimers.get(shareButton);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            shareButton.classList.add('is-copied');
            const timer = setTimeout(() => {
                shareButton.classList.remove('is-copied');
                this.shareActiveTimers.delete(shareButton);
            }, 1000);

            this.shareActiveTimers.set(shareButton, timer);
        };

        try {
            await navigator.clipboard.writeText(shareUrl);
            markShared();
            this.showToast('Ссылка скопирована!');
        } catch (error) {
            const fallbackTextarea = document.createElement('textarea');
            fallbackTextarea.value = shareUrl;
            fallbackTextarea.setAttribute('readonly', '');
            fallbackTextarea.style.position = 'absolute';
            fallbackTextarea.style.left = '-9999px';
            document.body.appendChild(fallbackTextarea);
            fallbackTextarea.select();

            let copied = false;
            try {
                copied = document.execCommand('copy');
            } catch (fallbackError) {
                console.warn('Unable to copy post link', fallbackError);
            } finally {
                document.body.removeChild(fallbackTextarea);
            }

            if (copied) {
                markShared();
                this.showToast('Ссылка скопирована!');
                return;
            }

            console.warn('Unable to copy post link', error);
        }
    }

    showToast(message) {
        if (!this.toast) return;

        clearTimeout(this.toastFadeTimer);
        clearTimeout(this.toastHideTimer);

        this.toast.textContent = message;
        this.toast.classList.remove('create-post-success-toast--hidden', 'create-post-success-toast--fade-out');

        this.toastFadeTimer = setTimeout(() => {
            this.toast.classList.add('create-post-success-toast--fade-out');
        }, 500);

        this.toastHideTimer = setTimeout(() => {
            this.toast.classList.add('create-post-success-toast--hidden');
            this.toast.classList.remove('create-post-success-toast--fade-out');
            this.toast.textContent = '';
        }, 1000);
    }
}

App.register('post_card.js', PostCardComponent);
