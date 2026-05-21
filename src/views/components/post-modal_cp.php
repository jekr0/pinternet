<div class="post-modal post-modal--hidden" id="post-modal" aria-hidden="true">
    <div class="post-modal__panel" role="dialog" aria-modal="true" aria-labelledby="post-modal-title">
        <p class="post-modal__alert post-modal__alert--hidden" data-component="create-post-alert"></p>
      
        <!-- Левая колонка: область загрузки -->
        <div class="post-modal__upload-column">
            <div
                class="post-modal__upload-dropzone"
                data-component="post-upload-dropzone"
                role="button"
                tabindex="0"
                aria-label="Загрузить изображение"
            >
                <input
                    class="post-modal__file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    data-component="post-upload-input"
                >

                <div class="post-modal__upload-placeholder" data-component="post-upload-placeholder">
                    <span class="post-modal__upload-icon" data-component="post-upload-icon" data-svg-src="assets/images/icons/upload.svg" aria-hidden="true"></span>
                    <span class="post-modal__upload-label">Загрузить*</span>
                </div>

                <img class="post-modal__preview post-modal__preview--hidden" data-component="post-upload-preview" alt="Предпросмотр изображения">
                <div class="post-modal__upload-lock" aria-hidden="true">
                    <span class="post-modal__upload-lock-icon" data-component="post-upload-lock-icon" data-svg-src="assets/images/icons/lock.svg"></span>
                </div>
            </div>

            <p class="post-modal__hint">*Поддерживаются только PNG, JPEG и GIF изображения до 20МБ.</p>
        </div>

        <!-- Правая колонка: метаданные поста -->
        <div class="post-modal__meta-column">
            <h2 class="post-modal__title" id="post-modal-title" data-component="post-modal-title">Новый пост</h2>

            <!-- Описание -->
            <div class="post-modal__description-wrap">
                <textarea
                    class="post-modal__input post-modal__input--description"
                    name="post-description"
                    placeholder="Добавить описание к посту"
                    autocomplete="off"
                    maxlength="512"
                    data-component="post-description"
                ></textarea>
                <span
                    data-component="post-description-counter"
                    class="post-modal__description-counter"
                >0/512</span>
            </div>

            <!-- Коллекция и список выбора -->
            <div class="post-modal__collection" data-component="post-collection">
                <input
                    class="post-modal__input post-modal__input--collection"
                    type="text"
                    placeholder="Добавить в коллекцию (&quot;Профиль&quot; по умолчанию)"
                    data-component="post-collection-trigger"
                    maxlength="32"
                    readonly
                    tabindex="-1"
                >

                <ul class="post-modal__collection-list" data-component="post-collection-list">
                    <li><button type="button" data-component="post-collection-item" data-is-profile="1">Профиль</button></li>
                </ul>
            </div>

            <!-- Теги -->
            <div class="post-modal__tags-wrap">
                <div class="post-modal__tags-input-row">
                    <input
                        class="post-modal__input post-modal__input--tags"
                        type="text"
                        name="post-tags"
                        placeholder="Добавить теги"
                        autocomplete="off"
                        maxlength="20"
                        data-component="post-tags-input"
                    >
                    <button type="button" class="post-modal__tags-add-button" data-component="post-tags-add-button">+</button>
                    <ul class="post-modal__tags-suggest-list post-modal__tags-suggest-list--hidden" data-component="post-tags-suggest-list"></ul>
                </div>
                <div class="post-modal__tags-list" data-component="post-tags-list" aria-live="polite"></div>
            </div>

            <div class="post-modal__confirm post-modal__confirm--hidden" data-component="post-modal-confirm" aria-hidden="true">
                <h3 class="post-modal__confirm-title" data-component="post-modal-confirm-title"></h3>
                <p class="post-modal__confirm-message" data-component="post-modal-confirm-message"></p>
                <div class="post-modal__confirm-actions">
                    <button class="post-modal__button post-modal__button--cancel" type="button" data-component="post-modal-confirm-cancel">Назад</button>
                    <button class="post-modal__button post-modal__button--submit" type="button" data-component="post-modal-confirm-submit">Закрыть окно</button>
                </div>
            </div>

            <!-- Действия -->
            <div class="post-modal__actions">
                <button class="post-modal__button post-modal__button--delete" type="button" data-component="post-edit-delete">Удалить пост</button>
                <button class="post-modal__button post-modal__button--submit" type="button" data-component="create-post-submit">Создать пост</button>
                <button class="post-modal__button post-modal__button--cancel" type="button" data-component="create-post-cancel">Назад</button>
            </div>
        </div>
    </div>

</div>

<div class="create-post-success-toast create-post-success-toast--hidden" data-component="create-post-success-toast" aria-live="polite"></div>
