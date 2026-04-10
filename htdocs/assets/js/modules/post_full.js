/* ----------------------------- Модуль post-full ----------------------------- */

class PostFullComponent {
    constructor() {
        this.container = null;
        this.cards = [];
        this.panel = null;
        this.image = null;
        this.activeCard = null;
        this.baseTop = 120;
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.cards = Array.from(this.container.querySelectorAll('[data-component="post-card"]'));
        if (this.cards.length === 0) return;

        this.createPanel();

        this.container.addEventListener('click', (event) => {
            const card = event.target?.closest('[data-component="post-card"]');
            if (!card || !this.container.contains(card)) return;

            if (event.target.closest('.post-card__action-button') || event.target.closest('.post-card__author-badge')) {
                return;
            }

            this.open(card);
        });
    }

    createPanel() {
        if (this.panel) return;

        this.panel = document.createElement('section');
        this.panel.className = 'post-full';
        this.panel.dataset.component = 'post-full';
        this.panel.setAttribute('aria-hidden', 'true');

        const frame = document.createElement('div');
        frame.className = 'post-full__frame';

        this.image = document.createElement('img');
        this.image.className = 'post-full__image';
        this.image.alt = 'Изображение поста';

        frame.appendChild(this.image);
        this.panel.appendChild(frame);
        this.container.appendChild(this.panel);
    }

    open(card) {
        if (!this.panel || !this.image) return;
        if (this.activeCard) {
            this.activeCard.classList.remove('post-card--post-full-active');
        }

        this.activeCard = card;
        this.activeCard.classList.add('post-card--post-full-active');

        const sourceImage = card.querySelector('.post-card__image');
        if (sourceImage) {
            this.image.src = sourceImage.currentSrc || sourceImage.src;
        }

        this.panel.style.left = '24px';
        this.panel.style.top = `${this.baseTop}px`;
        this.panel.classList.add('is-open');
        this.panel.setAttribute('aria-hidden', 'false');

        document.dispatchEvent(new CustomEvent('post-full:toggle', {
            detail: { isOpen: true }
        }));
    }
}

App.register('post_full.js', PostFullComponent);
