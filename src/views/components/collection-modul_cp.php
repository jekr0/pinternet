<div class="collection-modal collection-modal--hidden" id="collection-modal" aria-hidden="true">
  <div class="collection-modal__panel" role="dialog" aria-modal="true" aria-labelledby="collection-modal-title">
    <div class="collection-modal__left-column">
      <ul class="collection-modal__collection-list" data-component="collection-modal-list"></ul>
    </div>

    <div class="collection-modal__right-column">
      <h2 class="collection-modal__title" id="collection-modal-title">Управление коллекциями</h2>

      <div class="collection-modal__name-wrap">
        <input class="collection-modal__input collection-modal__input--name ui-input" type="text" placeholder="Название коллекции" maxlength="32" data-component="collection-modal-name">
      </div>

      <div class="collection-modal__tags-wrap">
        <div class="collection-modal__tags-input-row" data-component="collection-modal-tags-input-row">
          <input class="collection-modal__input collection-modal__input--tags ui-input" type="text" placeholder="Добавить теги" maxlength="20" data-component="collection-modal-tags-input">
          <button type="button" class="collection-modal__tags-add-button" data-component="collection-modal-tags-add-button">+</button>
          <ul class="collection-modal__tags-suggest-list collection-modal__tags-suggest-list--hidden" data-component="collection-modal-tags-suggest-list"></ul>
        </div>
        <div class="collection-modal__tags-list" data-component="collection-modal-tags-list" aria-live="polite"></div>
      </div>

      <div class="collection-modal__actions">
        <button class="collection-modal__button collection-modal__button--delete" type="button" data-component="collection-modal-delete">Удалить коллекцию</button>
        <button class="collection-modal__button collection-modal__button--submit" type="button">Создать коллекцию</button>
        <button class="collection-modal__button collection-modal__button--cancel" type="button" data-component="collection-modal-cancel">Назад</button>
      </div>
    </div>
  </div>
</div>
