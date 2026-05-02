class CreatePostModalComponent {
    constructor() {
        // Modal and upload elements
        this.modal = null;
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
        this.isEditMode = false;
        this.initialSnapshot = null;
    }

    init() {
        this.modal = document.getElementById('post-modal');
        if (!this.modal) return;

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

        if (!this.dropzone || !this.fileInput || !this.placeholder || !this.preview) return;

        if (this.uploadIcon) {
            const svgSrc = this.uploadIcon.getAttribute('data-svg-src');
            if (svgSrc) {
                App.utils.loadSVG(svgSrc, this.uploadIcon);
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

        document.addEventListener('create-collection:created', async (event) => {
            if (event.detail?.source !== 'post-modal') return;
            const createdBoard = String(event.detail?.board || '').trim();
            await this.loadBoards(createdBoard);
        });
    }

    bindOpenHandlers() {
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-component="create-post-open"]');
            if (!trigger) return;
            event.preventDefault();
            this.applyCreateModeUI();
            this.open();
        });

        document.addEventListener('post-modal:open', () => {
            this.applyCreateModeUI();
            this.open();
        });
        document.addEventListener('post-modal:open-edit', async (event) => this.openEditMode(event.detail || {}));
    }

    bindUploadHandlers() {
        this.dropzone.addEventListener('click', () => {
            if (this.isEditMode) return;
            this.fileInput.click();
        });
        this.dropzone.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                if (this.isEditMode) return;
                event.preventDefault();
                this.fileInput.click();
            }
        });

        this.fileInput.addEventListener('change', () => {
            if (this.isEditMode) return;
            const file = this.fileInput.files?.[0];
            this.handleFile(file);
        });

        this.dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.dropzone.classList.add('post-modal__upload-dropzone--dragover');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('post-modal__upload-dropzone--dragover');
        });

        this.dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            this.dropzone.classList.remove('post-modal__upload-dropzone--dragover');
            const file = event.dataTransfer?.files?.[0];
            if (this.isEditMode) return;
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
        if (!this.submitButton) return;

        this.submitButton.addEventListener('click', () => this.submitPost());
        const deleteButton = this.modal.querySelector('[data-component="post-edit-delete"]');
        deleteButton?.addEventListener('click', () => this.deletePost());
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
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.pulsePanelBorder();
            }
        });

        document.addEventListener('click', (event) => {
            const cancelButton = event.target.closest('[data-component="create-post-cancel"]');
            if (cancelButton) {
                this.handleBackAction();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.modal.classList.contains('post-modal--hidden')) {
                this.close();
            }
        });
    }

    open() {
        if (!this.modal.classList.contains('post-modal--hidden')) return;
        this.modal.classList.remove('post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        App.utils.lockBodyScroll();
        this.loadBoards();
        this.captureSnapshot();
    }

    close() {
        if (this.modal.classList.contains('post-modal--hidden')) return;
        this.hideAlert();
        this.hideSuccessToast();
        this.hideTagSuggestions();
        this.modal.classList.add('post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        App.utils.unlockBodyScroll();
        this.resetForm();
        window.setTimeout(() => {
            if (this.modal.classList.contains('post-modal--hidden')) {
                this.applyCreateModeUI();
            }
        }, 220);
    }

    async openEditMode(payload) {
        this.applyEditModeUI();
        this.open();
        await this.fillEditData(payload);
        this.captureSnapshot();
    }

    applyCreateModeUI() {
        this.isEditMode = false;
        this.modal.classList.remove('post-modal--edit');
        if (this.titleElement) this.titleElement.textContent = 'Новый пост';
        if (this.submitButton) this.submitButton.textContent = 'Создать пост';
    }

    applyEditModeUI() {
        this.isEditMode = true;
        this.modal.classList.add('post-modal--edit');
        if (this.titleElement) this.titleElement.textContent = 'Редактировать пост';
        if (this.submitButton) this.submitButton.textContent = 'Сохранить';
    }

    async fillEditData(payload) {
        if (this.descriptionField) this.descriptionField.value = String(payload.description || '');
        if (this.descriptionCounter) this.descriptionCounter.textContent = `${this.descriptionField.value.length}/512`;
        this.tags = Array.isArray(payload.tags) ? payload.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [];
        this.renderTags();
        const imageSrc = String(payload.imageSrc || '');
        if (imageSrc) {
            this.preview.src = imageSrc;
            this.preview.classList.remove('post-modal__preview--hidden');
            this.placeholder.style.display = 'none';
            this.dropzone.classList.add('post-modal__upload-dropzone--filled');
        }
        await this.preloadEditCollections(payload.postId);
    }

    async preloadEditCollections(postId) {
        if (!postId) return;
        try {
            const response = await fetch(`/posts/bookmark/boards?post_id=${encodeURIComponent(String(postId))}`);
            if (!response.ok) return;
            const payload = await response.json();
            const selectedBoards = Array.isArray(payload.boards)
                ? payload.boards.filter((b) => b && b.is_saved).map((b) => b.name)
                : [];
            this.selectedCollections = selectedBoards
                .map((name) => String(name) === 'Profile' ? 'Профиль' : String(name))
                .filter((name) => name !== 'Профиль');
            this.updateCollectionFieldValue();
            this.updateCollectionSelectionUI();
        } catch (error) {
            console.warn('Unable to preload collections for edit mode', error);
        }
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
            item.classList.toggle('is-selected', this.selectedCollections.includes(collectionName));
        });
    }

    async loadBoards(boardToSelect = '') {
        if (!this.collectionList || !this.collectionTrigger) return;

        try {
            const response = await fetch('/boards/list', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) return;

            const payload = await response.json();
            if (!payload.success || !Array.isArray(payload.boards)) return;

            const localizedBoards = payload.boards.map((board) => (
                board === 'Profile' ? 'Профиль' : board
            ));
            const hasProfileBoard = localizedBoards.includes('Профиль');
            if (!hasProfileBoard) {
                localizedBoards.unshift('Профиль');
            }

            this.collectionList.innerHTML = localizedBoards.map((board) => (
                `<li><button type="button" data-component="post-collection-item" ${board === 'Профиль' ? 'data-is-profile="1"' : ''}>${board}</button></li>`
            )).join('') + `
                <li><button type="button" class="post-modal__collection-add-button" data-component="post-collection-add-button">+</button></li>
            `;

            this.collectionItems = Array.from(this.modal.querySelectorAll('[data-component="post-collection-item"]'));
            this.attachCollectionItemHandlers();
            if (boardToSelect) {
                const normalizedBoard = boardToSelect === 'Profile' ? 'Профиль' : boardToSelect;
                if (normalizedBoard !== 'Профиль' && !this.selectedCollections.includes(normalizedBoard)) {
                    this.selectedCollections.push(normalizedBoard);
                }
            }
            this.updateCollectionFieldValue();
            this.updateCollectionSelectionUI();

            const addButton = this.modal.querySelector('[data-component="post-collection-add-button"]');
            if (addButton) {
                addButton.addEventListener('click', () => {
                    document.dispatchEvent(new CustomEvent('create-collection:open', {
                        detail: { source: 'post-modal' }
                    }));
                });
            }

        } catch (error) {
            console.warn('Unable to load boards list', error);
        }
    }

    resetForm() {
        this.fileInput.value = '';
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
        this.initialSnapshot = null;
    }

    captureSnapshot() {
        this.initialSnapshot = JSON.stringify({
            description: this.descriptionField?.value || '',
            tags: [...this.tags],
            collections: [...this.selectedCollections],
        });
    }

    hasUnsavedChanges() {
        if (!this.initialSnapshot) return false;
        const current = JSON.stringify({
            description: this.descriptionField?.value || '',
            tags: [...this.tags],
            collections: [...this.selectedCollections],
        });
        return current !== this.initialSnapshot;
    }

    async handleBackAction() {
        if (this.isEditMode && this.hasUnsavedChanges()) {
            const shouldSave = window.confirm('У вас есть несохранённые изменения! Сохранить их?\nНажмите ОК для сохранения или Отмена для выхода.');
            if (shouldSave) {
                await this.submitPost();
                return;
            }
        }
        this.close();
    }

    pulsePanelBorder() {
        const panel = this.modal?.querySelector('.post-modal__panel');
        if (!panel) return;
        panel.classList.add('post-modal__panel--pulse');
        window.setTimeout(() => panel.classList.remove('post-modal__panel--pulse'), 1000);
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
            return this.savePostChanges();
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

            this.resetForm();
            this.close();
            this.showSuccessToast('Пост создан');
        } catch (error) {
            this.showAlert(error.message || 'Ошибка при создании поста.');
        } finally {
            this.submitButton.disabled = false;
        }
    }

    async savePostChanges() {
        const postId = Number(window.location.pathname.match(/\/post\/(\d+)/)?.[1] || 0);
        if (!postId) return;
        this.submitButton.disabled = true;
        try {
            const formData = new FormData();
            formData.append('post_id', String(postId));
            formData.append('description', this.descriptionField?.value.trim() ?? '');
            formData.append('collection', this.selectedCollections.join(','));
            formData.append('tags', this.tags.join(' '));
            const response = await fetch('/posts/update', { method: 'POST', body: formData });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.error || 'Не удалось сохранить изменения.');
            this.showSuccessToast('Изменения поста сохранены');
            window.location.reload();
        } catch (error) {
            this.showAlert(error.message || 'Ошибка сохранения.');
        } finally {
            this.submitButton.disabled = false;
        }
    }

    async deletePost() {
        const confirmed = window.confirm('После удаления пост не получится восстановить! Удалить его?');
        if (!confirmed) return;
        const postId = Number(window.location.pathname.match(/\/post\/(\d+)/)?.[1] || 0);
        if (!postId) return;
        try {
            const response = await fetch('/posts/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body: new URLSearchParams({ post_id: String(postId) }).toString()
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.error || 'Не удалось удалить пост.');
            this.showSuccessToast('Пост удалён');
            window.location.href = '/';
        } catch (error) {
            this.showAlert(error.message || 'Ошибка удаления.');
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
}

App.register('post_modal.js', CreatePostModalComponent);
