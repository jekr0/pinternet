/* --------------------------- Модуль profile-full --------------------------- */

class ProfileFullComponent {
    constructor() {
        this.root = null;
        this.avatar = null;
        this.zoomOverlay = null;
        this.zoomImage = null;
        this.zoomScale = 1;
        this.zoomHideTimer = null;
        this.zoomBaseWidth = 0;
        this.zoomBaseHeight = 0;
        this.zoomResizeHandler = null;
        this.zoomDragMoveHandler = null;
        this.zoomDragEndHandler = null;
        this.zoomDragging = false;
        this.zoomDragStartX = 0;
        this.zoomDragStartY = 0;
        this.zoomPanX = 0;
        this.zoomPanY = 0;
        this.zoomStartPanX = 0;
        this.zoomStartPanY = 0;
        this.clickHandler = null;
    }

    init() {
        this.root = document.querySelector('[data-component="profile-full"]');
        if (!this.root) return;

        this.avatar = this.root.querySelector('[data-profile-full-avatar]');
        this.initSvgIcons();
        this.bindActions();
    }

    initSvgIcons() {
        this.root.querySelectorAll('[data-svg-src]').forEach((node) => {
            const src = node.getAttribute('data-svg-src');
            if (src) {
                App.utils.loadSVG(src, node);
            }
        });
    }

    bindActions() {
        this.clickHandler = (event) => {
            const button = event.target.closest('[data-action="maximize-avatar"]');
            if (!button || button.disabled) return;

            event.preventDefault();
            this.openZoomOverlay();
        };

        this.root.addEventListener('click', this.clickHandler);
    }

    openZoomOverlay() {
        if (this.zoomOverlay || !this.avatar) return;

        const imageSrc = this.avatar.dataset.zoomSrc || '';
        if (!imageSrc) return;

        this.zoomScale = 1;
        this.zoomPanX = 0;
        this.zoomPanY = 0;

        const overlay = document.createElement('div');
        overlay.className = 'post-full-zoom post-full-zoom--hidden';

        const content = document.createElement('div');
        content.className = 'post-full-zoom__content';

        const image = document.createElement('img');
        image.className = 'post-full-zoom__image';
        image.src = imageSrc;
        image.alt = 'Аватар пользователя';

        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'post-full__action-button post-full-zoom__minimize';
        minimizeButton.type = 'button';
        minimizeButton.setAttribute('aria-label', 'Свернуть');

        const minimizeIcon = document.createElement('span');
        minimizeIcon.className = 'post-full__action-icon';
        minimizeIcon.setAttribute('aria-hidden', 'true');
        App.utils.loadSVG('/assets/images/icons/minimize.svg', minimizeIcon);

        minimizeButton.appendChild(minimizeIcon);
        content.appendChild(image);
        content.appendChild(minimizeButton);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        App.utils.lockBodyScroll();

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.closeZoomOverlay();
            }
        });

        minimizeButton.addEventListener('click', () => {
            this.closeZoomOverlay();
        });

        overlay.addEventListener('wheel', (event) => {
            if (!event.ctrlKey) return;
            event.preventDefault();

            const nextScale = this.zoomScale + (event.deltaY < 0 ? 0.1 : -0.1);
            this.setZoomScale(nextScale);
        }, { passive: false });

        this.zoomOverlay = overlay;
        this.zoomImage = image;
        this.zoomResizeHandler = () => {
            this.calculateZoomBaseSize();
            this.clampZoomPan();
            this.applyZoomTransform();
        };
        this.zoomDragMoveHandler = (event) => {
            if (!this.zoomOverlay || !this.zoomDragging) return;

            this.zoomPanX = this.zoomStartPanX + (event.clientX - this.zoomDragStartX);
            this.zoomPanY = this.zoomStartPanY + (event.clientY - this.zoomDragStartY);
            this.clampZoomPan();
            this.applyZoomTransform();
        };
        this.zoomDragEndHandler = () => {
            if (!this.zoomOverlay || !this.zoomDragging) return;
            this.zoomDragging = false;
            this.zoomOverlay.classList.remove('is-dragging');
        };

        image.addEventListener('load', () => {
            this.calculateZoomBaseSize();
            this.zoomPanX = 0;
            this.zoomPanY = 0;
            this.applyZoomTransform();
        }, { once: true });

        if (image.complete) {
            this.calculateZoomBaseSize();
            this.zoomPanX = 0;
            this.zoomPanY = 0;
            this.applyZoomTransform();
        }

        overlay.addEventListener('mousedown', (event) => {
            if (event.button !== 0 || !this.zoomOverlay || this.zoomScale <= 1) return;
            if (event.target.closest('.post-full-zoom__minimize')) return;

            this.zoomDragging = true;
            this.zoomDragStartX = event.clientX;
            this.zoomDragStartY = event.clientY;
            this.zoomStartPanX = this.zoomPanX;
            this.zoomStartPanY = this.zoomPanY;
            this.zoomOverlay.classList.add('is-dragging');
            event.preventDefault();
        });

        window.addEventListener('mousemove', this.zoomDragMoveHandler);
        window.addEventListener('mouseup', this.zoomDragEndHandler);
        window.addEventListener('resize', this.zoomResizeHandler);

        void overlay.offsetWidth;
        window.setTimeout(() => {
            overlay.classList.remove('post-full-zoom--hidden');
        }, 10);
    }

    closeZoomOverlay() {
        if (!this.zoomOverlay) return;

        const overlay = this.zoomOverlay;
        overlay.classList.add('post-full-zoom--hidden');

        clearTimeout(this.zoomHideTimer);
        this.zoomHideTimer = setTimeout(() => {
            if (this.zoomResizeHandler) {
                window.removeEventListener('resize', this.zoomResizeHandler);
            }
            if (this.zoomDragMoveHandler) {
                window.removeEventListener('mousemove', this.zoomDragMoveHandler);
            }
            if (this.zoomDragEndHandler) {
                window.removeEventListener('mouseup', this.zoomDragEndHandler);
            }

            this.zoomDragging = false;
            App.utils.unlockBodyScroll();
            overlay.remove();

            if (this.zoomOverlay === overlay) {
                this.zoomOverlay = null;
                this.zoomImage = null;
                this.zoomScale = 1;
                this.zoomBaseWidth = 0;
                this.zoomBaseHeight = 0;
                this.zoomPanX = 0;
                this.zoomPanY = 0;
                this.zoomResizeHandler = null;
                this.zoomDragMoveHandler = null;
                this.zoomDragEndHandler = null;
            }
        }, 200);
    }

    calculateZoomBaseSize() {
        if (!this.zoomImage) return;

        const naturalWidth = this.zoomImage.naturalWidth || 0;
        const naturalHeight = this.zoomImage.naturalHeight || 0;
        if (naturalWidth <= 0 || naturalHeight <= 0) return;

        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;
        const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);

        this.zoomBaseWidth = Math.max(1, Math.round(naturalWidth * ratio));
        this.zoomBaseHeight = Math.max(1, Math.round(naturalHeight * ratio));

        this.zoomImage.style.width = `${this.zoomBaseWidth}px`;
        this.zoomImage.style.height = `${this.zoomBaseHeight}px`;
    }

    setZoomScale(nextScale) {
        const clampedScale = Math.min(3, Math.max(0.5, Number(nextScale.toFixed(2))));
        if (Math.abs(clampedScale - this.zoomScale) < 0.001) return;

        this.zoomScale = clampedScale;
        this.zoomPanX = 0;
        this.zoomPanY = 0;

        this.clampZoomPan();
        this.applyZoomTransform();
    }

    clampZoomPan() {
        if (!this.zoomOverlay || this.zoomBaseWidth <= 0 || this.zoomBaseHeight <= 0) return;

        const scaledWidth = this.zoomBaseWidth * this.zoomScale;
        const scaledHeight = this.zoomBaseHeight * this.zoomScale;

        const maxOffsetX = Math.max(0, (scaledWidth - window.innerWidth) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - window.innerHeight) / 2);

        this.zoomPanX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.zoomPanX));
        this.zoomPanY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.zoomPanY));
    }

    applyZoomTransform() {
        if (!this.zoomImage || !this.zoomOverlay) return;

        this.zoomImage.style.transform = `translate3d(${Math.round(this.zoomPanX)}px, ${Math.round(this.zoomPanY)}px, 0) scale(${this.zoomScale})`;
        this.zoomOverlay.classList.toggle('can-pan', this.zoomScale > 1);
    }

    destroy() {
        if (this.root && this.clickHandler) {
            this.root.removeEventListener('click', this.clickHandler);
        }
        this.closeZoomOverlay();
        clearTimeout(this.zoomHideTimer);
    }
}

App.register('profile_full.js', ProfileFullComponent);
