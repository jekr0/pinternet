<div class="create-post-modal create-post-modal--hidden" id="create-post-modal" aria-hidden="true">
    <div class="create-post-modal__panel" role="dialog" aria-modal="true" aria-labelledby="create-post-modal-title">
        <p class="create-post-modal__alert create-post-modal__alert--hidden" data-component="create-post-alert"></p>
      
        <!-- Левая колонка: область загрузки -->
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

            <p class="create-post-modal__hint">Поддерживаются только PNG, JPEG и GIF изображения до 20МБ.</p>
        </div>

        <!-- Правая колонка: метаданные поста -->
        <div class="create-post-modal__meta-column">
            <h2 class="create-post-modal__title" id="create-post-modal-title">Новый пост</h2>

            <!-- Описание -->
            <div style="position:absolute; top:100px; right:60px; width:630px; height:150px;">
                <textarea
                    class="create-post-modal__input create-post-modal__input--description"
                    name="post-description"
                    placeholder="Добавьте описание к посту"
                    autocomplete="off"
                    maxlength="255"
                    data-component="post-description"
                    style="position:relative; top:0; right:0; width:100%; height:100%;"
                ></textarea>
                <span
                    data-component="post-description-counter"
                    style="position:absolute; right:5px; bottom:5px; font-size:14px; color:#bbb; pointer-events:none;"
                >0/255</span>
            </div>

            <!-- Коллекция и список выбора -->
            <div class="create-post-modal__collection" data-component="post-collection">
                <input
                    class="create-post-modal__input create-post-modal__input--collection"
                    type="text"
                    placeholder="Добавить в коллекцию (&quot;Профиль&quot; по умолчанию)"
                    data-component="post-collection-trigger"
                    maxlength="32"
                >

                <ul class="create-post-modal__collection-list" data-component="post-collection-list">
                    <li><button type="button" data-component="post-collection-item" data-is-profile="1">Профиль</button></li>
                </ul>
            </div>

            <!-- Теги -->
            <div class="create-post-modal__tags-wrap">
                <div class="create-post-modal__tags-input-row">
                    <input
                        class="create-post-modal__input create-post-modal__input--tags"
                        type="text"
                        name="post-tags"
                        placeholder="Добавить теги"
                        autocomplete="off"
                        maxlength="16"
                        data-component="post-tags-input"
                    >
                    <button type="button" class="create-post-modal__tags-add-button" data-component="post-tags-add-button">+</button>
                    <ul class="create-post-modal__tags-suggest-list create-post-modal__tags-suggest-list--hidden" data-component="post-tags-suggest-list"></ul>
                </div>
                <div class="create-post-modal__tags-list" data-component="post-tags-list" aria-live="polite"></div>
            </div>

            <!-- Действия -->
            <div class="create-post-modal__actions">
                <button class="create-post-modal__button create-post-modal__button--cancel" type="button" data-component="create-post-cancel">Назад</button>
                <button class="create-post-modal__button create-post-modal__button--submit" type="button" data-component="create-post-submit">Создать пост</button>
            </div>
        </div>
    </div>

    <div class="create-post-modal__confirm create-post-modal__confirm--hidden" data-component="create-collection-confirm" aria-hidden="true">
        <div class="create-post-modal__confirm-panel" role="dialog" aria-modal="true">
            <p class="create-post-modal__confirm-text" data-component="create-collection-confirm-text"></p>
            <div class="create-post-modal__confirm-actions">
                <button class="create-post-modal__button create-post-modal__button--cancel" type="button" data-component="create-collection-confirm-no">Назад</button>
                <button class="create-post-modal__button create-post-modal__button--submit" type="button" data-component="create-collection-confirm-yes">Создать</button>
            </div>
        </div>
    </div>
</div>
