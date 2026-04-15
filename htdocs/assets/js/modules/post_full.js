/* ----------------------------- Модуль post-full ----------------------------- */

class PostFullComponent {
    constructor() {
        this.container = null;
        this.postFullFrame = null;
        this.postFullElement = null;
        this.shareActiveTimer = null;

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
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.postFullElement = document.querySelector('.post-full');
        this.postFullFrame = this.postFullElement?.querySelector('.post-full__frame') || null;
        if (this.postFullElement) {
            this.initActionIcons();
            this.renderPostPublishedLabel();
            this.bindDescriptionToggle();
            this.bindMetaActions();
            this.bindFrameActions();
            this.syncStateFromDataset();
            this.bindBookmarkSync();
            this.bindCommentInput();
            this.syncCommentRails();
            window.addEventListener('resize', () => this.syncCommentRails());
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

    bindFrameActions() {
        this.postFullElement.addEventListener('click', async (event) => {
            const button = event.target.closest('.post-full__action-button');
            if (!button || button.disabled) return;

            const action = button.dataset.action;
            if (action === 'maximize') {
                this.openZoomOverlay();
                return;
            }

            if (action === 'warning') {
                this.openReportOverlay();
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

    bindCommentInput() {
        const commentInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input"]');
        const commentCounter = this.postFullElement?.querySelector('[data-component="post-full-comment-counter"]');
        if (!commentInput || !commentCounter) return;

        const updateCounter = () => {
            commentCounter.textContent = `${commentInput.value.length}/256`;
            this.autoResizeCommentInput(commentInput);
        };

        commentInput.addEventListener('input', updateCounter);
        commentInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Tab' && event.ctrlKey) {
                event.preventDefault();
                const start = commentInput.selectionStart ?? commentInput.value.length;
                const end = commentInput.selectionEnd ?? commentInput.value.length;
                const currentValue = commentInput.value;
                commentInput.value = `${currentValue.slice(0, start)}\n${currentValue.slice(end)}`;
                commentInput.selectionStart = commentInput.selectionEnd = start + 1;
                commentInput.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }

            if (event.key !== 'Enter' || event.shiftKey) return;

            event.preventDefault();
            await this.submitComment(commentInput);
        });

        updateCounter();
    }

    bindDescriptionToggle() {
        const description = this.postFullElement?.querySelector('[data-component="post-full-description"]');
        if (!description) return;

        const needsCollapse = description.scrollHeight > 90;
        if (!needsCollapse) return;

        description.classList.add('is-collapsed');
        description.addEventListener('click', () => {
            description.classList.remove('is-collapsed');
        }, { once: true });
    }

    renderPostPublishedLabel() {
        const element = this.postFullElement?.querySelector('[data-component="post-full-published-at"]');
        if (!element) return;

        const createdAtTs = Number(this.postFullElement?.dataset.createdAtTs || 0);
        const openedAtTs = Number(this.postFullElement?.dataset.pageOpenedTs || 0);
        if (!createdAtTs || !openedAtTs) return;

        element.textContent = this.formatRelativeTimeLabel(createdAtTs, openedAtTs);
    }

    formatRelativeTimeLabel(createdAtTs, referenceNowTs) {
        const diffSeconds = Math.max(0, Math.floor(referenceNowTs - createdAtTs));
        if (diffSeconds <= 59) {
            return `${Math.max(1, diffSeconds)} сек. назад`;
        }

        const minutes = Math.floor(diffSeconds / 60);
        if (minutes <= 59) {
            return `${minutes} мин. назад`;
        }

        const hours = Math.floor(diffSeconds / 3600);
        if (hours <= 23) {
            return `${hours} ${this.pluralizeRu(hours, 'час', 'часа', 'часов')} назад`;
        }

        const days = Math.floor(diffSeconds / 86400);
        if (days <= 3) {
            return `${days} ${this.pluralizeRu(days, 'день', 'дня', 'дней')} назад`;
        }

        const date = new Date(createdAtTs * 1000);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    pluralizeRu(value, one, few, many) {
        const mod100 = value % 100;
        if (mod100 >= 11 && mod100 <= 14) return many;
        const mod10 = value % 10;
        if (mod10 === 1) return one;
        if (mod10 >= 2 && mod10 <= 4) return few;
        return many;
    }

    autoResizeCommentInput(commentInput) {
        if (!commentInput) return;
        if (commentInput.value.trim() === '') {
            commentInput.style.height = '50px';
            return;
        }
        commentInput.style.height = 'auto';
        const nextHeight = Math.max(50, commentInput.scrollHeight);
        commentInput.style.height = `${nextHeight}px`;
    }

    syncStateFromDataset() {
        if (!this.postFullElement) return;

        const likeButton = this.postFullElement.querySelector('.post-full__meta-button[data-action="like"]');
        const bookmarkButton = this.postFullElement.querySelector('.post-full__meta-button[data-action="bookmark"]');
        const isLiked = this.postFullElement.dataset.liked === '1';
        const isBookmarked = this.postFullElement.dataset.bookmarked === '1';

        if (likeButton) {
            likeButton.classList.toggle('is-active', isLiked);
            this.setLikeIcon(likeButton, isLiked);
        }

        if (bookmarkButton) {
            bookmarkButton.classList.toggle('is-active', isBookmarked);
            this.setBookmarkIcon(bookmarkButton, isBookmarked);
        }
    }

    setLikeIcon(button, isLiked) {
        const icon = button.querySelector('[data-icon="heart"]');
        if (!icon) return;

        const iconPath = isLiked
            ? '/assets/images/icons/U-heart-fill.svg'
            : '/assets/images/icons/L-heart.svg';

        icon.setAttribute('data-svg-src', iconPath);
        App.utils.loadSVG(iconPath, icon);
    }

    setBookmarkIcon(button, isBookmarked) {
        const icon = button.querySelector('[data-icon="bookmark"]');
        if (!icon) return;

        const isOwner = this.postFullElement?.dataset.owner === '1';
        const iconPath = isBookmarked
            ? '/assets/images/icons/L-bookmark-plus.svg'
            : (isOwner ? '/assets/images/icons/U-bookmark-fill.svg' : '/assets/images/icons/L-bookmark.svg');

        icon.setAttribute('data-svg-src', iconPath);
        App.utils.loadSVG(iconPath, icon);
    }

    setShareIcon(button, isFilled) {
        const icon = button.querySelector('[data-icon="share"]');
        if (!icon) return;

        const iconPath = isFilled
            ? '/assets/images/icons/L-share-fill.svg'
            : '/assets/images/icons/L-share.svg';

        icon.setAttribute('data-svg-src', iconPath);
        App.utils.loadSVG(iconPath, icon);
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
            this.setLikeIcon(button, isLiked);
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

    async submitComment(commentInput) {
        const postId = this.getPostId();
        const text = commentInput.value.trim();
        if (!postId || !text) return;
        if (text.length > 256) {
            this.showToast('Комментарий не должен превышать 256 символов.');
            return;
        }

        commentInput.disabled = true;
        try {
            const response = await fetch('/posts/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    post_id: String(postId),
                    content: text
                }).toString()
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                this.showToast(payload?.error || 'Не удалось сохранить комментарий.');
                return;
            }

            commentInput.value = '';
            const commentCounter = this.postFullElement?.querySelector('[data-component="post-full-comment-counter"]');
            if (commentCounter) {
                commentCounter.textContent = '0/256';
            }
            this.autoResizeCommentInput(commentInput);

            const emptyMessage = this.postFullElement?.querySelector('.post-full__comments-empty');
            if (emptyMessage) {
                emptyMessage.remove();
            }

            this.prependComment({
                content: text,
                createdAtTs: Math.floor(Date.now() / 1000),
                username: String(this.postFullElement?.dataset.viewerUsername || '').trim(),
                avatarSrc: String(this.postFullElement?.dataset.viewerAvatarSrc || ''),
                profileUrl: String(this.postFullElement?.dataset.viewerProfileUrl || '/profile'),
                hasAvatar: this.postFullElement?.dataset.viewerHasAvatar === '1'
            });

            this.showToast('Комментарий добавлен');
        } catch (error) {
            console.warn('Unable to submit comment from post-full', error);
            this.showToast('Не удалось сохранить комментарий.');
        } finally {
            commentInput.disabled = false;
            commentInput.focus();
        }
    }

    prependComment(commentData) {
        const commentsList = this.postFullElement?.querySelector('[data-component="post-full-comments-list"]');
        if (!commentsList) return;

        const username = commentData.username || 'unknown';
        const profileUrl = commentData.profileUrl || '/profile';
        const avatarSrc = commentData.avatarSrc || '/uploads/avatars/avatar.jpg';
        const hasAvatar = !!commentData.hasAvatar;
        const publishedLabel = this.formatRelativeTimeLabel(commentData.createdAtTs || Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));

        const item = document.createElement('article');
        item.className = 'post-full__comment-item';
        item.innerHTML = `
            <div class="post-full__comment-side">
                <a class="post-full__author-avatar post-full__comment-avatar" href="${this.escapeHtml(profileUrl)}" aria-label="Профиль автора @${this.escapeHtml(username)}">
                    ${hasAvatar
                        ? `<img class="post-full__author-avatar-image" src="${this.escapeHtml(avatarSrc)}" alt="Аватар @${this.escapeHtml(username)}">`
                        : '<img class="post-full__author-avatar-placeholder" src="/assets/images/icons/planet.svg" alt="Профиль" width="28" height="28">'}
                </a>
                <span class="post-full__comment-rail" aria-hidden="true"></span>
            </div>
            <div class="post-full__comment-content">
                <div class="post-full__comment-meta">
                    <a class="post-full__comment-username" href="${this.escapeHtml(profileUrl)}" aria-label="Профиль автора @${this.escapeHtml(username)}">@${this.escapeHtml(username)}</a>
                    <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                    <span class="post-full__comment-published-at">${this.escapeHtml(publishedLabel)}</span>
                </div>
                <p class="post-full__comment-text">${this.escapeHtmlWithBreaks(commentData.content || '')}</p>
            </div>
        `;

        commentsList.appendChild(item);
        this.syncCommentRails();
    }

    syncCommentRails() {
        const commentItems = this.postFullElement?.querySelectorAll('.post-full__comment-item') || [];
        commentItems.forEach((item) => {
            const textElement = item.querySelector('.post-full__comment-text');
            const railElement = item.querySelector('.post-full__comment-rail');
            if (!textElement || !railElement) return;
            railElement.style.height = `${Math.max(0, Math.round(textElement.offsetHeight))}px`;
        });
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    escapeHtmlWithBreaks(value) {
        return this.escapeHtml(value).replaceAll('\n', '<br>');
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
            this.setBookmarkIcon(button, true);
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
                console.warn('Unable to copy post link from post-full', fallbackError);
            } finally {
                document.body.removeChild(fallbackTextarea);
            }

            if (copied) {
                this.markShared(button);
                this.showToast('Ссылка скопирована!');
                return;
            }

            console.warn('Unable to copy post link from post-full', error);
        }
    }

    markShared(button) {
        if (this.shareActiveTimer) {
            clearTimeout(this.shareActiveTimer);
        }

        button.classList.add('is-copied');
        this.setShareIcon(button, true);
        this.shareActiveTimer = setTimeout(() => {
            button.classList.remove('is-copied');
            this.setShareIcon(button, false);
            this.shareActiveTimer = null;
        }, 1000);
    }

    openZoomOverlay() {
        if (this.zoomOverlay) return;

        const imageSource = this.postFullElement?.querySelector('.post-full__image');
        const imageSrc = imageSource?.getAttribute('src');
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
        image.alt = imageSource?.getAttribute('alt') || 'Изображение поста';

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

            const previousScale = this.zoomScale;
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
        const previousScale = this.zoomScale;
        const clampedScale = Math.min(3, Math.max(0.5, Number(nextScale.toFixed(2))));
        if (Math.abs(clampedScale - previousScale) < 0.001) return;

        this.zoomScale = clampedScale;

        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;

        this.zoomPanX = this.calculateCenteredPanAfterScale(this.zoomPanX, viewportCenterX, previousScale, this.zoomScale);
        this.zoomPanY = this.calculateCenteredPanAfterScale(this.zoomPanY, viewportCenterY, previousScale, this.zoomScale);

        this.clampZoomPan();
        this.applyZoomTransform();
    }

    calculateCenteredPanAfterScale(currentPan, anchor, previousScale, nextScale) {
        const center = anchor;
        return center - ((center - currentPan) * (nextScale / previousScale));
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

    openReportOverlay() {
        if (!App.overlay) return;
        if (App.overlay.get('post-report')) return;

        let reportButton = null;

        App.overlay.open({
            key: 'post-report',
            overlayClass: 'post-full-report',
            hiddenClass: 'post-full-report--hidden',
            panelClass: 'post-full-report__panel',
            buildPanel: (panel, close) => {
                const text = document.createElement('p');
                text.className = 'post-full-report__text';
                text.textContent = 'Вы уверены, что хотите пожаловаться на этот пост?';

                const actions = document.createElement('div');
                actions.className = 'post-full-report__actions';

                const cancelButton = document.createElement('button');
                cancelButton.className = 'post-full-report__button post-full-report__button--cancel';
                cancelButton.type = 'button';
                cancelButton.textContent = 'Отмена';
                cancelButton.addEventListener('click', close);

                reportButton = document.createElement('button');
                reportButton.className = 'post-full-report__button post-full-report__button--confirm';
                reportButton.type = 'button';
                reportButton.textContent = 'Пожаловаться';
                reportButton.addEventListener('click', async () => {
                    await this.submitPostReport(reportButton);
                });

                actions.appendChild(cancelButton);
                actions.appendChild(reportButton);
                panel.appendChild(text);
                panel.appendChild(actions);
            }
        });
    }

    async submitPostReport(reportButton) {
        const postId = this.getPostId();
        if (!postId || !reportButton) return;

        reportButton.disabled = true;

        try {
            const response = await fetch('/posts/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ post_id: String(postId) }).toString()
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                this.showToast(payload?.error || 'Не удалось отправить жалобу.');
                return;
            }

            if (payload.already_reported) {
                this.showToast('Жалоба на рассмотрении');
            } else {
                this.showToast('Жалоба отправлена');
            }

            App.overlay?.close('post-report');
        } catch (error) {
            console.warn('Unable to report post from post-full', error);
            this.showToast('Не удалось отправить жалобу.');
        } finally {
            reportButton.disabled = false;
        }
    }

    showToast(message) {
        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message }
        }));
    }
}

App.register('post_full.js', PostFullComponent);
