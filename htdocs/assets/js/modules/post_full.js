/* ----------------------------- Модуль post-full ----------------------------- */

class PostFullComponent {
    constructor() {
        this.container = null;
        this.postFullImage = null;
        this.postFullFrame = null;
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.postFullFrame = document.querySelector('.post-full__frame');
        this.postFullImage = this.postFullFrame?.querySelector('.post-full__image') || null;
        this.initActionIcons();
        this.applyImageFitMode();

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

    applyImageFitMode() {
        if (!this.postFullImage || !this.postFullFrame) return;

        const updateFitMode = () => {
            const imgWidth = this.postFullImage.naturalWidth || 0;
            const imgHeight = this.postFullImage.naturalHeight || 0;
            const frameWidth = this.postFullFrame.clientWidth || 0;
            const maxFrameHeight = this.postFullFrame.clientHeight || 700;

            if (!imgWidth || !imgHeight || !frameWidth) return;

            this.postFullImage.classList.remove('post-full__image--fit-height', 'post-full__image--fit-width');

            if (imgWidth < frameWidth) {
                this.postFullImage.classList.add('post-full__image--fit-height');
                return;
            }

            if (imgWidth > frameWidth && imgHeight < maxFrameHeight) {
                this.postFullImage.classList.add('post-full__image--fit-width');
                return;
            }

            this.postFullImage.classList.add('post-full__image--fit-height');
        };

        if (this.postFullImage.complete) {
            updateFitMode();
        } else {
            this.postFullImage.addEventListener('load', updateFitMode, { once: true });
        }

        window.addEventListener('resize', updateFitMode);
    }

    initActionIcons() {
        if (!this.postFullFrame) return;

        const iconContainers = this.postFullFrame.querySelectorAll('[data-svg-src]');
        iconContainers.forEach((container) => {
            const src = container.getAttribute('data-svg-src');
            if (!src) return;
            App.utils.loadSVG(src, container);
        });
    }
}

App.register('post_full.js', PostFullComponent);
