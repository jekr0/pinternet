/* ----------------------------- Модуль post-full ----------------------------- */

class PostFullComponent {
    constructor() {
        this.container = null;
        this.postFullFrame = null;
        this.postFullElement = null;
        this.shareActiveTimer = null;
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.postFullElement = document.querySelector('.post-full');
        this.postFullFrame = this.postFullElement?.querySelector('.post-full__frame') || null;
        if (this.postFullElement) {
            this.initActionIcons();
            this.bindMetaActions();
            this.syncStateFromDataset();
            this.bindBookmarkSync();
        }

        const cards = Array.from(this.container.querySelectorAll('[data-component="post-card"]'));
        if (cards.length === 0) return;

        this.container.addEventListener('click', (event) => {
            const card = event.target?.closest('[data-component="post-card"]');
            if (!card || !this.container.contains(card)) return;

            if (event.target.closest('.post-card__action-button') || event.target.closest('.post-card__author-badge')) {
                return;
            }

            const postId = Number(card.dataset.postId || 0);
            if (!postId) return;

            window.location.href = `/post/${postId}`;
        });
    }

    initActionIcons() {
        if (!this.postFullElement) return;

        const iconContainers = this.postFullElement.querySelectorAll('[data-svg-src]');
        iconContainers.forEach((container) => {
            const src = container.getAttribute('data-svg-src');
            if (!src) return;
            App.utils.loadSVG(src, container);
        });
    }

    bindMetaActions() {
        this.postFullElement.addEventListener('click', async (event) => {
            const button = event.target.closest('.post-full__meta-button');
            if (!button || button.disabled) return;

            const action = button.dataset.action;
            if (action === 'like') {
                await this.toggleLike(button);
                return;
            }

            if (action === 'bookmark') {
                await this.handleBookmark(button);
                return;
            }

            if (action === 'share') {
                await this.sharePost(button);
            }
        });
    }

    bindBookmarkSync() {
        document.addEventListener('post-card:bookmark-updated', (event) => {
            const postId = Number(event.detail?.postId || 0);
            const currentPostId = Number(this.postFullElement?.dataset.postId || 0);
            if (!postId || postId !== currentPostId) return;

            this.postFullElement.dataset.bookmarked = !!event.detail?.bookmarked ? '1' : '0';
            this.syncStateFromDataset();
        });
    }

    syncStateFromDataset() {
        if (!this.postFullElement) return;

        const likeButton = this.postFullElement.querySelector('.post-full__meta-button[data-action="like"]');
        const bookmarkButton = this.postFullElement.querySelector('.post-full__meta-button[data-action="bookmark"]');
        const isLiked = this.postFullElement.dataset.liked === '1';
        const isBookmarked = this.postFullElement.dataset.bookmarked === '1';

        if (likeButton) {
            likeButton.classList.toggle('is-active', isLiked);
        }

        if (bookmarkButton) {
            bookmarkButton.classList.toggle('is-active', isBookmarked);
        }
    }

    getPostId() {
        return Number(this.postFullElement?.dataset.postId || 0);
    }

    async toggleLike(button) {
        const postId = this.getPostId();
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
            this.postFullElement.dataset.liked = isLiked ? '1' : '0';
            button.classList.toggle('is-active', isLiked);
            this.updateLikesCount(isLiked);
        } catch (error) {
            console.warn('Unable to toggle like from post-full', error);
        }
    }

    updateLikesCount(isLiked) {
        const countElement = this.postFullElement.querySelector('[data-component="post-full-like-count"]');
        if (!countElement) return;

        const currentCount = Number(countElement.textContent || 0);
        const nextCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
        countElement.textContent = String(nextCount);
    }

    async handleBookmark(button) {
        const postId = this.getPostId();
        if (!postId) return;

        const isOwner = this.postFullElement.dataset.owner === '1';
        const isBookmarked = this.postFullElement.dataset.bookmarked === '1';

        if (isBookmarked || isOwner) {
            document.dispatchEvent(new CustomEvent('dropdown-collections:open', {
                detail: { postId, card: this.postFullElement, button }
            }));
            return;
        }

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

            this.postFullElement.dataset.bookmarked = '1';
            button.classList.add('is-active');
        } catch (error) {
            console.warn('Unable to bookmark from post-full', error);
        }
    }

    async sharePost(button) {
        const postId = this.getPostId();
        if (!postId) return;

        const shareUrl = `${window.location.origin}/post/${postId}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            this.markShared(button);
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
                console.warn('Unable to copy post link from post-full', fallbackError);
            } finally {
                document.body.removeChild(fallbackTextarea);
            }

            if (copied) {
                this.markShared(button);
                return;
            }

            console.warn('Unable to copy post link from post-full', error);
        }
    }

    markShared(button) {
        if (this.shareActiveTimer) {
            clearTimeout(this.shareActiveTimer);
        }

        button.classList.add('is-active');
        this.shareActiveTimer = setTimeout(() => {
            button.classList.remove('is-active');
            this.shareActiveTimer = null;
        }, 1000);
    }
}

App.register('post_full.js', PostFullComponent);
