class ProfileModalComponent {
    constructor() {
        this.root = null;
        this.panel = null;
        this.dropzone = null;
        this.fileInput = null;
        this.placeholder = null;
        this.preview = null;
        this.nicknameInput = null;
        this.aboutInput = null;
        this.counter = null;
        this.saveButton = null;
        this.cancelButton = null;
        this.selectedFile = null;
        this.snapshot = '';
        this.openHandler = null;
        this.closeBlockedTimer = null;
        this.objectUrl = null;
        this.lastNonModalUrl = App.history?.isModalUrl?.(window.location.href) ? '/' : window.location.pathname + window.location.search;
        this.currentModalUrl = null;
    }

    init() {
        this.root = document.getElementById('profile-modal');
        if (!this.root) return;

        this.panel = this.root.querySelector('.profile-modal__panel');
        this.dropzone = this.root.querySelector('[data-component="profile-avatar-dropzone"]');
        this.fileInput = this.root.querySelector('[data-component="profile-avatar-input"]');
        this.placeholder = this.root.querySelector('[data-component="profile-avatar-placeholder"]');
        this.preview = this.root.querySelector('[data-component="profile-avatar-preview"]');
        this.nicknameInput = this.root.querySelector('[data-component="profile-nickname"]');
        this.aboutInput = this.root.querySelector('[data-component="profile-about"]');
        this.counter = this.root.querySelector('[data-component="profile-about-counter"]');
        this.saveButton = this.root.querySelector('[data-component="profile-modal-save"]');
        this.cancelButton = this.root.querySelector('[data-component="profile-modal-cancel"]');

        this.openHandler = (event) => this.open(event?.detail || {});
        document.addEventListener('profile-modal:open', this.openHandler);

        this.dropzone?.addEventListener('click', () => this.fileInput?.click());
        this.dropzone?.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            this.fileInput?.click();
        });
        this.dropzone?.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.dropzone.classList.add('profile-modal__avatar-dropzone--dragover');
        });
        this.dropzone?.addEventListener('dragleave', () => this.dropzone.classList.remove('profile-modal__avatar-dropzone--dragover'));
        this.dropzone?.addEventListener('drop', (event) => {
            event.preventDefault();
            this.dropzone.classList.remove('profile-modal__avatar-dropzone--dragover');
            this.handleFile(event.dataTransfer?.files?.[0]);
        });
        this.fileInput?.addEventListener('change', () => this.handleFile(this.fileInput.files?.[0]));
        this.nicknameInput?.addEventListener('input', () => this.restrictNicknameInput());
        this.aboutInput?.addEventListener('input', () => this.updateCounter());
        this.saveButton?.addEventListener('click', () => this.save());
        this.cancelButton?.addEventListener('click', () => this.requestClose());
        this.root.addEventListener('click', (event) => {
            if (event.target !== this.root) return;
            if (this.hasUnsavedChanges()) {
                this.blockOverlayClose();
                return;
            }
            this.requestClose();
        });

        App.modalCtrl?.register('profile-modal', { show: () => this.showOnly(), hide: () => this.hideOnly() });
        App.utils.loadSVG('/assets/images/icons/upload.svg', this.root.querySelector('[data-svg-src]'));
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
        const targetUrl = this.lastNonModalUrl || '/';
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl === targetUrl) return;
        if (App.history?.replaceUrl) {
            App.history.replaceUrl(targetUrl);
        } else {
            window.history.replaceState({}, '', targetUrl);
        }
    }

    open(options = {}) {
        this.setModalUrl('/profile/edit', options);
        this.selectedFile = null;
        if (this.fileInput) this.fileInput.value = '';
        if (this.nicknameInput) {
            const username = this.root.dataset.currentUsername || '';
            this.nicknameInput.value = username;
            this.nicknameInput.placeholder = username ? `@${username}` : '@nickname';
        }
        if (this.aboutInput) this.aboutInput.value = this.root.dataset.currentBio || '';
        this.setPreview(this.root.dataset.currentAvatar || '', false);
        this.updateCounter();
        this.captureSnapshot();
        App.modalCtrl ? App.modalCtrl.open('profile-modal') : this.showOnly();
        this.nicknameInput?.focus();
    }

    showOnly() {
        this.root.classList.remove('profile-modal--hidden');
        this.root.setAttribute('aria-hidden', 'false');
    }

    hideOnly() {
        this.root.classList.add('profile-modal--hidden');
        this.root.setAttribute('aria-hidden', 'true');
    }

    close(options = {}) {
        const { skipHistorySync = false } = options;
        if (!this.root || this.root.classList.contains('profile-modal--hidden')) return;
        if (!skipHistorySync) {
            this.restoreNonModalUrl();
        }
        this.currentModalUrl = null;
        App.modalCtrl ? App.modalCtrl.close('profile-modal') : this.hideOnly();
    }

    requestClose() {
        if (this.hasUnsavedChanges()) {
            App.warn?.open({
                title: 'Осторожно!',
                description: 'У вас остались несохранённые изменения. После закрытия окна они будут сброшены. Хотите продолжить?',
                confirmLabel: 'Закрыть окно',
                cancelLabel: 'Назад',
                onConfirm: () => this.close()
            });
            return;
        }
        this.close();
    }

    restrictNicknameInput() {
        if (!this.nicknameInput) return;
        const normalized = this.nicknameInput.value.replace(/[^a-zа-яё0-9_]/gi, '').slice(0, 12);
        if (normalized !== this.nicknameInput.value) {
            this.nicknameInput.value = normalized;
        }
    }

    handleFile(file) {
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
            this.showToast('Поддерживаются только PNG, JPEG и GIF изображения');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            this.showToast('Изображение не должно превышать 20МБ');
            return;
        }
        this.selectedFile = file;
        this.setPreview(URL.createObjectURL(file), true);
    }

    setPreview(src, isObjectUrl = false) {
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = isObjectUrl ? src : null;

        if (src) {
            this.preview.src = src;
            this.preview.classList.remove('profile-modal__avatar-preview--hidden');
            this.placeholder.classList.add('profile-modal__avatar-placeholder--hidden');
            this.dropzone.classList.add('profile-modal__avatar-dropzone--filled');
            return;
        }

        this.preview.removeAttribute('src');
        this.preview.classList.add('profile-modal__avatar-preview--hidden');
        this.placeholder.classList.remove('profile-modal__avatar-placeholder--hidden');
        this.dropzone.classList.remove('profile-modal__avatar-dropzone--filled');
    }

    updateCounter() {
        if (this.counter) this.counter.textContent = `${(this.aboutInput?.value || '').length}/256`;
    }

    getSnapshot() {
        return JSON.stringify({
            username: this.nicknameInput?.value || '',
            bio: this.aboutInput?.value || '',
            file: this.selectedFile ? `${this.selectedFile.name}:${this.selectedFile.size}` : ''
        });
    }

    captureSnapshot() {
        this.snapshot = this.getSnapshot();
    }

    hasUnsavedChanges() {
        return this.getSnapshot() !== this.snapshot;
    }

    blockOverlayClose() {
        if (!this.panel) return;
        clearTimeout(this.closeBlockedTimer);
        this.panel.classList.remove('profile-modal__panel--close-blocked');
        void this.panel.offsetWidth;
        this.panel.classList.add('profile-modal__panel--close-blocked');
        this.closeBlockedTimer = setTimeout(() => {
            this.panel?.classList.remove('profile-modal__panel--close-blocked');
            this.closeBlockedTimer = null;
        }, 1000);
    }

    showToast(message) {
        document.dispatchEvent(new CustomEvent('app:toast', { detail: { message } }));
    }

    async save() {
        const username = (this.nicknameInput?.value || '').trim();
        if (!/^[A-Za-zА-Яа-яЁё0-9_]{3,12}$/u.test(username)) {
            this.showToast('Только латиница, кириллица, цифры и "_"');
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('bio', (this.aboutInput?.value || '').trim());
        if (this.selectedFile) formData.append('avatar', this.selectedFile);

        this.saveButton.disabled = true;
        try {
            const response = await fetch('/profile/update', { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.error || 'Не удалось сохранить профиль');

            this.root.dataset.currentUsername = payload.username || username;
            this.root.dataset.currentBio = payload.bio || '';
            this.root.dataset.currentAvatar = payload.avatar || '';
            this.root.dataset.usernameChangedAt = payload.username_changed_at || '';
            this.captureSnapshot();
            this.close();
            this.showToast('Профиль обновлён');

            const nextUrl = `/profile?username=${encodeURIComponent(payload.username || username)}`;
            if (App.nav?.navigate) {
                App.nav.navigate(nextUrl, { pushUrl: false, force: true });
                return;
            }
            window.location.assign(nextUrl);
        } catch (error) {
            this.showToast(error?.message || 'Ошибка сохранения профиля');
        } finally {
            this.saveButton.disabled = false;
        }
    }

    destroy() {
        if (this.openHandler) document.removeEventListener('profile-modal:open', this.openHandler);
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        clearTimeout(this.closeBlockedTimer);
    }
}

App.register('profile_modal.js', ProfileModalComponent);
