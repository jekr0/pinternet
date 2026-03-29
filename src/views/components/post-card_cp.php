<?php
    $postId = isset($postId) ? (int) $postId : 0;
    $postImagePath = isset($postImagePath) && is_string($postImagePath) && $postImagePath !== ''
        ? $postImagePath
        : 'uploads/avatars/avatar.jpg';
?>

<article class="post-card" data-component="post-card" data-post-id="<?php echo $postId; ?>" aria-label="Модуль поста">
    <img
        class="post-card__image"
        src="<?php echo htmlspecialchars($postImagePath, ENT_QUOTES, 'UTF-8'); ?>"
        alt="Изображение поста"
        loading="lazy"
    >
</article>
