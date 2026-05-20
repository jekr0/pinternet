/* ----------------------------- Модуль post-full ----------------------------- */

class PostFullComponent {
    constructor() {
        this.container = null;
        this.postFullFrame = null;
        this.postFullElement = null;
        this.shareActiveTimer = null;
        this.relativeTimeTimer = null;
        this.serverNowTs = 0;
        this.clientNowMsAtInit = 0;

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
        this.replyTargetCommentId = 0;
        this.replyTargetRootCommentId = 0;
        this.replyTargetUsername = '';
        this.commentComposerMode = 'reply';
        this.editingCommentElement = null;
        this.pendingCommentReportId = 0;
        this.descriptionElement = null;
        this.descriptionHideButton = null;
        this.descriptionDividerButton = null;
        this.descriptionDividerElement = null;
        this.descriptionSupportsCollapse = false;
        this.descriptionExpanded = false;
        this.descriptionHideScrollHandler = null;
        this.commentsHideButton = null;
        this.commentsHideScrollHandler = null;
        this.commentsExpanded = false;
        this.tagsResizeHandler = null;
        this.scrollTopButton = null;
        this.scrollTopButtonHandler = null;
        this.scrollTopHideTimer = null;
        this.commentInputFloatingHandler = null;
        this.postEditMode = false;
        this.descriptionEditor = null;
    }

    init() {
        this.container = document.querySelector('[data-component="masonry-feed"]');
        if (!this.container) return;

        this.postFullElement = document.querySelector('.post-full');
        this.postFullFrame = this.postFullElement?.querySelector('.post-full__frame') || null;
        if (this.postFullElement) {
            this.prepareCommentComposerStateNodes();
            this.initReferenceClock();
            this.initActionIcons();
            this.renderRelativeTimeLabels();
            this.startRelativeTimeUpdater();
            this.bindDescriptionToggle();
            this.bindMetaActions();
            this.bindFrameActions();
            this.syncStateFromDataset();
            this.bindBookmarkSync();
            this.bindPostModalSync();
            this.bindCommentInput();
            this.bindCommentActions();
            this.bindReplyStateCancel();
            this.bindCommentsToggle();
            this.bindCommentChildrenToggle();
            this.applyCommentsPreviewState();
            this.applyCommentChildrenState();
            this.refreshReplyCounters();
            this.syncCommentRails();
            this.layoutPostTags();
            window.addEventListener('resize', () => this.syncCommentRails());
            this.tagsResizeHandler = () => this.layoutPostTags();
            window.addEventListener('resize', this.tagsResizeHandler);
            this.descriptionHideScrollHandler = () => this.updateDescriptionHideButtonPosition();
            window.addEventListener('scroll', this.descriptionHideScrollHandler, { passive: true });
            window.addEventListener('resize', this.descriptionHideScrollHandler);
            this.commentInputFloatingHandler = () => this.updateCommentInputFloatingPosition();
            window.addEventListener('scroll', this.commentInputFloatingHandler, { passive: true });
            window.addEventListener('resize', this.commentInputFloatingHandler);
            this.commentsHideScrollHandler = () => this.updateCommentsHideButtonPosition();
            window.addEventListener('scroll', this.commentsHideScrollHandler, { passive: true });
            window.addEventListener('resize', this.commentsHideScrollHandler);
            this.initScrollTopButton();
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

    // Инициализирует опорное серверное время, чтобы убрать влияние неверных часов на клиенте.
    initReferenceClock() {
        const datasetServerNowTs = Number(this.postFullElement?.dataset.serverNowTs || 0);
        this.serverNowTs = Number.isFinite(datasetServerNowTs) && datasetServerNowTs > 0
            ? Math.floor(datasetServerNowTs)
            : Math.floor(Date.now() / 1000);
        this.clientNowMsAtInit = Date.now();
    }

    // Возвращает текущее время (в секундах) на основе серверного времени + прошедшего времени на клиенте.
    getReferenceNowTs() {
        if (!this.clientNowMsAtInit || !this.serverNowTs) {
            return Math.floor(Date.now() / 1000);
        }

        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.clientNowMsAtInit) / 1000));
        return this.serverNowTs + elapsedSeconds;
    }

    // Обновляет все подписи времени для поста и комментариев.
    renderRelativeTimeLabels() {
        if (!this.postFullElement) return;

        const nowTs = this.getReferenceNowTs();
        const timeNodes = this.postFullElement.querySelectorAll('[data-created-at-ts]');
        timeNodes.forEach((node) => {
            const createdAtTs = this.normalizeUnixTimestamp(node.dataset.createdAtTs);
            if (!createdAtTs) return;
            node.textContent = this.formatRelativeTimeLabel(createdAtTs, nowTs);
        });
    }

    // Запускает периодическое обновление подписей времени.
    startRelativeTimeUpdater() {
        if (this.relativeTimeTimer) {
            clearInterval(this.relativeTimeTimer);
        }

        this.relativeTimeTimer = setInterval(() => {
            this.renderRelativeTimeLabels();
        }, 30_000);
    }

    // Нормализует timestamp (секунды/миллисекунды) и защищает от некорректных значений.
    normalizeUnixTimestamp(rawTimestamp) {
        const parsed = Number(rawTimestamp || 0);
        if (!Number.isFinite(parsed) || parsed <= 0) return 0;

        const normalized = parsed > 1_000_000_000_000 ? Math.floor(parsed / 1000) : Math.floor(parsed);
        return normalized > 0 ? normalized : 0;
    }

    // Инициализирует SVG-иконки в блоке поста.
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
            if (action === 'back') {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '/';
                }
                return;
            }

            if (action === 'maximize') {
                this.openZoomOverlay();
                return;
            }

            if (action === 'warning') {
                this.openReportOverlay();
                return;
            }

            if (action === 'edit') {
                this.togglePostEditMode();
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


    bindPostModalSync() {
        document.addEventListener('post-modal:updated', (event) => {
            const postId = Number(event.detail?.post_id || 0);
            const currentPostId = Number(this.postFullElement?.dataset.postId || 0);
            if (!postId || postId !== currentPostId) return;
            window.location.reload();
        });

        document.addEventListener('post-modal:deleted', (event) => {
            const postId = Number(event.detail?.post_id || 0);
            const currentPostId = Number(this.postFullElement?.dataset.postId || 0);
            if (!postId || postId !== currentPostId) return;
            window.location.href = '/';
        });
    }

    bindCommentInput() {
        const commentInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input"]');
        const commentCounter = this.postFullElement?.querySelector('[data-component="post-full-comment-counter"]');
        if (!commentInput || !commentCounter) return;
        const staticWrap = commentInput.closest('.post-full__comment-input-wrap');
        if (!staticWrap) return;

        let floatingWrap = this.postFullElement.querySelector('[data-component="post-full-comment-input-floating-wrap"]');
        let floatingInput = floatingWrap?.querySelector('[data-component="post-full-comment-input-floating"]') || null;
        let floatingCounter = floatingWrap?.querySelector('[data-component="post-full-comment-counter-floating"]') || null;

        if (!floatingWrap) {
            floatingWrap = document.createElement('div');
            floatingWrap.className = 'post-full__comment-input-wrap post-full__comment-input-wrap--floating';
            floatingWrap.dataset.component = 'post-full-comment-input-floating-wrap';
            floatingWrap.innerHTML = `
                <div class="post-full__comment-reply-state" data-component="post-full-reply-state-floating" aria-live="polite">
                    <button class="post-full__comment-reply-cancel" type="button" data-action="reply-cancel" aria-label="Отменить ответ">×</button>
                    <span class="post-full__comment-reply-text">
                        <span data-component="post-full-reply-prefix-floating">Ответ пользователю</span> <span class="post-full__comment-reply-nickname" data-component="post-full-reply-nickname-floating"></span>
                    </span>
                </div>
                <textarea class="post-full__comment-input" data-component="post-full-comment-input-floating" placeholder="Оставить комментарий" maxlength="256" aria-label="Оставить комментарий"></textarea>
                <span class="post-full__comment-counter" data-component="post-full-comment-counter-floating">0/256</span>
            `;
            this.postFullElement.appendChild(floatingWrap);
            floatingInput = floatingWrap.querySelector('[data-component="post-full-comment-input-floating"]');
            floatingCounter = floatingWrap.querySelector('[data-component="post-full-comment-counter-floating"]');
        }

        const syncTextAndCounters = (sourceInput, targetInput) => {
            if (targetInput && targetInput.value !== sourceInput.value) {
                targetInput.value = sourceInput.value;
            }
            const value = sourceInput.value;
            commentCounter.textContent = `${value.length}/256`;
            if (floatingCounter) {
                floatingCounter.textContent = `${value.length}/256`;
            }
            this.autoResizeCommentInput(commentInput);
            if (floatingInput) {
                this.autoResizeCommentInput(floatingInput);
            }
            if (this.commentsExpanded) {
                this.updateCommentInputFloatingPosition();
            }
        };

        const bindInputHandlers = (input, mirrorInput) => {
            if (!input) return;
            input.addEventListener('input', () => syncTextAndCounters(input, mirrorInput));
            input.addEventListener('keydown', async (event) => {
            if (event.key === 'Tab' && event.ctrlKey) {
                event.preventDefault();
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                const currentValue = input.value;
                input.value = `${currentValue.slice(0, start)}\n${currentValue.slice(end)}`;
                input.selectionStart = input.selectionEnd = start + 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }

            if (event.key !== 'Enter' || event.shiftKey) return;

            event.preventDefault();
            await this.submitComment(input);
        });
        };

        bindInputHandlers(commentInput, floatingInput);
        bindInputHandlers(floatingInput, commentInput);
        syncTextAndCounters(commentInput, floatingInput);
    }

    prepareCommentComposerStateNodes() {
        const stateBlocks = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-state"], [data-component="post-full-reply-state-floating"]');
        stateBlocks?.forEach((block) => {
            const textNode = block.querySelector('.post-full__comment-reply-text');
            if (!textNode) return;
            const componentSuffix = block.dataset.component === 'post-full-reply-state-floating' ? '-floating' : '';
            let valueNode = textNode.querySelector('[data-component="post-full-reply-nickname"], [data-component="post-full-reply-nickname-floating"]');
            if (!valueNode) {
                valueNode = document.createElement('span');
                valueNode.className = 'post-full__comment-reply-nickname';
                valueNode.dataset.component = `post-full-reply-nickname${componentSuffix}`;
            }

            textNode.textContent = '';
            const prefixNode = document.createElement('span');
            prefixNode.dataset.component = `post-full-reply-prefix${componentSuffix}`;
            prefixNode.textContent = 'Ответ пользователю';
            textNode.append(prefixNode, document.createTextNode(' '), valueNode);
        });
    }

    bindCommentActions() {
        if (!this.postFullElement) return;

        this.postFullElement.addEventListener('click', async (event) => {
            const button = event.target.closest('.post-full__comment-action-button');
            if (!button || button.disabled) return;

            const action = button.dataset.action;
            const commentItem = button.closest('.post-full__comment-item');
            const commentId = Number(commentItem?.dataset.commentId || 0);
            const rootCommentId = Number(commentItem?.dataset.rootCommentId || 0);
            const commentUsername = String(commentItem?.dataset.commentUsername || '').trim();

            if (!commentId) return;

            if (action === 'comment-like') {
                await this.toggleCommentLike(button, commentId);
                return;
            }

            if (action === 'comment-report') {
                this.openCommentReportOverlay(commentId);
                return;
            }

            if (action === 'comment-reply') {
                this.activateReplyState(commentId, rootCommentId, commentUsername);
                return;
            }

            if (action === 'comment-edit') {
                this.activateCommentEditState(commentItem);
            }
        });
    }

    bindReplyStateCancel() {
        const cancelButtons = this.postFullElement?.querySelectorAll('[data-action="reply-cancel"]');
        if (!cancelButtons || cancelButtons.length === 0) return;

        cancelButtons.forEach((cancelButton) => {
            if (cancelButton.dataset.bound === '1') return;
            cancelButton.dataset.bound = '1';
            cancelButton.addEventListener('click', () => {
                this.clearReplyState();
            });
        });
    }

    bindDescriptionToggle() {
        this.descriptionElement = this.postFullElement?.querySelector('[data-component="post-full-description"]') || null;
        this.descriptionDividerElement = this.postFullElement?.querySelector('[data-component="post-full-description-divider"]') || null;
        if (!this.descriptionElement) return;

        this.descriptionSupportsCollapse = this.descriptionElement.scrollHeight > 90;
        if (!this.descriptionSupportsCollapse) {
            this.descriptionElement.classList.remove('is-collapsed');
            this.hideDescriptionHideButton();
            return;
        }

        this.ensureDescriptionHideButtons();
        this.descriptionExpanded = false;
        this.descriptionElement.classList.add('is-collapsed');
        this.hideDescriptionHideButton();
        this.descriptionElement.addEventListener('click', () => {
            if (!this.descriptionSupportsCollapse || this.descriptionExpanded) return;
            this.expandDescription();
        });
    }

    ensureDescriptionHideButtons() {
        if (!this.postFullElement || !this.descriptionDividerElement) return;

        if (!this.descriptionDividerButton) {
            const leftLine = document.createElement('span');
            leftLine.className = 'post-full__description-divider-line';
            leftLine.setAttribute('aria-hidden', 'true');

            const dividerButton = document.createElement('button');
            dividerButton.className = 'post-full__comments-toggle-button post-full__description-divider-button';
            dividerButton.type = 'button';
            dividerButton.textContent = 'Показать описание';
            dividerButton.addEventListener('click', () => {
                if (this.descriptionExpanded) {
                    this.collapseDescription();
                    return;
                }
                this.expandDescription();
            });

            const rightLine = document.createElement('span');
            rightLine.className = 'post-full__description-divider-line';
            rightLine.setAttribute('aria-hidden', 'true');

            this.descriptionDividerElement.appendChild(leftLine);
            this.descriptionDividerElement.appendChild(dividerButton);
            this.descriptionDividerElement.appendChild(rightLine);
            this.descriptionDividerButton = dividerButton;
        }

        if (!this.descriptionHideButton) {
            const floatingButton = document.createElement('button');
            floatingButton.className = 'post-full__description-hide-button';
            floatingButton.type = 'button';
            floatingButton.textContent = 'Скрыть описание';
            floatingButton.addEventListener('click', () => this.collapseDescription());
            this.postFullElement.appendChild(floatingButton);
            this.descriptionHideButton = floatingButton;
        }
    }

    initScrollTopButton() {
        this.scrollTopButton = document.querySelector('[data-component="scroll-to-top"]');
        if (!this.scrollTopButton) return;
        if (this.scrollTopButton.dataset.bound === '1') return;
        this.scrollTopButton.dataset.bound = '1';

        const scrollIcon = this.scrollTopButton.querySelector('[data-svg-src]');
        if (scrollIcon) {
            const src = scrollIcon.getAttribute('data-svg-src');
            if (src) {
                App.utils.loadSVG(src, scrollIcon);
            }
        }

        this.scrollTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        this.scrollTopButtonHandler = () => this.updateScrollTopButtonVisibility();
        window.addEventListener('scroll', this.scrollTopButtonHandler, { passive: true });
        window.addEventListener('resize', this.scrollTopButtonHandler);
        this.updateScrollTopButtonVisibility();
    }

    updateScrollTopButtonVisibility() {
        if (!this.scrollTopButton || !this.postFullElement) return;
        const postImage = this.postFullElement.querySelector('.post-full__image');
        if (!postImage) {
            this.hideScrollTopButton(true);
            return;
        }

        const imageRect = postImage.getBoundingClientRect();
        const shouldShow = imageRect.bottom < 0 || imageRect.top > window.innerHeight;
        if (shouldShow) {
            this.scrollTopButton.classList.add('is-open');
            this.scrollTopButton.classList.remove('scroll-to-top-button--closing');
            return;
        }

        this.hideScrollTopButton();
    }

    hideScrollTopButton(immediate = false) {
        if (!this.scrollTopButton) return;
        if (immediate) {
            this.scrollTopButton.classList.remove('is-open', 'scroll-to-top-button--closing');
            return;
        }

        if (!this.scrollTopButton.classList.contains('is-open')) return;
        this.scrollTopButton.classList.remove('is-open');
        this.scrollTopButton.classList.add('scroll-to-top-button--closing');
        clearTimeout(this.scrollTopHideTimer);
        this.scrollTopHideTimer = window.setTimeout(() => {
            this.scrollTopButton?.classList.remove('scroll-to-top-button--closing');
        }, 200);
    }

    expandDescription() {
        if (!this.descriptionElement) return;
        this.descriptionExpanded = true;
        this.descriptionElement.classList.remove('is-collapsed');
        this.showDescriptionHideButton();
        this.requestMasonryLayoutUpdate();
    }

    collapseDescription() {
        if (!this.descriptionElement || !this.descriptionSupportsCollapse) return;
        this.descriptionExpanded = false;
        this.descriptionElement.classList.add('is-collapsed');
        this.hideDescriptionHideButton();
        this.requestMasonryLayoutUpdate();
    }

    showDescriptionHideButton() {
        if (this.descriptionDividerButton) {
            this.descriptionDividerButton.textContent = 'Скрыть описание';
            this.descriptionDividerButton.classList.add('is-visible');
        }
        this.descriptionDividerElement?.classList.add('has-controls');
        this.updateDescriptionHideButtonPosition();
    }

    hideDescriptionHideButton() {
        if (this.descriptionDividerButton && this.descriptionSupportsCollapse) {
            this.descriptionDividerButton.textContent = 'Показать описание';
            this.descriptionDividerButton.classList.add('is-visible');
            this.descriptionDividerElement?.classList.add('has-controls');
        } else {
            this.descriptionDividerButton?.classList.remove('is-visible');
            this.descriptionDividerElement?.classList.remove('has-controls');
        }
        this.hideFloatingDescriptionButton(true);
    }

    updateDescriptionHideButtonPosition() {
        if (!this.descriptionHideButton || !this.descriptionDividerButton || !this.descriptionElement) return;
        if (!this.descriptionExpanded || !this.descriptionDividerButton.classList.contains('is-visible')) {
            this.hideFloatingDescriptionButton(true);
            return;
        }

        const dividerRect = this.descriptionDividerButton.getBoundingClientRect();
        const shouldShowFloating = dividerRect.bottom < 0 || dividerRect.top > window.innerHeight;
        if (!shouldShowFloating) {
            this.hideFloatingDescriptionButton();
            return;
        }

        const descriptionRect = this.descriptionElement.getBoundingClientRect();
        this.descriptionHideButton.style.left = `${Math.round(descriptionRect.left + (descriptionRect.width / 2))}px`;
        this.descriptionHideButton.classList.add('is-visible', 'is-open');
        this.descriptionHideButton.classList.remove('post-full__description-hide-button--closing');
    }

    hideFloatingDescriptionButton(immediate = false) {
        if (!this.descriptionHideButton || !this.descriptionHideButton.classList.contains('is-visible')) return;
        if (immediate) {
            this.descriptionHideButton.classList.remove('is-visible', 'is-open', 'post-full__description-hide-button--closing');
            return;
        }

        this.descriptionHideButton.classList.remove('is-open');
        this.descriptionHideButton.classList.add('post-full__description-hide-button--closing');
        window.setTimeout(() => {
            if (!this.descriptionHideButton) return;
            this.descriptionHideButton.classList.remove('is-visible', 'post-full__description-hide-button--closing');
        }, 200);
    }

    requestMasonryLayoutUpdate() {
        this.applyCommentsPreviewState();
        this.applyCommentChildrenState();
        this.syncCommentRails();
        this.layoutPostTags();
        document.dispatchEvent(new CustomEvent('post-full:resize'));
    }

    bindCommentsToggle() {
        if (!this.postFullElement) return;
        const toggleButton = this.postFullElement.querySelector('[data-action="comments-toggle"]');
        if (!toggleButton) return;
        if (toggleButton.dataset.bound === '1') return;
        toggleButton.dataset.bound = '1';
        toggleButton.addEventListener('click', () => {
            this.commentsExpanded = !this.commentsExpanded;
            this.applyCommentsPreviewState();
            this.requestMasonryLayoutUpdate();
        });
    }

    bindCommentChildrenToggle() {
        if (!this.postFullElement) return;

        this.postFullElement.addEventListener('click', (event) => {
            const control = event.target.closest('[data-action="comment-children-toggle"]');
            if (!control) return;

            const thread = control.closest('.post-full__comment-thread');
            if (!thread) return;

            const toggleButton = thread.querySelector('[data-action="comment-children-toggle"].post-full__comment-children-toggle');
            if (!toggleButton) return;

            const nextExpanded = toggleButton.dataset.expanded !== '1';
            toggleButton.dataset.expanded = nextExpanded ? '1' : '0';
            this.applyCommentChildrenState();
            this.requestMasonryLayoutUpdate();
        });
    }

    applyCommentsPreviewState() {
        if (!this.postFullElement) return;

        const commentsList = this.postFullElement.querySelector('[data-component="post-full-comments-list"]');
        if (!commentsList) return;

        let divider = this.postFullElement.querySelector('[data-component="post-full-comments-toggle-divider"]');
        if (!divider) {
            const commentsBlock = this.postFullElement.querySelector('.post-full__comments-block');
            if (commentsBlock) {
                const createdDivider = document.createElement('div');
                createdDivider.className = 'post-full__comments-toggle-divider';
                createdDivider.dataset.component = 'post-full-comments-toggle-divider';
                createdDivider.innerHTML = `
                    <span class="post-full__comments-toggle-line" aria-hidden="true"></span>
                    <button class="post-full__comments-toggle-button" type="button" data-action="comments-toggle"></button>
                    <span class="post-full__comments-toggle-line" aria-hidden="true"></span>
                `;
                const inputWrap = commentsBlock.querySelector('.post-full__comment-input-wrap');
                const replyState = commentsBlock.querySelector('[data-component="post-full-reply-state"]');
                const anchorNode = inputWrap || replyState || commentsBlock.querySelector('.post-full__comments-empty');
                if (anchorNode) {
                    commentsBlock.insertBefore(createdDivider, anchorNode);
                } else {
                    commentsBlock.appendChild(createdDivider);
                }
                divider = createdDivider;
                this.bindCommentsToggle();
            }
        }

        const toggleButton = divider?.querySelector('[data-action="comments-toggle"]') || null;
        if (!divider || !toggleButton) {
            this.hideFloatingCommentsButton(true);
            return;
        }

        this.ensureCommentsHideButton();

        const threads = Array.from(commentsList.querySelectorAll('.post-full__comment-thread'));
        const totalThreads = threads.length;
        const hiddenCount = Math.max(0, totalThreads - 3);

        threads.forEach((thread, index) => {
            const isVisible = this.commentsExpanded || index < 3;
            thread.style.display = isVisible ? '' : 'none';
        });

        if (totalThreads === 0) {
            divider.classList.remove('is-visible', 'is-solid');
            toggleButton.style.display = 'none';
            this.hideFloatingCommentsButton(true);
            this.updateCommentInputFloatingPosition();
            return;
        }

        divider.classList.add('is-visible');
        if (hiddenCount <= 0) {
            divider.classList.remove('is-visible', 'is-solid');
            toggleButton.style.display = 'none';
            this.hideFloatingCommentsButton(true);
            this.updateCommentInputFloatingPosition();
            return;
        }

        divider.classList.remove('is-solid');
        if (hiddenCount > 0 && !this.commentsExpanded) {
            toggleButton.textContent = `Показать все комментарии (+${hiddenCount})`;
            toggleButton.style.display = '';
            this.updateCommentInputFloatingPosition();
            return;
        }

        if (hiddenCount > 0 && this.commentsExpanded) {
            toggleButton.textContent = 'Скрыть комментарии';
            toggleButton.style.display = '';
            this.updateCommentsHideButtonPosition();
            this.updateCommentInputFloatingPosition();
            return;
        }

        this.hideFloatingCommentsButton(true);
        this.updateCommentInputFloatingPosition();
    }

    ensureCommentsHideButton() {
        if (!this.postFullElement || this.commentsHideButton) return;

        const floatingButton = document.createElement('button');
        floatingButton.className = 'post-full__description-hide-button post-full__comments-hide-button';
        floatingButton.type = 'button';
        floatingButton.textContent = 'Скрыть комментарии';
        floatingButton.addEventListener('click', () => {
            this.commentsExpanded = false;
            this.applyCommentsPreviewState();
            this.requestMasonryLayoutUpdate();
        });

        this.postFullElement.appendChild(floatingButton);
        this.commentsHideButton = floatingButton;
    }

    updateCommentsHideButtonPosition() {
        if (!this.commentsHideButton || !this.commentsExpanded) {
            this.hideFloatingCommentsButton(true);
            return;
        }

        const toggleButton = this.postFullElement?.querySelector('[data-action="comments-toggle"]');
        if (!toggleButton) {
            this.hideFloatingCommentsButton(true);
            return;
        }

        const dividerRect = toggleButton.getBoundingClientRect();
        const floatingWrap = this.postFullElement?.querySelector('[data-component="post-full-comment-input-floating-wrap"]');
        const floatingWrapRect = floatingWrap?.classList.contains('is-visible') ? floatingWrap.getBoundingClientRect() : null;
        const isOutsideViewport = dividerRect.bottom < 0 || dividerRect.top > window.innerHeight;
        const isBehindFloatingUnderlay = !!floatingWrapRect && dividerRect.bottom >= floatingWrapRect.top;
        const shouldShowFloating = isOutsideViewport || isBehindFloatingUnderlay;
        if (!shouldShowFloating) {
            this.hideFloatingCommentsButton();
            return;
        }

        const descriptionDivider = this.postFullElement?.querySelector('[data-component="post-full-description-divider"]');
        const descriptionLine = descriptionDivider?.querySelector('.post-full__description-divider-line');
        const descriptionLineRect = descriptionLine?.getBoundingClientRect();
        const floatingButtonCenterY = window.innerHeight - 88 - 18;
        if (descriptionLineRect && floatingButtonCenterY >= descriptionLineRect.top && floatingButtonCenterY <= descriptionLineRect.bottom) {
            this.hideFloatingCommentsButton(true);
            return;
        }

        const commentsBlock = this.postFullElement?.querySelector('.post-full__comments-block');
        const commentsRect = commentsBlock?.getBoundingClientRect();
        if (!commentsRect) return;

        this.commentsHideButton.style.left = `${Math.round(commentsRect.left + (commentsRect.width / 2))}px`;
        this.commentsHideButton.classList.add('is-visible', 'is-open');
        this.commentsHideButton.classList.remove('post-full__description-hide-button--closing');
    }

    hideFloatingCommentsButton(immediate = false) {
        if (!this.commentsHideButton || !this.commentsHideButton.classList.contains('is-visible')) return;
        if (immediate) {
            this.commentsHideButton.classList.remove('is-visible', 'is-open', 'post-full__description-hide-button--closing');
            return;
        }

        this.commentsHideButton.classList.remove('is-open');
        this.commentsHideButton.classList.add('post-full__description-hide-button--closing');
        window.setTimeout(() => {
            if (!this.commentsHideButton) return;
            this.commentsHideButton.classList.remove('is-visible', 'post-full__description-hide-button--closing');
        }, 200);
    }

    updateCommentInputFloatingPosition() {
        if (!this.postFullElement) return;
        const inputWrap = this.postFullElement.querySelector('.post-full__comment-input-wrap:not(.post-full__comment-input-wrap--floating)');
        const floatingWrap = this.postFullElement.querySelector('[data-component="post-full-comment-input-floating-wrap"]');
        const commentsBlock = this.postFullElement.querySelector('.post-full__comments-block');
        if (!inputWrap || !commentsBlock || !floatingWrap) return;

        this.updateStaticCommentInputPlaceholder(inputWrap);

        commentsBlock.classList.toggle('has-floating-comment-input', this.commentsExpanded);

        if (!this.commentsExpanded) {
            floatingWrap.classList.remove('is-visible');
            return;
        }

        floatingWrap.classList.add('is-visible');
        const commentsRect = commentsBlock.getBoundingClientRect();
        const postRect = this.postFullElement.getBoundingClientRect();
        const floatingInput = floatingWrap.querySelector('[data-component="post-full-comment-input-floating"]');
        const inputTopOffset = floatingInput ? Math.round(floatingInput.offsetTop) : 0;
        const floatingHeight = Math.max(0, Math.round(floatingWrap.getBoundingClientRect().height));
        const preferredTop = window.innerHeight - floatingHeight - 20;
        const maxTop = postRect.bottom - floatingHeight - 24;
        const divider = this.postFullElement.querySelector('[data-component="post-full-description-divider"]');
        const dividerRect = divider?.getBoundingClientRect();
        const minTopDescription = dividerRect ? Math.round(dividerRect.bottom + 42 - inputTopOffset) : Number.NEGATIVE_INFINITY;
        const minTop = minTopDescription;
        const nextTop = Math.max(minTop, Math.min(preferredTop, maxTop));

        floatingWrap.style.left = `${Math.round(commentsRect.left)}px`;
        floatingWrap.style.width = `${Math.round(commentsRect.width)}px`;
        floatingWrap.style.top = `${Math.round(nextTop)}px`;

        if (floatingInput) {
            floatingWrap.style.setProperty('--post-full-floating-input-top', `${inputTopOffset}px`);
        }
    }

    updateStaticCommentInputPlaceholder(inputWrap) {
        if (!inputWrap) return;

        if (!this.commentsExpanded) {
            inputWrap.classList.remove('is-placeholder');
            inputWrap.style.removeProperty('--post-full-comment-placeholder-height');
            return;
        }

        const currentHeight = Math.max(0, Math.round(inputWrap.getBoundingClientRect().height));
        if (currentHeight > 0) {
            inputWrap.style.setProperty('--post-full-comment-placeholder-height', `${currentHeight}px`);
        }
        inputWrap.classList.add('is-placeholder');
    }

    applyCommentChildrenState() {
        if (!this.postFullElement) return;

        const threads = Array.from(this.postFullElement.querySelectorAll('.post-full__comment-thread'));
        threads.forEach((thread) => {
            const parentItem = thread.querySelector('.post-full__comment-item:not(.post-full__comment-item--reply)');
            const childrenContainer = thread.querySelector('.post-full__comment-children');
            const childrenCount = childrenContainer?.querySelectorAll('.post-full__comment-item--reply').length || 0;
            if (!parentItem || !childrenContainer || childrenCount === 0) return;

            const commentSide = parentItem.querySelector('.post-full__comment-side');
            if (!commentSide) return;

            let toggleButton = commentSide.querySelector('[data-action="comment-children-toggle"]');
            if (!toggleButton) {
                toggleButton = document.createElement('button');
                toggleButton.className = 'post-full__comment-children-toggle';
                toggleButton.type = 'button';
                toggleButton.dataset.action = 'comment-children-toggle';
                toggleButton.dataset.expanded = '0';
                commentSide.appendChild(toggleButton);
            }

            const isExpanded = toggleButton.dataset.expanded === '1';
            toggleButton.textContent = isExpanded ? '−' : '+';
            toggleButton.setAttribute('aria-label', isExpanded ? 'Скрыть ответы' : 'Показать ответы');
            childrenContainer.style.display = isExpanded ? '' : 'none';
            this.updateThreadReplyCount(thread);
        });
    }

    refreshReplyCounters() {
        if (!this.postFullElement) return;
        const threads = Array.from(this.postFullElement.querySelectorAll('.post-full__comment-thread'));
        threads.forEach((thread) => this.updateThreadReplyCount(thread));
    }

    // Форматирует timestamp в человекочитаемое «x сек/мин/час/дн назад» с сохранением текущих интервалов.
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
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}.${month}.${year}`;
    }

    // Выбирает корректную форму слова для русского языка.
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
            commentInput.style.height = '40px';
            return;
        }
        commentInput.style.height = 'auto';
        const nextHeight = Math.max(40, commentInput.scrollHeight);
        commentInput.style.height = `${nextHeight}px`;
        this.updateCommentInputFloatingPosition();
    }

    togglePostEditMode() {
        if (!this.postFullElement) return;
        const postId = Number(this.postFullElement.dataset.postId || 0);
        const description = this.descriptionElement?.textContent?.trim() || '';
        const imageSrc = this.postFullElement.dataset.postImageSrc || this.postFullElement.querySelector('.post-full__image')?.getAttribute('src') || '';
        const tags = Array.from(this.postFullElement.querySelectorAll('.post-full__tag-label'))
            .map((node) => String(node.textContent || '').replace(/^#/, '').trim())
            .filter(Boolean);

        document.dispatchEvent(new CustomEvent('post-modal:open-edit', {
            detail: { postId, description, imageSrc, tags }
        }));
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


    isViewerAuthorized() {
        return Number(this.postFullElement?.dataset.viewerId || 0) > 0;
    }

    notifyAuthRequired() {
        this.showToast('Для этого действия нужно войти в аккаунт.');
        const profileContainer = document.querySelector('.header__profile-container');
        if (!profileContainer) return;

        profileContainer.classList.remove('header__profile-container--auth-required');
        void profileContainer.offsetWidth;
        profileContainer.classList.add('header__profile-container--auth-required');
    }

    async toggleLike(button) {
        const postId = this.getPostId();
        if (!postId) return;
        if (!this.isViewerAuthorized()) {
            this.notifyAuthRequired();
            return;
        }

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
        const parentCommentId = this.replyTargetCommentId > 0 ? this.replyTargetCommentId : 0;
        if (!postId || !text) return;
        if (text.length > 256) {
            this.showToast('Комментарий не должен превышать 256 символов.');
            return;
        }

        if (this.commentComposerMode === 'edit' && this.editingCommentElement) {
            const editingCommentId = Number(this.editingCommentElement.dataset.commentId || 0);
            if (!editingCommentId) {
                this.showToast('Не удалось определить комментарий для редактирования.');
                return;
            }
            commentInput.disabled = true;
            try {
                const response = await fetch('/comments/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        comment_id: String(editingCommentId),
                        content: text
                    }).toString()
                });

                const payload = await response.json();
                if (!response.ok || !payload.success) {
                    this.showToast(payload?.error || 'Не удалось обновить комментарий.');
                    return;
                }

                const textNode = this.editingCommentElement.querySelector('.post-full__comment-text');
                if (textNode) {
                    textNode.innerHTML = this.escapeHtmlWithBreaks(text);
                    textNode.classList.remove('post-full__comment-text--editing');
                }
                this.clearReplyState({ clearInputs: true, blurInputs: true });
                this.showToast('Комментарий изменен');
                this.requestMasonryLayoutUpdate();
            } catch (error) {
                console.warn('Unable to update comment from post-full', error);
                this.showToast('Не удалось обновить комментарий.');
            } finally {
                commentInput.disabled = false;
            }
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
                    content: text,
                    parent_comment_id: String(parentCommentId)
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
            const floatingInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input-floating"]');
            const floatingCounter = this.postFullElement?.querySelector('[data-component="post-full-comment-counter-floating"]');
            if (floatingInput) {
                floatingInput.value = '';
                this.autoResizeCommentInput(floatingInput);
            }
            if (floatingCounter) {
                floatingCounter.textContent = '0/256';
            }
            this.autoResizeCommentInput(commentInput);

            const emptyMessage = this.postFullElement?.querySelector('.post-full__comments-empty');
            if (emptyMessage) {
                emptyMessage.remove();
            }

            this.prependComment({
                commentId: Number(payload?.comment_id || 0),
                content: text,
                createdAtTs: Number(payload?.created_at_ts || this.getReferenceNowTs()),
                username: String(this.postFullElement?.dataset.viewerUsername || '').trim(),
                avatarSrc: String(this.postFullElement?.dataset.viewerAvatarSrc || ''),
                profileUrl: String(this.postFullElement?.dataset.viewerProfileUrl || '/profile'),
                hasAvatar: this.postFullElement?.dataset.viewerHasAvatar === '1',
                parentUsername: this.replyTargetUsername,
                parentCommentId,
                rootCommentId: Number(payload?.root_comment_id || this.replyTargetRootCommentId)
            });

            this.showToast('Комментарий добавлен');
            this.clearReplyState({ clearInputs: true });
            this.requestMasonryLayoutUpdate();
        } catch (error) {
            console.warn('Unable to submit comment from post-full', error);
            this.showToast('Не удалось сохранить комментарий.');
        } finally {
            commentInput.disabled = false;
            commentInput.focus();
        }
    }

    // Добавляет новый комментарий в DOM и выставляет ему timestamp для последующих автообновлений времени.
    prependComment(commentData) {
        const commentsList = this.postFullElement?.querySelector('[data-component="post-full-comments-list"]');
        if (!commentsList) return;

        const username = commentData.username || 'unknown';
        const profileUrl = commentData.profileUrl || '/profile';
        const avatarSrc = commentData.avatarSrc || '/uploads/avatars/avatar.jpg';
        const hasAvatar = !!commentData.hasAvatar;
        const commentId = Number(commentData.commentId || 0);
        const parentCommentId = Number(commentData.parentCommentId || 0);
        const parentUsername = String(commentData.parentUsername || '').trim();
        const createdAtTs = this.normalizeUnixTimestamp(commentData.createdAtTs || this.getReferenceNowTs());
        const publishedLabel = this.formatRelativeTimeLabel(createdAtTs, this.getReferenceNowTs());

        const item = this.createCommentItemElement({
            commentId,
            username,
            profileUrl,
            avatarSrc,
            hasAvatar,
            parentCommentId,
            parentUsername,
            createdAtTs,
            publishedLabel,
            content: commentData.content || '',
            likesCount: Number(commentData.likesCount || 0),
            isLiked: !!commentData.isLiked,
            isReply: parentCommentId > 0,
            rootCommentId: Number(commentData.rootCommentId || 0),
        });

        const rootCommentId = Number(commentData.rootCommentId || commentId || 0);
        if (parentCommentId > 0 && rootCommentId > 0) {
            const thread = commentsList.querySelector(`.post-full__comment-thread[data-root-comment-id="${rootCommentId}"]`);
            if (thread) {
                const rootComment = thread.querySelector('.post-full__comment-item:not(.post-full__comment-item--reply)');
                const rootContent = rootComment?.querySelector('.post-full__comment-content');
                let childrenContainer = rootContent?.querySelector('.post-full__comment-children');
                if (!childrenContainer) {
                    childrenContainer = document.createElement('div');
                    childrenContainer.className = 'post-full__comment-children';
                    if (rootContent) {
                        rootContent.appendChild(childrenContainer);
                    } else {
                        thread.appendChild(childrenContainer);
                    }
                }
                childrenContainer.appendChild(item);
                this.expandThreadReplies(thread);
                this.updateThreadReplyCount(thread);
            } else {
                const fallbackThread = document.createElement('div');
                fallbackThread.className = 'post-full__comment-thread';
                fallbackThread.dataset.rootCommentId = String(rootCommentId);
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'post-full__comment-children';
                childrenContainer.appendChild(item);
                fallbackThread.appendChild(childrenContainer);
                commentsList.appendChild(fallbackThread);
                this.expandThreadReplies(fallbackThread);
                this.updateThreadReplyCount(fallbackThread);
            }
        } else {
            const thread = document.createElement('div');
            thread.className = 'post-full__comment-thread';
            if (commentId > 0) {
                thread.dataset.rootCommentId = String(commentId);
            }
            thread.appendChild(item);
            commentsList.appendChild(thread);
            this.updateThreadReplyCount(thread);
        }

        item.querySelectorAll('[data-svg-src]').forEach((node) => {
            const src = node.getAttribute('data-svg-src');
            if (!src) return;
            App.utils.loadSVG(src, node);
        });
        this.requestMasonryLayoutUpdate();
        this.renderRelativeTimeLabels();
    }

    createCommentItemElement(commentData) {
        const username = commentData.username || 'unknown';
        const profileUrl = commentData.profileUrl || '/profile';
        const avatarSrc = commentData.avatarSrc || '/uploads/avatars/avatar.jpg';
        const hasAvatar = !!commentData.hasAvatar;
        const commentId = Number(commentData.commentId || 0);
        const parentCommentId = Number(commentData.parentCommentId || 0);
        const parentUsername = String(commentData.parentUsername || '').trim();
        const createdAtTs = this.normalizeUnixTimestamp(commentData.createdAtTs || this.getReferenceNowTs());
        const publishedLabel = commentData.publishedLabel || this.formatRelativeTimeLabel(createdAtTs, this.getReferenceNowTs());
        const likesCount = Number(commentData.likesCount || 0);
        const isLiked = !!commentData.isLiked;
        const viewerUsername = String(this.postFullElement?.dataset.viewerUsername || '').trim().replace(/^@+/, '');
        const isOwnComment = viewerUsername !== '' && viewerUsername === username.replace(/^@+/, '');
        const rootCommentId = Number(commentData.rootCommentId || commentId || 0);
        const hasReplyLabel = parentCommentId > 0 && parentUsername !== '';
        const metaAfterUsername = commentData.isReply
            ? `<span class="post-full__comment-meta-separator" aria-hidden="true"></span>
               <span class="post-full__comment-published-at" data-created-at-ts="${createdAtTs}">${this.escapeHtml(publishedLabel)}</span>
               ${hasReplyLabel
                    ? `<span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                       <span class="post-full__comment-reply-label">Ответ <span class="post-full__comment-reply-target">@${this.escapeHtml(parentUsername)}</span></span>`
                    : ''}`
            : `${hasReplyLabel
                    ? `<span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                       <span class="post-full__comment-reply-label">Ответ <span class="post-full__comment-reply-target">@${this.escapeHtml(parentUsername)}</span></span>`
                    : ''}
               <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
               <span class="post-full__comment-published-at" data-created-at-ts="${createdAtTs}">${this.escapeHtml(publishedLabel)}</span>`;

        const item = document.createElement('article');
        item.className = `post-full__comment-item${commentData.isReply ? ' post-full__comment-item--reply' : ''}`;
        if (commentId > 0) {
            item.dataset.commentId = String(commentId);
        }
        if (rootCommentId > 0) {
            item.dataset.rootCommentId = String(rootCommentId);
        }
        item.dataset.commentUsername = username;
        item.innerHTML = `
            <div class="post-full__comment-side">
                <a class="post-full__author-avatar post-full__comment-avatar" href="${this.escapeHtml(profileUrl)}" aria-label="Профиль автора @${this.escapeHtml(username)}">
                    ${hasAvatar
                        ? `<img class="post-full__author-avatar-image" src="${this.escapeHtml(avatarSrc)}" alt="Аватар @${this.escapeHtml(username)}">`
                        : '<img class="post-full__author-avatar-placeholder" src="/assets/images/icons/planet.svg" alt="Профиль" width="24" height="24">'}
                </a>
                <span class="post-full__comment-rail" aria-hidden="true"></span>
            </div>
            <div class="post-full__comment-content">
                <div class="post-full__comment-meta">
                    <div class="post-full__comment-meta-main">
                        <a class="post-full__comment-username" href="${this.escapeHtml(profileUrl)}" aria-label="Профиль автора @${this.escapeHtml(username)}">@${this.escapeHtml(username)}</a>
                        ${metaAfterUsername}
                        <span class="post-full__comment-meta-separator" data-component="post-full-comment-replies-separator" aria-hidden="true" style="display:none;"></span>
                        <span class="post-full__comment-reply-label" data-component="post-full-comment-replies-meta" style="display:none;"></span>
                    </div>
                </div>
                <p class="post-full__comment-text">${this.escapeHtmlWithBreaks(commentData.content || '')}</p>
                <div class="post-full__comment-actions" aria-label="Действия с комментарием">
                    <button class="post-full__comment-action-button post-full__comment-action-button--like${isLiked ? ' is-active' : ''}" type="button" data-action="comment-like" aria-label="Лайк комментария">
                        <span class="post-full__comment-action-icon" data-svg-src="${isLiked ? '/assets/images/icons/U-heart-fill.svg' : '/assets/images/icons/S-heart.svg'}" aria-hidden="true"></span>
                        <span class="post-full__comment-like-count${isLiked ? ' is-active' : ''}">${Math.max(0, likesCount)}</span>
                    </button>
                    <button class="post-full__comment-action-button post-full__comment-action-button--reply" type="button" data-action="comment-reply" aria-label="Ответить на комментарий">
                        Ответить
                    </button>
                    ${isOwnComment
                        ? `<button class="post-full__comment-action-button post-full__comment-action-button--edit" type="button" data-action="comment-edit" aria-label="Изменить комментарий">
                            <span class="post-full__comment-action-icon" data-svg-src="/assets/images/icons/S-edit.svg" aria-hidden="true"></span>
                        </button>`
                        : `<button class="post-full__comment-action-button" type="button" data-action="comment-report" aria-label="Пожаловаться на комментарий">
                            <span class="post-full__comment-action-icon" data-svg-src="/assets/images/icons/S-warning.svg" aria-hidden="true"></span>
                        </button>`}
                </div>
            </div>
        `;
        return item;
    }

    activateReplyState(commentId, rootCommentId, username) {
        if (!commentId || !username) return;
        if (this.commentComposerMode === 'edit') {
            this.clearReplyState({ clearInputs: true });
        }
        this.commentComposerMode = 'reply';

        this.replyTargetCommentId = commentId;
        this.replyTargetRootCommentId = rootCommentId > 0 ? rootCommentId : commentId;
        this.replyTargetUsername = username.replace(/^@+/, '');

        const stateNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-state"], [data-component="post-full-reply-state-floating"]');
        const nicknameNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-nickname"], [data-component="post-full-reply-nickname-floating"]');
        if (!stateNodes || stateNodes.length === 0 || !nicknameNodes || nicknameNodes.length === 0) return;

        this.setCommentComposerStateText('Ответ пользователю', `@${this.replyTargetUsername}`);
        stateNodes.forEach((stateNode) => {
            stateNode.classList.add('is-active');
        });
        const staticInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input"]');
        const floatingInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input-floating"]');
        (floatingInput && this.commentsExpanded ? floatingInput : staticInput)?.focus();
        this.requestMasonryLayoutUpdate();
    }

    activateCommentEditState(commentItem) {
        if (!commentItem) return;
        this.commentComposerMode = 'edit';
        if (this.editingCommentElement) {
            const prevTextNode = this.editingCommentElement.querySelector('.post-full__comment-text');
            prevTextNode?.classList.remove('post-full__comment-text--editing');
        }
        this.editingCommentElement = commentItem;
        this.setCommentComposerStateText('Изменение комментария...', '');
        const stateNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-state"], [data-component="post-full-reply-state-floating"]');
        stateNodes?.forEach((stateNode) => stateNode.classList.add('is-active'));
        const commentTextNode = commentItem.querySelector('.post-full__comment-text');
        commentTextNode?.classList.add('post-full__comment-text--editing');
        const sourceText = commentTextNode?.textContent?.trim() || '';
        const staticInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input"]');
        const floatingInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input-floating"]');
        if (staticInput) {
            staticInput.value = sourceText;
            staticInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (floatingInput) {
            floatingInput.value = sourceText;
            floatingInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        (floatingInput && this.commentsExpanded ? floatingInput : staticInput)?.focus();
        this.requestMasonryLayoutUpdate();
    }

    setCommentComposerStateText(prefixText, valueText) {
        const prefixNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-prefix"], [data-component="post-full-reply-prefix-floating"]');
        const nicknameNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-nickname"], [data-component="post-full-reply-nickname-floating"]');
        prefixNodes?.forEach((node) => { node.textContent = prefixText; });
        nicknameNodes?.forEach((node) => { node.textContent = valueText; });
    }

    clearReplyState(options = {}) {
        const { clearInputs = false, blurInputs = false } = options;
        this.replyTargetCommentId = 0;
        this.replyTargetRootCommentId = 0;
        this.replyTargetUsername = '';
        this.editingCommentElement?.querySelector('.post-full__comment-text')?.classList.remove('post-full__comment-text--editing');
        this.editingCommentElement = null;

        const stateNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-state"], [data-component="post-full-reply-state-floating"]');
        const nicknameNodes = this.postFullElement?.querySelectorAll('[data-component="post-full-reply-nickname"], [data-component="post-full-reply-nickname-floating"]');

        this.commentComposerMode = 'reply';
        this.setCommentComposerStateText('Ответ пользователю', '');
        const staticInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input"]');
        const floatingInput = this.postFullElement?.querySelector('[data-component="post-full-comment-input-floating"]');
        const staticCounter = this.postFullElement?.querySelector('[data-component="post-full-comment-counter"]');
        const floatingCounter = this.postFullElement?.querySelector('[data-component="post-full-comment-counter-floating"]');
        if (clearInputs) {
            if (staticInput) {
                staticInput.value = '';
                this.autoResizeCommentInput(staticInput);
            }
            if (floatingInput) {
                floatingInput.value = '';
                this.autoResizeCommentInput(floatingInput);
            }
            if (staticCounter) staticCounter.textContent = '0/256';
            if (floatingCounter) floatingCounter.textContent = '0/256';
        }
        if (blurInputs) {
            staticInput?.blur();
            floatingInput?.blur();
        }
        stateNodes?.forEach((stateNode) => {
            stateNode.classList.remove('is-active');
        });
        this.requestMasonryLayoutUpdate();
    }

    async toggleCommentLike(button, commentId) {
        if (!commentId) return;

        button.disabled = true;
        try {
            const response = await fetch('/comments/like', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ comment_id: String(commentId) }).toString()
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                this.showToast(payload?.error || 'Не удалось обработать лайк комментария.');
                return;
            }

            const isLiked = !!payload.liked;
            button.classList.toggle('is-active', isLiked);
            this.setCommentLikeIcon(button, isLiked);

            const commentItem = button.closest('.post-full__comment-item');
            const countNode = commentItem?.querySelector('.post-full__comment-like-count');
            if (countNode) {
                countNode.textContent = String(Math.max(0, Number(payload.likes_count || 0)));
                countNode.classList.toggle('is-active', isLiked);
            }
        } catch (error) {
            console.warn('Unable to toggle like for comment from post-full', error);
            this.showToast('Не удалось обработать лайк комментария.');
        } finally {
            button.disabled = false;
        }
    }

    setCommentLikeIcon(button, liked) {
        const iconContainer = button?.querySelector('.post-full__comment-action-icon');
        if (!iconContainer) return;

        const iconPath = liked ? '/assets/images/icons/U-heart-fill.svg' : '/assets/images/icons/S-heart.svg';
        iconContainer.setAttribute('data-svg-src', iconPath);
        App.utils.loadSVG(iconPath, iconContainer);
    }

    openCommentReportOverlay(commentId) {
        if (!App.overlay || !commentId) return;
        if (App.overlay.get('comment-report')) return;

        this.pendingCommentReportId = commentId;
        let reportButton = null;

        App.overlay.open({
            key: 'comment-report',
            overlayClass: 'post-full-report',
            hiddenClass: 'post-full-report--hidden',
            panelClass: 'post-full-report__panel',
            buildPanel: (panel, close) => {
                const text = document.createElement('p');
                text.className = 'post-full-report__title';
                text.textContent = 'Подать жалобу на комментарий?';

                const description = document.createElement('p');
                description.className = 'post-full-report__description';
                description.textContent = 'После отправки жалобы комментарий будет проверен модерацией на несоответствие правилам площадки. Мы уведомим вас, когда решение будет принято.';

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
                    await this.submitCommentReport(reportButton);
                });

                actions.appendChild(cancelButton);
                actions.appendChild(reportButton);
                panel.appendChild(text);
                panel.appendChild(description);
                panel.appendChild(actions);
            }
        });
    }

    async submitCommentReport(reportButton) {
        const commentId = this.pendingCommentReportId;
        if (!commentId || !reportButton) return;

        reportButton.disabled = true;
        try {
            const response = await fetch('/comments/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ comment_id: String(commentId) }).toString()
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

            App.overlay?.close('comment-report');
        } catch (error) {
            console.warn('Unable to report comment from post-full', error);
            this.showToast('Не удалось отправить жалобу.');
        } finally {
            reportButton.disabled = false;
            this.pendingCommentReportId = 0;
        }
    }

    syncCommentRails() {
        const sideElements = this.postFullElement?.querySelectorAll('.post-full__comment-side') || [];
        sideElements.forEach((sideElement) => {
            const thread = sideElement.closest('.post-full__comment-thread');
            const commentItem = sideElement.closest('.post-full__comment-item');
            const toggleButton = sideElement.querySelector('.post-full__comment-children-toggle');
            if (!thread || !commentItem || !toggleButton) return;

            const threadChildren = thread.querySelectorAll('.post-full__comment-item--reply');
            const isExpanded = toggleButton.dataset.expanded === '1';
            const anchorItem = (isExpanded && threadChildren.length > 0)
                ? threadChildren[threadChildren.length - 1]
                : commentItem;
            const anchorLike = anchorItem.querySelector('.post-full__comment-like-count');
            const anchorActions = anchorItem.querySelector('.post-full__comment-actions');
            const anchorTarget = anchorLike || anchorActions;
            if (!anchorTarget) return;

            const sideRect = sideElement.getBoundingClientRect();
            const targetRect = anchorTarget.getBoundingClientRect();
            const alignedTop = Math.max(0, Math.round((targetRect.top + (targetRect.height / 2)) - sideRect.top - (toggleButton.offsetHeight / 2)));
            toggleButton.style.top = `${alignedTop}px`;
        });

        const commentItems = this.postFullElement?.querySelectorAll('.post-full__comment-item') || [];
        commentItems.forEach((item) => {
            const railElement = item.querySelector('.post-full__comment-rail');
            if (!railElement) return;
            const railBottom = this.getCommentRailBottom(item);
            railElement.style.height = `${Math.max(0, railBottom)}px`;
        });

        const threads = this.postFullElement?.querySelectorAll('.post-full__comment-thread') || [];
        threads.forEach((thread) => {
            const parentItem = thread.querySelector('.post-full__comment-item:not(.post-full__comment-item--reply)');
            const childrenContainer = thread.querySelector('.post-full__comment-children');
            const children = thread.querySelectorAll('.post-full__comment-item--reply');
            if (!parentItem || children.length === 0) return;

            const parentRail = parentItem.querySelector('.post-full__comment-rail');
            const parentToggle = parentItem.querySelector('.post-full__comment-children-toggle');
            const lastChild = children[children.length - 1];
            const lastChildRail = lastChild.querySelector('.post-full__comment-rail');
            if (!parentRail || !lastChildRail) return;
            if (parentToggle) return;
            if (childrenContainer && getComputedStyle(childrenContainer).display === 'none') return;

            const parentRailRect = parentRail.getBoundingClientRect();
            const lastChildBottom = this.getCommentAbsoluteRailBottom(lastChild);
            const extendedHeight = Math.max(
                Math.round(parentRail.offsetHeight),
                Math.round(lastChildBottom - parentRailRect.top)
            );

            parentRail.style.height = `${Math.max(0, extendedHeight)}px`;
        });

    }

    getCommentRailBottom(commentItem) {
        const sideElement = commentItem?.querySelector('.post-full__comment-side');
        if (!sideElement) return 0;

        const avatarElement = sideElement.querySelector('.post-full__comment-avatar');
        const likeCount = commentItem.querySelector('.post-full__comment-like-count');
        const actions = commentItem.querySelector('.post-full__comment-actions');
        const textElement = commentItem.querySelector('.post-full__comment-text');
        const toggleButton = sideElement.querySelector('.post-full__comment-children-toggle');
        const sideRect = sideElement.getBoundingClientRect();
        const avatarRect = avatarElement?.getBoundingClientRect() || sideRect;
        const fallbackBottom = textElement
            ? textElement.getBoundingClientRect().bottom
            : sideRect.bottom;
        const toggleTop = toggleButton
            ? toggleButton.getBoundingClientRect().top
            : 0;
        const targetBottom = likeCount?.getBoundingClientRect().bottom
            || actions?.getBoundingClientRect().bottom
            || fallbackBottom;
        if (toggleButton) {
            return Math.max(0, Math.round(toggleTop - avatarRect.bottom - 5));
        }
        return Math.max(0, Math.round(targetBottom - avatarRect.bottom - 5));
    }

    getCommentAbsoluteRailBottom(commentItem) {
        const sideElement = commentItem?.querySelector('.post-full__comment-side');
        const railElement = commentItem?.querySelector('.post-full__comment-rail');
        if (!sideElement || !railElement) return 0;

        const sideRect = sideElement.getBoundingClientRect();
        const railRect = railElement.getBoundingClientRect();
        const relativeBottom = this.getCommentRailBottom(commentItem);
        return sideRect.top + railRect.top - sideRect.top + relativeBottom;
    }

    expandThreadReplies(thread) {
        if (!thread) return;
        const toggleButton = thread.querySelector('[data-action="comment-children-toggle"]');
        const childrenContainer = thread.querySelector('.post-full__comment-children');
        if (!toggleButton || !childrenContainer) return;
        toggleButton.dataset.expanded = '1';
        childrenContainer.style.display = '';
    }

    updateThreadReplyCount(thread) {
        if (!thread) return;
        const parentItem = thread.querySelector('.post-full__comment-item:not(.post-full__comment-item--reply)');
        if (!parentItem) return;
        const repliesCount = thread.querySelectorAll('.post-full__comment-item--reply').length;
        const metaNode = parentItem.querySelector('[data-component="post-full-comment-replies-meta"]');
        const separatorNode = parentItem.querySelector('[data-component="post-full-comment-replies-separator"]');
        if (!metaNode || !separatorNode) return;

        if (repliesCount <= 0) {
            metaNode.style.display = 'none';
            metaNode.textContent = '';
            separatorNode.style.display = 'none';
            delete metaNode.dataset.action;
            delete metaNode.dataset.expanded;
            metaNode.removeAttribute('aria-label');
            return;
        }

        metaNode.style.display = '';
        separatorNode.style.display = '';
        metaNode.textContent = `${repliesCount} ${this.pluralizeRu(repliesCount, 'ответ', 'ответа', 'ответов')}`;
        metaNode.dataset.action = 'comment-children-toggle';

        const toggleButton = thread.querySelector('[data-action="comment-children-toggle"].post-full__comment-children-toggle');
        if (toggleButton) {
            const isExpanded = toggleButton.dataset.expanded === '1';
            metaNode.dataset.expanded = isExpanded ? '1' : '0';
            metaNode.setAttribute('aria-label', isExpanded ? 'Скрыть ответы' : `Показать ${metaNode.textContent}`);
        }
    }

    layoutPostTags() {
        const tagsContainer = this.postFullElement?.querySelector('.post-full__hashtags');
        if (!tagsContainer) return;

        const tagNodes = Array.from(tagsContainer.querySelectorAll('.post-full__tag-item'));
        if (tagNodes.length === 0) return;

        tagsContainer.innerHTML = '';
        const availableWidth = tagsContainer.clientWidth || 1;
        let currentRow = this.createPostTagRow(tagsContainer);

        tagNodes.forEach((tagNode) => {
            currentRow.appendChild(tagNode);
            if (currentRow.scrollWidth <= availableWidth) {
                this.adjustPostTagRow(currentRow, false);
                return;
            }

            currentRow.removeChild(tagNode);
            this.adjustPostTagRow(currentRow, true);
            currentRow = this.createPostTagRow(tagsContainer);
            currentRow.appendChild(tagNode);
            this.adjustPostTagRow(currentRow, false);
        });
    }

    createPostTagRow(tagsContainer) {
        const row = document.createElement('div');
        row.className = 'post-full__hashtags-row';
        tagsContainer.appendChild(row);
        return row;
    }

    adjustPostTagRow(rowElement, isClosed) {
        if (!rowElement) return;
        const chipElements = Array.from(rowElement.querySelectorAll('.post-full__tag-item'));
        if (chipElements.length <= 1) {
            rowElement.style.justifyContent = 'flex-start';
            rowElement.style.columnGap = '8px';
            return;
        }

        rowElement.style.justifyContent = isClosed ? 'space-between' : 'flex-start';
        rowElement.style.columnGap = isClosed ? '0px' : '8px';
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
        if (!this.isViewerAuthorized()) {
            this.notifyAuthRequired();
            return;
        }

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
                text.className = 'post-full-report__title';
                text.textContent = 'Подать жалобу на пост?';

                const description = document.createElement('p');
                description.className = 'post-full-report__description';
                description.textContent = 'После отправки жалобы пост будет проверен модерацией на несоответствие правилам площадки. Мы уведомим вас, когда решение будет принято.';

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
                panel.appendChild(description);
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
