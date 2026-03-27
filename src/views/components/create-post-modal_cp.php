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

            <textarea
                class="create-post-modal__input create-post-modal__input--description"
                name="post-description"
                placeholder="Добавьте описание к посту"
                autocomplete="off"
            ></textarea>

            <div class="create-post-modal__collection" data-component="post-collection">
                <input
                    class="create-post-modal__input create-post-modal__input--collection"
                    type="text"
                    value="Добавить в коллекцию"
                    readonly
                    data-component="post-collection-trigger"
                    aria-expanded="false"
                >

                <ul class="create-post-modal__collection-list" data-component="post-collection-list">
                    <li><button type="button" data-component="post-collection-item">Коллекция 1</button></li>
                    <li><button type="button" data-component="post-collection-item">Коллекция 2</button></li>
                    <li><button type="button" data-component="post-collection-item">Коллекция 3</button></li>
                    <li><button type="button" data-component="post-collection-item">Коллекция 4</button></li>
                    <li><button type="button" data-component="post-collection-item">Коллекция 5</button></li>
                </ul>
            </div>

            <input
                class="create-post-modal__input create-post-modal__input--tags"
                type="text"
                name="post-tags"
                placeholder="Добавить теги"
                autocomplete="off"
            >

            <div class="create-post-modal__actions">
                <button class="create-post-modal__button create-post-modal__button--submit" type="button">Создать пост</button>
                <button class="create-post-modal__button create-post-modal__button--cancel" type="button" data-component="create-post-cancel">Отмена</button>
            </div>
        </div>
    </div>
</div>
