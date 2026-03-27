<div class="create-post-modal create-post-modal--hidden" id="create-post-modal" aria-hidden="true">
    <div class="create-post-modal__panel" role="dialog" aria-modal="true" aria-labelledby="create-post-modal-title">
        <div class="create-post-modal__upload-column">
            <div
                class="create-post-modal__upload-dropzone"
                data-component="post-upload-dropzone"
                role="button"
                tabindex="0"
                aria-label="Загрузить изображение"
            >
                <input
                    class="create-post-modal__file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    data-component="post-upload-input"
                >

                <div class="create-post-modal__upload-placeholder" data-component="post-upload-placeholder">
                    <img src="assets/images/icons/upload.svg" alt="Upload" class="create-post-modal__upload-icon">
                    <span class="create-post-modal__upload-label">Загрузить*</span>
                </div>

                <img class="create-post-modal__preview create-post-modal__preview--hidden" data-component="post-upload-preview" alt="Предпросмотр изображения">
            </div>

            <p class="create-post-modal__hint">Поддерживаются PNG, JPEG и GIF до 20 МБ.</p>
        </div>

        <div class="create-post-modal__meta-column">
            <h2 class="create-post-modal__title" id="create-post-modal-title">Новый пост</h2>
            <input
                class="create-post-modal__caption-input"
                type="text"
                name="post-title"
                placeholder="Введите заголовок поста"
                autocomplete="off"
            >
        </div>
    </div>
</div>
