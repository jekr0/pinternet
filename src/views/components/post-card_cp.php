<?php
    $postId = isset($postId) ? (int) $postId : 0;
    $postImagePath = isset($postImagePath) && is_string($postImagePath) && $postImagePath !== ''
        ? $postImagePath
        : 'uploads/avatars/avatar.jpg';
    $isLiked = !empty($isLiked);
    $isBookmarked = !empty($isBookmarked);
?>

<article
    class="post-card"
    data-component="post-card"
    data-post-id="<?php echo $postId; ?>"
    data-liked="<?php echo $isLiked ? '1' : '0'; ?>"
    data-bookmarked="<?php echo $isBookmarked ? '1' : '0'; ?>"
    aria-label="Модуль поста"
>
    <img
        class="post-card__image"
        src="<?php echo htmlspecialchars($postImagePath, ENT_QUOTES, 'UTF-8'); ?>"
        alt="Изображение поста"
        loading="lazy"
    >

    <div class="post-card__actions" aria-label="Действия с постом">
        <button class="post-card__action-button" type="button" data-action="like" aria-label="Лайк">
            <span class="post-card__icon" data-icon="heart" data-svg-src="assets/images/icons/heart.svg"></span>
        </button>

        <button class="post-card__action-button" type="button" data-action="bookmark" aria-label="Сохранить">
            <span class="post-card__icon" data-icon="bookmark" data-svg-src="assets/images/icons/bookmark.svg"></span>
        </button>

        <button class="post-card__action-button" type="button" data-action="share" aria-label="Поделиться">
            <span class="post-card__icon" data-icon="share" data-svg-src="assets/images/icons/edit.svg"></span>
        </button>
    </div>
</article>
