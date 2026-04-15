<?php
    $postId = isset($postId) ? (int) $postId : 0;
    $postImagePath = isset($postImagePath) && is_string($postImagePath) && $postImagePath !== ''
        ? $postImagePath
        : '/uploads/avatars/avatar.jpg';
    $authorUsername = isset($authorUsername) && is_string($authorUsername) && $authorUsername !== ''
        ? $authorUsername
        : 'unknown';
    $isLiked = !empty($isLiked);
    $isBookmarked = !empty($isBookmarked);
    $isOwner = !empty($isOwner);
    $isPostFullActive = !empty($isPostFullActive);
    $postPublishedLabel = isset($postPublishedLabel) && is_string($postPublishedLabel)
        ? trim($postPublishedLabel)
        : '';
?>

<article
    class="post-card<?php echo $isPostFullActive ? ' post-card--post-full-active' : ''; ?>"
    data-component="post-card"
    data-post-id="<?php echo $postId; ?>"
    data-liked="<?php echo $isLiked ? '1' : '0'; ?>"
    data-bookmarked="<?php echo $isBookmarked ? '1' : '0'; ?>"
    data-owner="<?php echo $isOwner ? '1' : '0'; ?>"
    aria-label="Модуль поста"
>
    <a
        class="post-card__author-badge"
        href="/profile?username=<?php echo urlencode(ltrim($authorUsername, '@')); ?>"
        aria-label="Профиль автора @<?php echo htmlspecialchars(ltrim($authorUsername, '@'), ENT_QUOTES, 'UTF-8'); ?>"
    >
        <span class="post-card__author-username">@<?php echo htmlspecialchars(ltrim($authorUsername, '@'), ENT_QUOTES, 'UTF-8'); ?></span>
        <?php if ($postPublishedLabel !== ''): ?>
            <span class="post-card__author-meta-separator" aria-hidden="true"></span>
            <span class="post-card__author-published-at"><?php echo htmlspecialchars($postPublishedLabel, ENT_QUOTES, 'UTF-8'); ?></span>
        <?php endif; ?>
    </a>

    <img
        class="post-card__image"
        src="<?php echo htmlspecialchars($postImagePath, ENT_QUOTES, 'UTF-8'); ?>"
        alt="Изображение поста"
        loading="lazy"
    >

    <div class="post-card__actions" aria-label="Действия с постом">
        <button class="post-card__action-button" type="button" data-action="like" aria-label="Лайк">
            <span
                class="post-card__icon"
                data-icon="heart"
                data-svg-src="<?php echo $isLiked ? '/assets/images/icons/U-heart-fill.svg' : '/assets/images/icons/S-heart.svg'; ?>"
            ></span>
        </button>

        <button
            class="post-card__action-button"
            type="button"
            data-action="bookmark"
            aria-label="Сохранить"
        >
            <span
                class="post-card__icon"
                data-icon="bookmark"
                data-svg-src="<?php echo $isBookmarked ? '/assets/images/icons/S-bookmark-plus.svg' : ($isOwner ? '/assets/images/icons/U-bookmark-fill.svg' : '/assets/images/icons/S-bookmark.svg'); ?>"
            ></span>
        </button>

        <button class="post-card__action-button" type="button" data-action="share" aria-label="Поделиться">
            <span class="post-card__icon" data-icon="share" data-svg-src="/assets/images/icons/S-share.svg"></span>
        </button>
    </div>
</article>
