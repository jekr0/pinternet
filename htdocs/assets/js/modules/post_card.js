/* --------------------------- Модуль карточки поста --------------------------- */

class PostCardComponent {
    constructor() {
        this.cards = [];
    }

    init() {
        this.cards = Array.from(document.querySelectorAll('[data-component="post-card"]'));
        if (this.cards.length === 0) return;

        this.cards.forEach((card) => {
            this.prepareCard(card);
            this.bindActions(card);
        });
    }

    prepareCard(card) {
        this.loadIcons(card);

        const likeButton = card.querySelector('[data-action="like"]');
        const bookmarkButton = card.querySelector('[data-action="bookmark"]');

        if (likeButton && card.dataset.liked === '1') {
            likeButton.classList.add('is-active');
        }

        if (bookmarkButton && card.dataset.bookmarked === '1') {
            bookmarkButton.classList.add('is-active');
            this.setBookmarkIcon(bookmarkButton, true);
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
            if (!button) return;

            const action = button.dataset.action;
            if (action === 'like') {
                await this.toggleLike(card, button);
                return;
            }

            if (action === 'bookmark') {
                this.toggleBookmark(card, button);
                return;
            }

            if (action === 'share') {
                this.sharePost(card);
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
            if (!response.ok || !payload.success) {
                return;
            }

            const isLiked = !!payload.liked;
            card.dataset.liked = isLiked ? '1' : '0';
            button.classList.toggle('is-active', isLiked);
        } catch (error) {
            console.warn('Unable to toggle like', error);
        }
    }

    toggleBookmark(card, button) {
        const isActive = !button.classList.contains('is-active');
        button.classList.toggle('is-active', isActive);
        card.dataset.bookmarked = isActive ? '1' : '0';
        this.setBookmarkIcon(button, isActive);
    }

    setBookmarkIcon(button, isPlus) {
        const icon = button.querySelector('[data-icon="bookmark"]');
        if (!icon) return;
        const iconPath = isPlus ? 'assets/images/icons/bookmark-plus.svg' : 'assets/images/icons/bookmark.svg';
        icon.setAttribute('data-svg-src', iconPath);
        App.utils.loadSVG(iconPath, icon);
    }

    async sharePost(card) {
        const postId = Number(card.dataset.postId || 0);
        if (!postId) return;

        const shareUrl = `${window.location.origin}/post/${postId}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch (error) {
            console.warn('Unable to copy post link', error);
        }
    }
}

App.register('post_card.js', PostCardComponent);
