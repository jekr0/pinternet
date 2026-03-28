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
        this.maxVisibleTagRowsHeight = 51;

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

        if (!this.dropzone || !this.fileInput || !this.placeholder || !this.preview) return;

        this.bindOpenHandlers();
        this.bindUploadHandlers();
        this.bindDescriptionHandlers();
        this.bindCollectionHandlers();
        this.bindTagsHandlers();
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

        this.tagsAddButton.addEventListener('click', () => this.addTagFromInput());
    }

    bindCloseHandlers() {
        this.modal.addEventListener('click', (event) => {
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
        this.modal.classList.add('create-post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'true');
    }

    handleFile(file) {
        if (!file) return;

        if (!this.allowedMimeTypes.includes(file.type)) {
            alert('Можно загрузить только PNG, JPEG или GIF.');
            this.fileInput.value = '';
            return;
        }

        if (file.size > this.maxFileSize) {
            alert('Размер файла должен быть не больше 20 МБ.');
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
                `<li><button type="button" data-component="post-collection-item">${board}</button></li>`
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
        this.collectionTrigger.value = 'Профиль';
        this.descriptionCounter.textContent = '0/255';
    }

    async submitPost() {
        if (!this.currentFile) {
            alert('Сначала добавьте изображение.');
            return;
        }

        const formData = new FormData();
        formData.append('image', this.currentFile);
        formData.append('description', this.descriptionField?.value.trim() ?? '');
        formData.append('collection', this.collectionTrigger?.value.trim() || 'Профиль');
        formData.append('tags', this.tags.join(' '));

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
            alert('Пост создан!');
        } catch (error) {
            alert(error.message || 'Ошибка при создании поста.');
        } finally {
            this.submitButton.disabled = false;
        }
    }

    normalizeTag(rawTag) {
        const lowered = rawTag.trim().replace(/^#+/, '').toLowerCase();
        if (!lowered) return '';

        const normalized = lowered.replace(/[^a-zа-яё0-9_]/gi, '');
        return normalized.slice(0, 16);
    }

    addTagFromInput() {
        if (!this.tagsField) return;

        if (this.tags.length >= this.maxTags) {
            alert('Можно добавить не больше 24 тегов.');
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
        this.renderTags();
    }

    renderTags() {
        if (!this.tagsList) return;
        this.tagsList.innerHTML = '';

        const visibleTags = [];
        let hiddenCount = 0;

        this.tags.forEach((tag) => {
            const tagEl = document.createElement('span');
            tagEl.className = 'create-post-modal__tag-item';
            tagEl.textContent = `#${tag}`;
            this.tagsList.appendChild(tagEl);

            if (this.tagsList.scrollHeight > this.maxVisibleTagRowsHeight) {
                this.tagsList.removeChild(tagEl);
                hiddenCount += 1;
            } else {
                visibleTags.push(tag);
            }
        });

        if (hiddenCount > 0) {
            const moreEl = document.createElement('span');
            moreEl.className = 'create-post-modal__tag-item create-post-modal__tag-item--more';
            moreEl.textContent = '...';
            this.tagsList.appendChild(moreEl);
        }
    }
}

App.register('create_post_modal.js', CreatePostModalComponent);
