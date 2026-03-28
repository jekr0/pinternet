class CreatePostModalComponent {
    constructor() {
        // Modal and upload elements
        this.modal = null;
        this.dropzone = null;
        this.fileInput = null;
        this.placeholder = null;
        this.preview = null;

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
        this.confirmOverlay = null;
        this.confirmText = null;
        this.confirmYesButton = null;
        this.confirmNoButton = null;
        this.pendingCreatePayload = null;
        this.alertBox = null;
        this.tagsSuggestList = null;
        this.tagsInputRow = null;

        // Upload constraints/state
        this.maxFileSize = 20 * 1024 * 1024;
        this.allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];
        this.objectUrl = null;
        this.currentFile = null;
    }

    init() {
        this.modal = document.getElementById('create-post-modal');
        if (!this.modal) return;

        this.dropzone = this.modal.querySelector('[data-component="post-upload-dropzone"]');
        this.fileInput = this.modal.querySelector('[data-component="post-upload-input"]');
        this.placeholder = this.modal.querySelector('[data-component="post-upload-placeholder"]');
        this.preview = this.modal.querySelector('[data-component="post-upload-preview"]');
        this.collectionTrigger = this.modal.querySelector('[data-component="post-collection-trigger"]');
        this.collectionList = this.modal.querySelector('[data-component="post-collection-list"]');
        this.collectionItems = Array.from(this.modal.querySelectorAll('[data-component="post-collection-item"]'));
        this.descriptionField = this.modal.querySelector('[data-component="post-description"]');
        this.descriptionCounter = this.modal.querySelector('[data-component="post-description-counter"]');
        this.tagsField = this.modal.querySelector('.create-post-modal__input--tags');
        this.submitButton = this.modal.querySelector('[data-component="create-post-submit"]');
        this.tagsAddButton = this.modal.querySelector('[data-component="post-tags-add-button"]');
        this.tagsList = this.modal.querySelector('[data-component="post-tags-list"]');
        this.confirmOverlay = this.modal.querySelector('[data-component="create-collection-confirm"]');
        this.confirmText = this.modal.querySelector('[data-component="create-collection-confirm-text"]');
        this.confirmYesButton = this.modal.querySelector('[data-component="create-collection-confirm-yes"]');
        this.confirmNoButton = this.modal.querySelector('[data-component="create-collection-confirm-no"]');
        this.alertBox = this.modal.querySelector('[data-component="create-post-alert"]');
        this.tagsSuggestList = this.modal.querySelector('[data-component="post-tags-suggest-list"]');
        this.tagsInputRow = this.modal.querySelector('.create-post-modal__tags-input-row');

        if (!this.dropzone || !this.fileInput || !this.placeholder || !this.preview) return;

        this.bindOpenHandlers();
        this.bindUploadHandlers();
        this.bindDescriptionHandlers();
        this.bindCollectionHandlers();
        this.bindTagsHandlers();
        this.bindInputRestrictions();
        this.bindCollectionConfirmHandlers();
        this.bindSubmitHandlers();
        this.bindCloseHandlers();
    }

    bindOpenHandlers() {
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-component="create-post-open"]');
            if (!trigger) return;
            event.preventDefault();
            this.open();
        });

        document.addEventListener('create-post-modal:open', () => this.open());
    }

    bindUploadHandlers() {
        this.dropzone.addEventListener('click', () => this.fileInput.click());
        this.dropzone.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.fileInput.click();
            }
        });

        this.fileInput.addEventListener('change', () => {
            const file = this.fileInput.files?.[0];
            this.handleFile(file);
        });

        this.dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.dropzone.classList.add('create-post-modal__upload-dropzone--dragover');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('create-post-modal__upload-dropzone--dragover');
        });

        this.dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            this.dropzone.classList.remove('create-post-modal__upload-dropzone--dragover');
            const file = event.dataTransfer?.files?.[0];
            this.handleFile(file);
        });
    }

    bindCollectionHandlers() {
        if (!this.collectionTrigger) return;

        this.attachCollectionItemHandlers();
    }

    bindDescriptionHandlers() {
        if (!this.descriptionField || !this.descriptionCounter) return;

        const updateCounter = () => {
            const length = this.descriptionField.value.length;
            this.descriptionCounter.textContent = `${length}/255`;
        };

        this.descriptionField.addEventListener('input', updateCounter);
        updateCounter();
    }

    bindSubmitHandlers() {
        if (!this.submitButton) return;

        this.submitButton.addEventListener('click', () => this.submitPost());
    }

    bindTagsHandlers() {
        if (!this.tagsField || !this.tagsAddButton) return;

        this.tagsField.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.addTagFromInput();
            }
        });

        this.tagsField.addEventListener('input', () => this.loadTagSuggestions());
        this.tagsAddButton.addEventListener('click', () => this.addTagFromInput());
    }

    bindInputRestrictions() {
        if (this.collectionTrigger) {
            this.collectionTrigger.addEventListener('input', () => {
                const normalized = this.collectionTrigger.value
                    .replace(/[^a-zа-яё0-9_ ]/gi, '')
                    .slice(0, 32);
                if (normalized !== this.collectionTrigger.value) {
                    this.collectionTrigger.value = normalized;
                }
            });
        }

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

    bindCollectionConfirmHandlers() {
        if (!this.confirmOverlay || !this.confirmYesButton || !this.confirmNoButton) return;

        this.confirmNoButton.addEventListener('click', () => {
            this.hideCollectionConfirm();
        });

        this.confirmYesButton.addEventListener('click', async () => {
            if (!this.pendingCreatePayload) return;
            const payload = new FormData();
            payload.append('image', this.pendingCreatePayload.image);
            payload.append('description', this.pendingCreatePayload.description);
            payload.append('collection', this.pendingCreatePayload.collection);
            payload.append('tags', this.pendingCreatePayload.tags);
            payload.append('confirm_create_collection', '1');

            await this.submitPost(payload, true);
        });

        this.confirmYesButton.addEventListener('click', async () => {
            if (!this.pendingCreatePayload) return;
            const payload = new FormData();
            payload.append('image', this.pendingCreatePayload.image);
            payload.append('description', this.pendingCreatePayload.description);
            payload.append('collection', this.pendingCreatePayload.collection);
            payload.append('tags', this.pendingCreatePayload.tags);
            payload.append('confirm_create_collection', '1');

            await this.submitPost(payload, true);
        });

        this.tagsAddButton.addEventListener('click', () => this.addTagFromInput());
    }

    bindCloseHandlers() {
        this.modal.addEventListener('click', (event) => {
            if (!this.confirmOverlay?.classList.contains('create-post-modal__confirm--hidden')) {
                return;
            }
            if (event.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener('click', (event) => {
            const cancelButton = event.target.closest('[data-component="create-post-cancel"]');
            if (cancelButton) {
                this.close();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.modal.classList.contains('create-post-modal--hidden')) {
                this.close();
            }
        });
    }

    open() {
        this.modal.classList.remove('create-post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        this.loadBoards();
    }

    close() {
        this.hideCollectionConfirm();
        this.hideAlert();
        this.hideTagSuggestions();
        this.modal.classList.add('create-post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'true');
    }

    handleFile(file) {
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
        this.preview.classList.remove('create-post-modal__preview--hidden');
        this.placeholder.style.display = 'none';
        this.dropzone.classList.add('create-post-modal__upload-dropzone--filled');
    }

    attachCollectionItemHandlers() {
        this.collectionItems.forEach((item) => {
            item.addEventListener('click', () => {
                this.collectionTrigger.value = item.textContent.trim();
            });
        });
    }

    async loadBoards() {
        if (!this.collectionList || !this.collectionTrigger) return;

        try {
            const response = await fetch('/boards/list', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) return;

            const payload = await response.json();
            if (!payload.success || !Array.isArray(payload.boards) || payload.boards.length === 0) return;

            const localizedBoards = payload.boards.map((board) => (
                board === 'Profile' ? 'Профиль' : board
            ));

            this.collectionList.innerHTML = localizedBoards.map((board) => (
                `<li><button type="button" data-component="post-collection-item" ${board === 'Профиль' ? 'data-is-profile="1"' : ''}>${board}</button></li>`
            )).join('');

            this.collectionItems = Array.from(this.modal.querySelectorAll('[data-component="post-collection-item"]'));
            this.attachCollectionItemHandlers();

            if (!this.collectionTrigger.value) {
                this.collectionTrigger.value = localizedBoards[0];
            }
        } catch (error) {
            console.warn('Unable to load boards list', error);
        }
    }

    resetForm() {
        this.fileInput.value = '';
        this.currentFile = null;
        this.preview.src = '';
        this.preview.classList.add('create-post-modal__preview--hidden');
        this.placeholder.style.display = '';
        this.dropzone.classList.remove('create-post-modal__upload-dropzone--filled');
        this.descriptionField.value = '';
        this.tagsField.value = '';
        this.tags = [];
        this.renderTags();
        this.collectionTrigger.value = '';
        this.descriptionCounter.textContent = '0/255';
        this.hideAlert();
        this.hideTagSuggestions();
    }

    buildPostFormData() {
        const formData = new FormData();
        formData.append('image', this.currentFile);
        formData.append('description', this.descriptionField?.value.trim() ?? '');
        formData.append('collection', this.collectionTrigger?.value.trim() || 'Профиль');
        formData.append('tags', this.tags.join(' '));
        return formData;
    }

    async submitPost(preparedFormData = null, redirectToHomeOnSuccess = false) {
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
                if (payload.requires_collection_creation) {
                    this.pendingCreatePayload = {
                        image: this.currentFile,
                        description: this.descriptionField?.value.trim() ?? '',
                        collection: this.collectionTrigger?.value.trim() || 'Профиль',
                        tags: this.tags.join(' ')
                    };
                    this.showCollectionConfirm(payload.collection_name || this.pendingCreatePayload.collection);
                    return;
                }
                throw new Error(payload.error || 'Не удалось создать пост.');
            }

            this.resetForm();
            this.close();
            if (redirectToHomeOnSuccess) {
                window.location.href = '/';
                return;
            }
            this.showAlert('Пост создан!');
        } catch (error) {
            this.showAlert(error.message || 'Ошибка при создании поста.');
        } finally {
            this.submitButton.disabled = false;
        }
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
            this.showAlert('Можно добавить не больше 24 тегов.');
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
            tagEl.className = 'create-post-modal__tag-item';
            tagEl.innerHTML = `<span class="create-post-modal__tag-label">#${tag}</span>`;
            tagEl.addEventListener('click', () => this.removeTag(index));
            currentRow.appendChild(tagEl);
            this.adjustTagsSpacing(currentRow, availableWidth);

            if (currentRow.scrollWidth <= availableWidth) {
                return;
            }

            currentRow.removeChild(tagEl);
            this.adjustTagsSpacing(currentRow, availableWidth);

            if (rows.length >= this.maxVisibleTagRows) {
                hiddenCount += 1;
                return;
            }

            const nextRow = this.createTagRow();
            rows.push(nextRow);
            nextRow.appendChild(tagEl);
            this.adjustTagsSpacing(nextRow, availableWidth);

            if (nextRow.scrollWidth > availableWidth) {
                nextRow.removeChild(tagEl);
                this.adjustTagsSpacing(nextRow, availableWidth);
                hiddenCount += 1;
            }
        });

        if (hiddenCount > 0) {
            this.appendHiddenMoreChip(hiddenCount, availableWidth);
        }
    }

    removeTag(index) {
        this.tags.splice(index, 1);
        this.renderTags();
    }

    createTagRow() {
        const rowEl = document.createElement('div');
        rowEl.className = 'create-post-modal__tags-row';
        this.tagsList.appendChild(rowEl);
        return rowEl;
    }

    appendHiddenMoreChip(hiddenCount, availableWidth) {
        if (!this.tagsList || hiddenCount <= 0) return;
        const rows = Array.from(this.tagsList.querySelectorAll('.create-post-modal__tags-row'));
        const lastRow = rows[rows.length - 1];
        if (!lastRow) return;

        const moreEl = document.createElement('span');
        moreEl.className = 'create-post-modal__tag-item create-post-modal__tag-item--more';
        moreEl.textContent = `+${hiddenCount}`;

        lastRow.appendChild(moreEl);
        this.adjustTagsSpacing(lastRow, availableWidth);

        while (lastRow.scrollWidth > availableWidth) {
            const regularChips = Array.from(lastRow.querySelectorAll('.create-post-modal__tag-item:not(.create-post-modal__tag-item--more)'));
            const chipToHide = regularChips.pop();
            if (!chipToHide) {
                break;
            }

            lastRow.removeChild(chipToHide);
            hiddenCount += 1;
            moreEl.textContent = `+${hiddenCount}`;
            this.adjustTagsSpacing(lastRow, availableWidth);
        }
    }

    adjustTagsSpacing(rowEl, availableWidth = 630) {
        if (!rowEl) return;
        const chipElements = Array.from(rowEl.querySelectorAll('.create-post-modal__tag-item:not(.create-post-modal__tag-item--more)'));

        if (chipElements.length <= 1) {
            rowEl.style.columnGap = '5px';
            return;
        }

        const totalChipWidth = chipElements.reduce((sum, el) => sum + el.offsetWidth, 0);
        const available = availableWidth - totalChipWidth;
        const computedGap = Math.floor(available / (chipElements.length - 1));
        const normalizedGap = Math.max(5, Math.min(30, computedGap));
        rowEl.style.columnGap = `${normalizedGap}px`;
    }

    showCollectionConfirm(collectionName) {
        if (!this.confirmOverlay || !this.confirmText) return;
        this.confirmText.textContent = `Коллекции "${collectionName}" не существует.\nХотите создать её?`;
        this.confirmOverlay.classList.remove('create-post-modal__confirm--hidden');
        this.confirmOverlay.setAttribute('aria-hidden', 'false');
    }

    hideCollectionConfirm() {
        if (!this.confirmOverlay) return;
        this.confirmOverlay.classList.add('create-post-modal__confirm--hidden');
        this.confirmOverlay.setAttribute('aria-hidden', 'true');
        this.pendingCreatePayload = null;
    }

    showAlert(message) {
        if (!this.alertBox) return;
        this.alertBox.textContent = message;
        this.alertBox.classList.remove('create-post-modal__alert--hidden');
    }

    hideAlert() {
        if (!this.alertBox) return;
        this.alertBox.classList.add('create-post-modal__alert--hidden');
        this.alertBox.textContent = '';
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
                `<li><button type="button" data-tag="${tag}">#${tag}</button></li>`
            )).join('');

            this.tagsSuggestList.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => {
                    this.tagsField.value = button.dataset.tag || '';
                    this.addTagFromInput();
                });
            });

            this.tagsSuggestList.classList.remove('create-post-modal__tags-suggest-list--hidden');
            this.tagsInputRow.classList.add('create-post-modal__tags-input-row--suggest-open');
        } catch (error) {
            this.hideTagSuggestions();
        }
    }

    hideTagSuggestions() {
        if (!this.tagsSuggestList || !this.tagsInputRow) return;
        this.tagsSuggestList.classList.add('create-post-modal__tags-suggest-list--hidden');
        this.tagsSuggestList.innerHTML = '';
        this.tagsInputRow.classList.remove('create-post-modal__tags-input-row--suggest-open');
    }
}

App.register('create_post_modal.js', CreatePostModalComponent);
