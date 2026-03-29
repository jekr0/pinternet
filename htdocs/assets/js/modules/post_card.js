/* --------------------------- Модуль карточки поста --------------------------- */

class PostCardComponent {
    constructor() {
        this.cards = [];
    }

    init() {
        this.cards = document.querySelectorAll('[data-component="post-card"]');
        if (this.cards.length === 0) return;

        this.cards.forEach(card => this.prepareCard(card));
    }

    prepareCard(card) {
        const image = card.querySelector('.post-card__image');
        if (!image || !image.getAttribute('src')) return;

        App.utils.loadImage(
            image.getAttribute('src'),
            () => {
                image.classList.add('post-card__image-loaded');
            },
            () => {
                console.warn('Post card image failed to load');
            }
        );
    }
}

App.register('post_card.js', PostCardComponent);
