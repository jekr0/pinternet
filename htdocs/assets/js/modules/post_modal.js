class CreatePostModalComponent {
    constructor() {
        // Modal and upload elements
        this.modal = null;
        this.panel = null;
        this.dropzone = null;
        this.fileInput = null;
        this.placeholder = null;
        this.preview = null;
        this.uploadIcon = null;

        // Collection field elements
        this.collectionTrigger = null;
        this.collectionItems = [];
        this.collectionList = null;
        this.descriptionField = null;
        this.descriptionCounter = null;
        this.tagsField = null;
        this.submitButton = null;
        this.tagsAddButton = null;
        this.tagsList = null;
        this.tags = [];
        this.maxTags = 24;
        this.maxVisibleTagRows = 3;
        this.alertBox = null;
        this.tagsSuggestList = null;
        this.tagsInputRow = null;
        this.alertHideTimer = null;
        this.alertFadeTimer = null;
        this.selectedCollections = [];

        // Upload constraints/state
        this.maxFileSize = 20 * 1024 * 1024;
        this.allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];
        this.objectUrl = null;
        this.currentFile = null;
        this.titleElement = null;
        this.cancelButton = null;
        this.deleteButton = null;
        this.confirmBox = null;
        this.confirmMessage = null;
        this.confirmCancelButton = null;
        this.confirmSubmitButton = null;
        this.lockIcon = null;
        this.isEditMode = false;
        this.editPostId = 0;
        this.editSnapshot = null;
        this.closeResetTimer = null;
        this.confirmAction = null;
        this.closeBlockedTimer = null;
        this.lastNonModalUrl = App.history?.isModalUrl?.(window.location.href) ? '/' : window.location.pathname + window.location.search;
        this.currentModalUrl = null;
        this.openTriggerClickHandler = null;
        this.openCreateEventHandler = null;
        this.openEditEventHandler = null;
        this.collectionsChangedHandler = null;
        this.modalBackdropClickHandler = null;
        this.cancelClickHandler = null;
        this.escapeKeyHandler = null;
    }

    init() {
        this.modal = document.getElementById('post-modal');
        if (!this.modal) return;

        this.panel = this.modal.querySelector('.post-modal__panel');
        this.dropzone = this.modal.querySelector('[data-component="post-upload-dropzone"]');
        this.fileInput = this.modal.querySelector('[data-component="post-upload-input"]');
        this.placeholder = this.modal.querySelector('[data-component="post-upload-placeholder"]');
        this.preview = this.modal.querySelector('[data-component="post-upload-preview"]');
        this.uploadIcon = this.modal.querySelector('[data-component="post-upload-icon"]');
        this.collectionTrigger = this.modal.querySelector('[data-component="post-collection-trigger"]');
        this.collectionList = this.modal.querySelector('[data-component="post-collection-list"]');
        this.collectionItems = Array.from(this.modal.querySelectorAll('[data-component="post-collection-item"]'));
        this.descriptionField = this.modal.querySelector('[data-component="post-description"]');
        this.descriptionCounter = this.modal.querySelector('[data-component="post-description-counter"]');
        this.tagsField = this.modal.querySelector('.post-modal__input--tags');
        this.submitButton = this.modal.querySelector('[data-component="create-post-submit"]');
        this.tagsAddButton = this.modal.querySelector('[data-component="post-tags-add-button"]');
        this.tagsList = this.modal.querySelector('[data-component="post-tags-list"]');
        this.alertBox = this.modal.querySelector('[data-component="create-post-alert"]');
        this.tagsSuggestList = this.modal.querySelector('[data-component="post-tags-suggest-list"]');
        this.tagsInputRow = this.modal.querySelector('.post-modal__tags-input-row');
        this.titleElement = this.modal.querySelector('[data-component="post-modal-title"]');
        this.cancelButton = this.modal.querySelector('[data-component="create-post-cancel"]');
        this.deleteButton = this.modal.querySelector('[data-component="post-edit-delete"]');
        this.confirmBox = this.modal.querySelector('[data-component="post-modal-confirm"]');
        this.confirmTitle = this.modal.querySelector('[data-component="post-modal-confirm-title"]');
        this.confirmMessage = this.modal.querySelector('[data-component="post-modal-confirm-message"]');
        this.confirmCancelButton = this.modal.querySelector('[data-component="post-modal-confirm-cancel"]');
        this.confirmSubmitButton = this.modal.querySelector('[data-component="post-modal-confirm-submit"]');
        this.lockIcon = this.modal.querySelector('[data-component="post-upload-lock-icon"]');

        if (!this.dropzone || !this.fileInput || !this.placeholder || !this.preview) return;

        if (this.uploadIcon) {
            const svgSrc = this.uploadIcon.getAttribute('data-svg-src');
            if (svgSrc) {
                App.utils.loadSVG(svgSrc, this.uploadIcon);
            }
        }

        if (this.lockIcon) {
            const svgSrc = this.lockIcon.getAttribute('data-svg-src');
            if (svgSrc) {
                App.utils.loadSVG(svgSrc, this.lockIcon);
            }
        }

        this.bindOpenHandlers();
        this.bindUploadHandlers();
        this.bindDescriptionHandlers();
        this.bindCollectionHandlers();
        this.bindTagsHandlers();
        this.bindInputRestrictions();
        this.bindSubmitHandlers();
        this.bindCloseHandlers();

        App.modalCtrl?.register('post-modal', {
            show: () => this.showOnly(),
            hide: () => this.hideOnly()
        });
    }


    getModalUrl() {
        return this.currentModalUrl;
    }

    setModalUrl(nextUrl, options = {}) {
        if (!nextUrl) return;
        const { fromHistory = false } = options;
        const currentUrl = window.location.pathname + window.location.search;
        const isCurrentModalUrl = App.history?.isModalUrl?.(currentUrl);

        this.currentModalUrl = nextUrl;

        if (!isCurrentModalUrl) {
            this.lastNonModalUrl = currentUrl;
        }

        if (fromHistory || currentUrl === nextUrl) return;
        if (App.history?.pushUrl) {
            App.history.pushUrl(nextUrl);
        } else {
            window.history.pushState({}, '', nextUrl);
        }
    }

    restoreNonModalUrl() {
        const fallback = '/';
        const targetUrl = this.lastNonModalUrl || fallback;
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl === targetUrl) return;
        if (App.history?.replaceUrl) {
            App.history.replaceUrl(targetUrl);
        } else {
            window.history.replaceState({}, '', targetUrl);
        }
    }

    bindOpenHandlers() {
        this.openTriggerClickHandler = (event) => {
            const trigger = event.target.closest('[data-component="create-post-open"]');
            if (!trigger) return;
            event.preventDefault();
            this.openCreateMode();
        };

        this.openCreateEventHandler = (event) => {
            this.openCreateMode(event?.detail || {});
        };

        this.openEditEventHandler = async (event) => {
            await this.openEditMode(event.detail || {});
        };

        this.collectionsChangedHandler = async () => {
            await this.loadCollections();
        };

        document.addEventListener('click', this.openTriggerClickHandler);
        document.addEventListener('post-modal:open', this.openCreateEventHandler);
        document.addEventListener('post-modal:open-edit', this.openEditEventHandler);
        document.addEventListener('collections:changed', this.collectionsChangedHandler);
    }

    openCreateMode(options = {}) {
        clearTimeout(this.closeResetTimer);
        this.setModalUrl('/post/create', options);
        this.resetForm();
        this.applyCreateModeUI();
        if (App.modalCtrl) {
            App.modalCtrl.open('post-modal');
            this.showOnly();
            this.loadCollections();
            return;
        }
        this.open();
    }

    bindUploadHandlers() {
        this.dropzone.addEventListener('click', () => {
            if (this.isEditMode) return;
            this.fileInput.click();
        });
        this.dropzone.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (this.isEditMode) return;
                this.fileInput.click();
            }
        });

        this.fileInput.addEventListener('change', () => {
            const file = this.fileInput.files?.[0];
            this.handleFile(file);
        });

        this.dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (this.isEditMode) return;
            this.dropzone.classList.add('post-modal__upload-dropzone--dragover');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('post-modal__upload-dropzone--dragover');
        });

        this.dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            this.dropzone.classList.remove('post-modal__upload-dropzone--dragover');
            if (this.isEditMode) return;
            const file = event.dataTransfer?.files?.[0];
            this.handleFile(file);
        });
    }

    bindCollectionHandlers() {
        if (!this.collectionTrigger) return;
        this.attachCollectionItemHandlers();

        this.collectionTrigger.addEventListener('input', () => {
            const typedValue = this.collectionTrigger.value.trim();
            if (typedValue !== this.selectedCollectionName) {
                this.selectedCollectionName = '';
                this.updateCollectionSelectionUI();
            }
        });
    }

    bindDescriptionHandlers() {
        if (!this.descriptionField || !this.descriptionCounter) return;

        const updateCounter = () => {
            const length = this.descriptionField.value.length;
            this.descriptionCounter.textContent = `${length}/512`;
        };

        this.descriptionField.addEventListener('input', updateCounter);
        updateCounter();
    }

    bindSubmitHandlers() {
        if (this.submitButton) {
            this.submitButton.addEventListener('click', () => this.submitPost());
        }

        if (this.deleteButton) {
            this.deleteButton.addEventListener('click', () => this.requestDeleteConfirmation());
        }

    }

    bindTagsHandlers() {
        if (!this.tagsField || !this.tagsAddButton) return;

        this.tagsField.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.addTagFromInput();
                return;
            }

            if (event.key === 'Tab' && !event.shiftKey) {
                const topSuggestionButton = this.tagsSuggestList?.querySelector('button');
                const isSuggestOpen = this.tagsSuggestList && !this.tagsSuggestList.classList.contains('post-modal__tags-suggest-list--hidden');
                if (!isSuggestOpen || !topSuggestionButton) {
                    return;
                }

                event.preventDefault();
                this.tagsField.value = topSuggestionButton.dataset.tag || '';
                this.addTagFromInput();
            }
        });

        this.tagsField.addEventListener('input', () => this.loadTagSuggestions());
        this.tagsAddButton.addEventListener('click', () => this.addTagFromInput());
    }

    bindInputRestrictions() {
        if (this.tagsField) {
            this.tagsField.addEventListener('input', () => {
                const normalized = this.tagsField.value
                    .replace(/[^a-zа-яё0-9_#]/gi, '')
                    .slice(0, 20);
                if (normalized !== this.tagsField.value) {
                    this.tagsField.value = normalized;
                }
            });
        }
    }

    bindCloseHandlers() {
        this.modalBackdropClickHandler = (event) => {
            if (event.target === this.modal) {
                if (this.hasUnsavedChanges()) {
                    this.blockEditOverlayClose();
                    return;
                }

                this.requestClose();
            }
        };

        this.cancelClickHandler = (event) => {
            const cancelButton = event.target.closest('[data-component="create-post-cancel"]');
            if (cancelButton) {
                this.requestClose();
            }
        };

        this.escapeKeyHandler = (event) => {
            if (event.key === 'Escape' && !this.modal.classList.contains('post-modal--hidden')) {
                this.requestClose();
            }
        };

        this.modal.addEventListener('click', this.modalBackdropClickHandler);
        document.addEventListener('click', this.cancelClickHandler);
        document.addEventListener('keydown', this.escapeKeyHandler);
    }

    async open() {
        if (!this.modal.classList.contains('post-modal--hidden')) return;
        clearTimeout(this.closeResetTimer);
        this.modal.classList.remove('post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        await this.loadCollections();
    }

    blockEditOverlayClose() {
        if (!this.panel) return;
        clearTimeout(this.closeBlockedTimer);
        this.panel.classList.remove('post-modal__panel--close-blocked');
        void this.panel.offsetWidth;
        this.panel.classList.add('post-modal__panel--close-blocked');
        this.closeBlockedTimer = setTimeout(() => {
            this.panel.classList.remove('post-modal__panel--close-blocked');
            this.closeBlockedTimer = null;
        }, 1000);
    }

    requestClose() {
        if (this.hasUnsavedChanges()) {
            this.showConfirm(
                'unsaved-close',
                'Осторожно!',
                'У вас остались несохранённые изменения. После закрытия окна они будут сброшены. Хотите продолжить?',
                'Закрыть окно',
                'Назад'
            );
            return;
        }

        const isModalRoute = App.history?.isModalUrl?.(window.location.href);
        if (isModalRoute && window.history.length > 1) {
            window.history.back();
            return;
        }

        this.close();
    }

    close(options = {}) {
        const { skipHistorySync = false } = options;
        if (this.modal.classList.contains('post-modal--hidden')) return;
        if (!skipHistorySync) {
            this.restoreNonModalUrl();
        }
        this.currentModalUrl = null;
        if (App.modalCtrl) App.modalCtrl.close('post-modal');
        this.hideAlert();
        this.hideSuccessToast();
        this.hideTagSuggestions();
        this.hideConfirm();
        clearTimeout(this.closeBlockedTimer);
        this.panel?.classList.remove('post-modal__panel--close-blocked');
        this.modal.classList.add('post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        if (App.modalCtrl && !App.modalCtrl.isBlurVisible()) {
            App.utils.unlockBodyScroll();
        }
        clearTimeout(this.closeResetTimer);
        this.closeResetTimer = setTimeout(() => {
            this.resetForm();
            this.applyCreateModeUI();
        }, 220);
    }

    async openEditMode(payload) {
        const modalPostId = Number(payload?.postId || 0);
        if (modalPostId > 0) {
            this.setModalUrl(App.history?.getPostEditUrl?.(modalPostId) || `/post?id=${encodeURIComponent(String(modalPostId))}/edit`, payload);
        }
        clearTimeout(this.closeResetTimer);
        this.resetForm();
        this.applyEditModeUI(Number(payload.postId || 0));
        this.fillEditData(payload);

        if (App.modalCtrl) {
            App.modalCtrl.open('post-modal');
            this.showOnly();
            await this.loadCollections();
        } else {
            await this.open();
        }

        await this.preloadEditCollections(payload.postId);
        this.captureEditSnapshot();
    }

    applyCreateModeUI() {
        this.isEditMode = false;
        this.editPostId = 0;
        this.editSnapshot = null;
        this.modal.classList.remove('post-modal--edit');
        if (this.titleElement) this.titleElement.textContent = 'Новый пост';
        if (this.submitButton) this.submitButton.textContent = 'Создать пост';
    }

    applyEditModeUI(postId = this.editPostId) {
        this.isEditMode = true;
        this.editPostId = Number(postId || 0);
        this.modal.classList.add('post-modal--edit');
        if (this.titleElement) this.titleElement.textContent = 'Редактировать пост';
        if (this.submitButton) this.submitButton.textContent = 'Сохранить изменения';
    }

    fillEditData(payload) {
        if (this.descriptionField) this.descriptionField.value = String(payload.description || '');
        if (this.descriptionCounter) this.descriptionCounter.textContent = `${this.descriptionField.value.length}/512`;
        this.tags = Array.isArray(payload.tags) ? payload.tags.map((tag) => this.normalizeTag(String(tag || ''))).filter(Boolean) : [];
        this.renderTags();
        const imageSrc = String(payload.imageSrc || '');
        if (imageSrc) {
            this.preview.src = imageSrc;
            this.preview.classList.remove('post-modal__preview--hidden');
            this.placeholder.style.display = 'none';
            this.dropzone.classList.add('post-modal__upload-dropzone--filled');
        }
    }

    async preloadEditCollections(postId) {
        if (!postId) return;
        try {
            const response = await fetch(`/posts/bookmark/collections?post_id=${encodeURIComponent(String(postId))}`);
            if (!response.ok) return;
            const payload = await response.json();
            const selectedCollections = Array.isArray(payload.collections)
                ? payload.collections.filter((collection) => collection && collection.is_saved).map((collection) => collection.name)
                : (Array.isArray(payload.selected) ? payload.selected : []);
            this.selectedCollections = selectedCollections
                .map((name) => String(name) === 'Profile' ? 'Профиль' : String(name))
                .filter((name) => name !== 'Профиль');
            this.updateCollectionFieldValue();
            this.updateCollectionSelectionUI();
        } catch (error) {
            console.warn('Unable to preload collections for edit mode', error);
        }
    }

    handleFile(file) {
        if (this.isEditMode) {
            this.fileInput.value = '';
            this.showAlert('Изображение поста нельзя изменить при редактировании.');
            return;
        }

        if (!file) return;

        if (!this.allowedMimeTypes.includes(file.type)) {
            this.showAlert('Можно загрузить только PNG, JPEG или GIF.');
            this.fileInput.value = '';
            return;
        }

        if (file.size > this.maxFileSize) {
            this.showAlert('Размер файла должен быть не больше 20 МБ.');
            this.fileInput.value = '';
            return;
        }

        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
        }

        this.objectUrl = URL.createObjectURL(file);
        this.currentFile = file;
        this.preview.src = this.objectUrl;
        this.preview.classList.remove('post-modal__preview--hidden');
        this.placeholder.style.display = 'none';
        this.dropzone.classList.add('post-modal__upload-dropzone--filled');
    }

    attachCollectionItemHandlers() {
        this.collectionItems.forEach((item) => {
            item.addEventListener('click', () => {
                const collectionName = item.textContent.trim();
                if (!collectionName || collectionName === 'Профиль') return;
                this.toggleCollection(collectionName);
            });
        });
    }

    toggleCollection(collectionName) {
        const collectionIndex = this.selectedCollections.indexOf(collectionName);
        if (collectionIndex === -1) {
            this.selectedCollections.push(collectionName);
        } else {
            this.selectedCollections.splice(collectionIndex, 1);
        }
        this.updateCollectionFieldValue();
        this.updateCollectionSelectionUI();
    }

    updateCollectionFieldValue() {
        if (!this.collectionTrigger) return;
        if (this.selectedCollections.length === 0) {
            this.collectionTrigger.value = '';
            return;
        }
        this.collectionTrigger.value = ['Профиль', ...this.selectedCollections].join(', ');
    }

    updateCollectionSelectionUI() {
        this.collectionItems.forEach((item) => {
            const collectionName = item.textContent.trim();
            item.classList.toggle('is-selected', collectionName === 'Профиль' || this.selectedCollections.includes(collectionName));
        });
    }

    async loadCollections(collectionToSelect = '') {
        if (!this.collectionList || !this.collectionTrigger) return;

        try {
            const response = await fetch('/collections/list', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) return;

            const payload = await response.json();
            if (!payload.success || !Array.isArray(payload.collections)) return;

            const localizedCollections = payload.collections.map((collection) => (
                collection === 'Profile' ? 'Профиль' : collection
            ));
            const hasProfileCollection = localizedCollections.includes('Профиль');
            if (!hasProfileCollection) {
                localizedCollections.unshift('Профиль');
            }

            this.collectionList.innerHTML = localizedCollections.map((collection) => (
                `<li><button type="button" data-component="post-collection-item" ${collection === 'Профиль' ? 'data-is-profile="1"' : ''}>${collection}</button></li>`
            )).join('') + `
                <li><button type="button" class="post-modal__collection-add-button" data-component="post-collection-add-button">+</button></li>
            `;

            this.collectionItems = Array.from(this.modal.querySelectorAll('[data-component="post-collection-item"]'));
            this.attachCollectionItemHandlers();
            if (collectionToSelect) {
                const normalizedCollection = collectionToSelect === 'Profile' ? 'Профиль' : collectionToSelect;
                if (normalizedCollection !== 'Профиль' && !this.selectedCollections.includes(normalizedCollection)) {
                    this.selectedCollections.push(normalizedCollection);
                }
            }
            this.updateCollectionFieldValue();
            this.updateCollectionSelectionUI();

            const addButton = this.modal.querySelector('[data-component="post-collection-add-button"]');
            if (addButton) {
                addButton.addEventListener('click', () => {
                    document.dispatchEvent(new CustomEvent('collection-modal:open'));
                });
            }

        } catch (error) {
            console.warn('Unable to load collections list', error);
        }
    }

    resetForm() {
        this.fileInput.value = '';
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
        this.currentFile = null;
        this.preview.src = '';
        this.preview.classList.add('post-modal__preview--hidden');
        this.placeholder.style.display = '';
        this.dropzone.classList.remove('post-modal__upload-dropzone--filled');
        this.descriptionField.value = '';
        this.tagsField.value = '';
        this.tags = [];
        this.renderTags();
        this.collectionTrigger.value = '';
        this.selectedCollections = [];
        this.updateCollectionFieldValue();
        this.updateCollectionSelectionUI();
        this.descriptionCounter.textContent = '0/512';
        this.hideAlert();
        this.hideSuccessToast();
        this.hideTagSuggestions();
        this.hideConfirm();
    }

    buildPostFormData() {
        const formData = new FormData();
        formData.append('image', this.currentFile);
        formData.append('description', this.descriptionField?.value.trim() ?? '');
        formData.append('collection', this.selectedCollections.join(','));
        formData.append('tags', this.tags.join(' '));
        return formData;
    }

    async submitPost(preparedFormData = null) {
        if (this.isEditMode) {
            await this.updatePost();
            return;
        }

        if (!this.currentFile && !preparedFormData) {
            this.showAlert('Сначала добавьте изображение.');
            return;
        }

        const formData = preparedFormData ?? this.buildPostFormData();

        this.submitButton.disabled = true;

        try {
            const response = await fetch('/posts/create', {
                method: 'POST',
                body: formData
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось создать пост.');
            }

            this.close();
            this.showSuccessToast('Пост создан');
        } catch (error) {
            this.showAlert(error.message || 'Ошибка при создании поста.');
        } finally {
            this.submitButton.disabled = false;
        }
    }

    buildEditFormData() {
        const formData = new FormData();
        formData.append('post_id', String(this.editPostId));
        formData.append('description', this.descriptionField?.value.trim() ?? '');
        formData.append('collection', this.selectedCollections.join(','));
        formData.append('tags', this.tags.join(' '));
        return formData;
    }

    async updatePost() {
        if (!this.editPostId) {
            this.showAlert('Пост не найден.');
            return;
        }

        this.submitButton.disabled = true;

        try {
            const response = await fetch('/posts/update', {
                method: 'POST',
                body: this.buildEditFormData()
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось сохранить изменения.');
            }

            this.editSnapshot = this.getCurrentSnapshot();
            this.close();
            this.showSuccessToast('Изменения сохранены');
            document.dispatchEvent(new CustomEvent('post-modal:updated', { detail: payload }));
        } catch (error) {
            this.showAlert(error.message || 'Ошибка при сохранении изменений.');
        } finally {
            this.submitButton.disabled = false;
        }
    }

    async deletePost() {
        if (!this.editPostId) {
            this.showAlert('Пост не найден.');
            return;
        }

        this.deleteButton.disabled = true;

        try {
            const formData = new FormData();
            formData.append('post_id', String(this.editPostId));

            const response = await fetch('/posts/delete', {
                method: 'POST',
                body: formData
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Не удалось удалить пост.');
            }

            this.editSnapshot = this.getCurrentSnapshot();
            this.close();
            this.showSuccessToast('Пост удалён');
            document.dispatchEvent(new CustomEvent('post-modal:deleted', { detail: payload }));
        } catch (error) {
            this.showAlert(error.message || 'Ошибка при удалении поста.');
        } finally {
            this.deleteButton.disabled = false;
        }
    }


    requestDeleteConfirmation() {
        if (!this.isEditMode) return;
        this.showConfirm(
            'delete',
            'Удалить пость?',
            'После удаления пост и все комментарии к нему будут полностью удалены с сайта без возможности восстановления.',
            'Удалить',
            'Назад'
        );
    }


    hideConfirm() {
        this.confirmAction = null;
    }

    async showConfirm(action, title, message, submitLabel, cancelLabel = 'Назад') {
        this.confirmAction = action;
        const confirmed = await (App.warn?.open({
            title,
            description: message,
            confirmLabel: submitLabel,
            cancelLabel,
            onConfirm: async () => {
                if (action === 'unsaved-close') {
                    const isModalRoute = App.history?.isModalUrl?.(window.location.href);
                    if (isModalRoute && window.history.length > 1) {
                        this.close({ skipHistorySync: true });
                        App.history?.markNextPopAsModalOnly?.();
                        window.history.back();
                        return;
                    }
                    this.close();
                    return;
                }
                if (action === 'delete') {
                    await this.deletePost();
                }
            }
        }) || Promise.resolve(false));

        if (!confirmed) {
            this.confirmAction = null;
        }
    }

    getCurrentSnapshot() {
        return JSON.stringify({
            description: this.descriptionField?.value.trim() ?? '',
            collections: [...this.selectedCollections].sort(),
            tags: [...this.tags].sort(),
        });
    }

    captureEditSnapshot() {
        this.editSnapshot = this.getCurrentSnapshot();
    }

    hasUnsavedChanges() {
        if (this.isEditMode) {
            return this.editSnapshot !== null && this.getCurrentSnapshot() !== this.editSnapshot;
        }

        return Boolean(
            this.currentFile ||
            (this.descriptionField?.value.trim() ?? '') ||
            this.selectedCollections.length > 0 ||
            this.tags.length > 0 ||
            (this.tagsField?.value.trim() ?? '')
        );
    }

    normalizeTag(rawTag) {
        const lowered = rawTag.trim().replace(/^#+/, '').toLowerCase();
        if (!lowered) return '';

        const normalized = lowered.replace(/[^a-zа-яё0-9_]/gi, '');
        return normalized.slice(0, 20);
    }

    addTagFromInput() {
        if (!this.tagsField) return;

        if (this.tags.length >= this.maxTags) {
            this.showSuccessToast('Можно добавить не больше 24 тегов.');
            return;
        }

        const candidate = this.normalizeTag(this.tagsField.value);
        if (!candidate) {
            this.tagsField.value = '';
            return;
        }

        if (!this.tags.includes(candidate)) {
            this.tags.push(candidate);
        }

        this.tagsField.value = '';
        this.hideTagSuggestions();
        this.renderTags();
    }

    renderTags() {
        if (!this.tagsList) return;
        this.tagsList.innerHTML = '';
        const availableWidth = this.tagsList.clientWidth || 630;
        const rows = [this.createTagRow()];
        let hiddenCount = 0;

        this.tags.forEach((tag, index) => {
            const currentRow = rows[rows.length - 1];
            const tagEl = document.createElement('span');
            tagEl.className = 'post-modal__tag-item';
            tagEl.innerHTML = `<span class="post-modal__tag-label">#${tag}</span>`;
            tagEl.addEventListener('click', () => this.removeTag(index));
            currentRow.appendChild(tagEl);
            this.adjustTagsSpacing(currentRow, false);

            if (currentRow.scrollWidth <= availableWidth) {
                return;
            }

            currentRow.removeChild(tagEl);
            this.adjustTagsSpacing(currentRow, true);

            if (rows.length >= this.maxVisibleTagRows) {
                hiddenCount += 1;
                return;
            }

            const nextRow = this.createTagRow();
            rows.push(nextRow);
            nextRow.appendChild(tagEl);
            this.adjustTagsSpacing(nextRow, false);

            if (nextRow.scrollWidth > availableWidth) {
                nextRow.removeChild(tagEl);
                this.adjustTagsSpacing(nextRow, false);
                hiddenCount += 1;
            }
        });

        if (hiddenCount > 0) {
            this.appendHiddenMoreChip(hiddenCount, availableWidth);
        }

        const lastRow = rows[rows.length - 1];
        if (lastRow) {
            this.adjustTagsSpacing(lastRow, false);
        }
    }

    removeTag(index) {
        this.tags.splice(index, 1);
        this.renderTags();
    }

    createTagRow() {
        const rowEl = document.createElement('div');
        rowEl.className = 'post-modal__tags-row';
        this.tagsList.appendChild(rowEl);
        return rowEl;
    }

    appendHiddenMoreChip(hiddenCount, availableWidth) {
        if (!this.tagsList || hiddenCount <= 0) return;
        const rows = Array.from(this.tagsList.querySelectorAll('.post-modal__tags-row'));
        const lastRow = rows[rows.length - 1];
        if (!lastRow) return;

        const moreEl = document.createElement('span');
        moreEl.className = 'post-modal__tag-item post-modal__tag-item--more';
        moreEl.textContent = `+${hiddenCount}`;

        lastRow.appendChild(moreEl);
        this.adjustTagsSpacing(lastRow, false);

        while (lastRow.scrollWidth > availableWidth) {
            const regularChips = Array.from(lastRow.querySelectorAll('.post-modal__tag-item:not(.post-modal__tag-item--more)'));
            const chipToHide = regularChips.pop();
            if (!chipToHide) {
                break;
            }

            lastRow.removeChild(chipToHide);
            hiddenCount += 1;
            moreEl.textContent = `+${hiddenCount}`;
            this.adjustTagsSpacing(lastRow, false);
        }
    }

    adjustTagsSpacing(rowEl, isClosedRow) {
        if (!rowEl) return;
        const chipElements = Array.from(rowEl.querySelectorAll('.post-modal__tag-item:not(.post-modal__tag-item--more)'));

        if (chipElements.length <= 1) {
            rowEl.style.justifyContent = 'flex-start';
            rowEl.style.columnGap = '5px';
            return;
        }

        rowEl.style.justifyContent = isClosedRow ? 'space-between' : 'flex-start';
        rowEl.style.columnGap = isClosedRow ? '0px' : '5px';
    }

    showAlert(message) {
        if (!this.alertBox) return;

        clearTimeout(this.alertHideTimer);
        clearTimeout(this.alertFadeTimer);

        this.alertBox.textContent = message;
        this.alertBox.classList.remove('post-modal__alert--hidden', 'post-modal__alert--fade-out');

        this.alertHideTimer = setTimeout(() => {
            this.alertBox.classList.add('post-modal__alert--fade-out');
        }, 2500);

        this.alertFadeTimer = setTimeout(() => {
            this.hideAlert();
        }, 3000);
    }

    hideAlert() {
        if (!this.alertBox) return;
        clearTimeout(this.alertHideTimer);
        clearTimeout(this.alertFadeTimer);
        this.alertBox.classList.add('post-modal__alert--hidden');
        this.alertBox.classList.remove('post-modal__alert--fade-out');
        this.alertBox.textContent = '';
    }

    showSuccessToast(message) {
        document.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message }
        }));
    }

    hideSuccessToast() {
        // Старый single-toast больше не используется.
    }

    async loadTagSuggestions() {
        if (!this.tagsField || !this.tagsSuggestList || !this.tagsInputRow) return;

        const query = this.normalizeTag(this.tagsField.value);
        if (!query) {
            this.hideTagSuggestions();
            return;
        }

        try {
            const response = await fetch(`/hashtags/suggest?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                this.hideTagSuggestions();
                return;
            }

            const payload = await response.json();
            if (!payload.success || !Array.isArray(payload.tags) || payload.tags.length === 0) {
                this.hideTagSuggestions();
                return;
            }

            this.tagsSuggestList.innerHTML = payload.tags.map((tag) => (
                `<li><button type="button" data-tag="${this.escapeHtml(tag)}"><span class="post-modal__tags-suggest-match">#</span>${this.highlightSuggestionMatch(tag, query)}</button></li>`
            )).join('');

            this.tagsSuggestList.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => {
                    this.tagsField.value = button.dataset.tag || '';
                    this.addTagFromInput();
                });
            });

            this.tagsSuggestList.classList.remove('post-modal__tags-suggest-list--hidden');
            this.tagsInputRow.classList.add('post-modal__tags-input-row--suggest-open');
        } catch (error) {
            this.hideTagSuggestions();
        }
    }

    hideTagSuggestions() {
        if (!this.tagsSuggestList || !this.tagsInputRow) return;
        this.tagsSuggestList.classList.add('post-modal__tags-suggest-list--hidden');
        this.tagsSuggestList.innerHTML = '';
        this.tagsInputRow.classList.remove('post-modal__tags-input-row--suggest-open');
    }

    highlightSuggestionMatch(tag, query) {
        const escapedTag = this.escapeHtml(tag);
        const normalizedQuery = this.escapeRegex(query);
        if (!normalizedQuery) return escapedTag;

        return escapedTag.replace(
            new RegExp(`(${normalizedQuery})`, 'i'),
            '<span class="post-modal__tags-suggest-match">$1</span>'
        );
    }

    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showOnly() {
        clearTimeout(this.closeResetTimer);
        this.modal.classList.remove('post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'false');
    }

    hideOnly() {
        this.modal.classList.add('post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'true');
    }

    destroy() {
        clearTimeout(this.alertHideTimer);
        clearTimeout(this.alertFadeTimer);
        clearTimeout(this.closeResetTimer);
        clearTimeout(this.closeBlockedTimer);

        if (this.modal && this.modalBackdropClickHandler) {
            this.modal.removeEventListener('click', this.modalBackdropClickHandler);
        }
        if (this.openTriggerClickHandler) {
            document.removeEventListener('click', this.openTriggerClickHandler);
        }
        if (this.openCreateEventHandler) {
            document.removeEventListener('post-modal:open', this.openCreateEventHandler);
        }
        if (this.openEditEventHandler) {
            document.removeEventListener('post-modal:open-edit', this.openEditEventHandler);
        }
        if (this.collectionsChangedHandler) {
            document.removeEventListener('collections:changed', this.collectionsChangedHandler);
        }
        if (this.cancelClickHandler) {
            document.removeEventListener('click', this.cancelClickHandler);
        }
        if (this.escapeKeyHandler) {
            document.removeEventListener('keydown', this.escapeKeyHandler);
        }
    }

}
App.register('post_modal.js', CreatePostModalComponent);
