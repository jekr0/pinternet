/* ----------------------------- Модуль post-full ----------------------------- */

class PostFullComponent {
    constructor() {
        this.container = null;
        this.postFullFrame = null;
        this.postFullElement = null;
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.postFullElement = document.querySelector('.post-full');
        this.postFullFrame = this.postFullElement?.querySelector('.post-full__frame') || null;
        this.initActionIcons();

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
}

App.register('post_full.js', PostFullComponent);
