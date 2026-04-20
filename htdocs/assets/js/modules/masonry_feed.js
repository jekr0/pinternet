/* --------------------------- Masonry-лента постов --------------------------- */

class MasonryFeedComponent {
    constructor() {
        this.container = null;
        this.cards = [];
        this.columns = 7;
        this.edgeGap = 25;
        this.verticalGap = 20;
        this.topOffset = 110;
        this.minHorizontalGap = 12;
        this.resizeHandler = null;
        this.imageLoadHandler = null;
        this.postFullToggleHandler = null;
        this.postFullResizeHandler = null;
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.cards = Array.from(this.container.querySelectorAll('.post-card'));
        if (this.cards.length === 0) return;

        this.layout();

        this.resizeHandler = () => this.layout();
        window.addEventListener('resize', this.resizeHandler);
        this.postFullToggleHandler = () => this.layout();
        document.addEventListener('post-full:toggle', this.postFullToggleHandler);
        this.postFullResizeHandler = () => this.layout();
        document.addEventListener('post-full:resize', this.postFullResizeHandler);

        this.imageLoadHandler = () => this.layout();
        this.cards.forEach((card) => {
            const image = card.querySelector('.post-card__image');
            if (!image) return;

            if (!image.complete) {
                image.addEventListener('load', this.imageLoadHandler);
                image.addEventListener('error', this.imageLoadHandler);
            }
        });
    }

    layout() {
        if (!this.container || this.cards.length === 0) return;

        const containerWidth = this.container.clientWidth;
        if (containerWidth <= 0) return;

        const availableWidth = containerWidth - this.edgeGap * 2;
        if (availableWidth <= 0) return;

        const totalMinGaps = this.minHorizontalGap * (this.columns - 1);
        const cardWidth = Math.max(120, Math.floor((availableWidth - totalMinGaps) / this.columns));
        const computedHorizontalGap = (availableWidth - cardWidth * this.columns) / (this.columns - 1);
        const horizontalGap = Math.max(this.minHorizontalGap, computedHorizontalGap);

        const columnHeights = Array(this.columns).fill(this.topOffset);
        const postFull = this.container.querySelector('[data-component="post-full"]');
        const isPostFullOpen = !!postFull && postFull.classList.contains('is-open');
        if (isPostFullOpen) {
            const postFullWidth = cardWidth * 4 + horizontalGap * 3;
            postFull.style.left = `${this.edgeGap}px`;
            postFull.style.top = `${this.topOffset}px`;
            postFull.style.width = `${Math.round(postFullWidth)}px`;

            const reservedHeight = Math.max(postFull.offsetHeight || 0, 0) + this.verticalGap;
            for (let i = 0; i < Math.min(4, columnHeights.length); i += 1) {
                columnHeights[i] = this.topOffset + reservedHeight;
            }
        }

        this.cards.forEach((card) => {
            if (card.classList.contains('post-card--post-full-active')) return;

            card.style.setProperty('--post-card-width', `${cardWidth}px`);

            let targetColumn = 0;
            for (let i = 1; i < this.columns; i += 1) {
                if (columnHeights[i] < columnHeights[targetColumn]) {
                    targetColumn = i;
                }
            }

            const x = this.edgeGap + targetColumn * (cardWidth + horizontalGap);
            const y = columnHeights[targetColumn];

            card.style.left = `${x}px`;
            card.style.top = `${y}px`;

            const cardHeight = card.offsetHeight;
            columnHeights[targetColumn] = y + cardHeight + this.verticalGap;
        });

        const maxHeight = Math.max(...columnHeights);
        this.container.style.height = `${Math.max(this.topOffset, maxHeight - this.verticalGap)}px`;
    }
}

App.register('masonry_feed.js', MasonryFeedComponent);
