<div class="collection-modul collection-modul--hidden" id="collection-modul" aria-hidden="true">
  <div class="collection-modul__panel" role="dialog" aria-modal="true" aria-labelledby="collection-modul-title">
    <div class="collection-modul__left">
      <h2 class="collection-modul__title" id="collection-modul-title">Управление коллекциями</h2>
      <input class="collection-modul__input" type="text" placeholder="Название коллекции" maxlength="32">

      <div class="collection-modul__tags-wrap">
        <div class="collection-modul__tags-input-row">
          <input class="collection-modul__input collection-modul__input--tags" type="text" placeholder="Добавить теги" maxlength="20">
          <button type="button" class="collection-modul__tags-add-button">+</button>
          <ul class="collection-modul__tags-suggest-list"></ul>
        </div>
        <div class="collection-modul__tags-list" aria-live="polite"></div>
      </div>

      <div class="collection-modul__actions">
        <button class="collection-modul__button collection-modul__button--submit" type="button">Сохранить</button>
        <button class="collection-modul__button collection-modul__button--cancel" type="button" data-component="collection-modul-cancel">Назад</button>
      </div>
    </div>

    <div class="collection-modul__right">
      <ul class="collection-modul__collection-list" data-component="collection-modul-list"></ul>
    </div>
  </div>
</div>
