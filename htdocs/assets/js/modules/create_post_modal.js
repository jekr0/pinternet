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

        // Upload constraints/state
        this.maxFileSize = 20 * 1024 * 1024;
        this.allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];
        this.objectUrl = null;
    }

    init() {
        this.modal = document.getElementById('create-post-modal');
        if (!this.modal) return;

        this.dropzone = this.modal.querySelector('[data-component="post-upload-dropzone"]');
        this.fileInput = this.modal.querySelector('[data-component="post-upload-input"]');
        this.placeholder = this.modal.querySelector('[data-component="post-upload-placeholder"]');
        this.preview = this.modal.querySelector('[data-component="post-upload-preview"]');
        this.collectionTrigger = this.modal.querySelector('[data-component="post-collection-trigger"]');
        this.collectionItems = Array.from(this.modal.querySelectorAll('[data-component="post-collection-item"]'));

        if (!this.dropzone || !this.fileInput || !this.placeholder || !this.preview) return;

        this.bindOpenHandlers();
        this.bindUploadHandlers();
        this.bindCollectionHandlers();
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
        if (!this.collectionTrigger || this.collectionItems.length === 0) return;

        this.collectionItems.forEach((item) => {
            item.addEventListener('click', () => {
                this.collectionTrigger.value = item.textContent.trim();
            });
        });
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

    toggleCollectionList(shouldOpen) {
        if (!this.collectionList || !this.collectionTrigger) return;

        this.collectionList.classList.toggle('create-post-modal__collection-list--open', shouldOpen);
        this.collectionTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }

    open() {
        this.modal.classList.remove('create-post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'false');
    }

    close() {
        this.modal.classList.add('create-post-modal--hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        this.toggleCollectionList(false);
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
        this.preview.src = this.objectUrl;
        this.preview.classList.remove('create-post-modal__preview--hidden');
        this.placeholder.style.display = 'none';
        this.dropzone.classList.add('create-post-modal__upload-dropzone--filled');
    }
}

App.register('create_post_modal.js', CreatePostModalComponent);
