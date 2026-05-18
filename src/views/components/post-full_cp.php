<?php
$selectedPost = isset($selectedPost) && is_array($selectedPost) ? $selectedPost : null;
if (!$selectedPost) {
    return;
}
?>
<section
    class="post-full is-open"
    data-component="post-full"
    data-post-id="<?php echo (int) ($selectedPost['id'] ?? 0); ?>"
    data-liked="<?php echo $selectedIsLiked ? '1' : '0'; ?>"
    data-bookmarked="<?php echo $selectedIsBookmarked ? '1' : '0'; ?>"
    data-owner="<?php echo $selectedIsOwner ? '1' : '0'; ?>"
    data-created-at-ts="<?php echo $selectedPostCreatedTimestamp; ?>"
    data-server-now-ts="<?php echo time(); ?>"
    data-viewer-id="<?php echo (int) $viewerId; ?>"
    data-viewer-username="<?php echo htmlspecialchars($viewerUsername, ENT_QUOTES, 'UTF-8'); ?>"
    data-viewer-avatar-src="<?php echo htmlspecialchars($viewerAvatar, ENT_QUOTES, 'UTF-8'); ?>"
    data-viewer-profile-url="<?php echo htmlspecialchars($viewerProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
    data-viewer-has-avatar="<?php echo $viewerHasAvatar ? '1' : '0'; ?>"
    data-post-image-src="<?php echo htmlspecialchars($selectedImagePath, ENT_QUOTES, 'UTF-8'); ?>"
    aria-hidden="false"
>
    <div
        class="post-full__frame"
        style="--post-full-bg-image: url('<?php echo htmlspecialchars($selectedImagePath, ENT_QUOTES, 'UTF-8'); ?>');"
    >
        <img
            class="post-full__image"
            src="<?php echo htmlspecialchars($selectedImagePath, ENT_QUOTES, 'UTF-8'); ?>"
            alt="Изображение поста"
        >

        <button class="post-full__action-button post-full__action-button--back" type="button" data-action="back" aria-label="Назад">
            <span class="post-full__action-icon" data-svg-src="/assets/images/icons/L-arrow.svg" aria-hidden="true"></span>
        </button>

        <div class="post-full__actions" aria-label="Действия с изображением">
            <button class="post-full__action-button" type="button" data-action="<?php echo $selectedIsOwner ? 'edit' : 'warning'; ?>" aria-label="<?php echo $selectedIsOwner ? 'Редактировать пост' : 'Пожаловаться'; ?>">
                <span class="post-full__action-icon" data-svg-src="<?php echo $selectedIsOwner ? '/assets/images/icons/L-edit.svg' : '/assets/images/icons/L-warning.svg'; ?>" aria-hidden="true"></span>
            </button>
            <button class="post-full__action-button" type="button" data-action="maximize" aria-label="Развернуть">
                <span class="post-full__action-icon" data-svg-src="/assets/images/icons/maximize.svg" aria-hidden="true"></span>
            </button>
        </div>
    </div>

    <div class="post-full__meta-row">
        <div class="post-full__author post-full__author--outside" aria-label="Автор поста">
            <button
                class="post-full__author-avatar"
                type="button"
                data-component="profile_button"
                data-profile-img="<?php echo $selectedAuthorHasAvatar ? '1' : '0'; ?>"
                data-avatar-src="<?php echo htmlspecialchars($selectedAuthorAvatar, ENT_QUOTES, 'UTF-8'); ?>"
                data-profile-url="<?php echo htmlspecialchars($selectedAuthorProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
                data-avatar-class="post-full__author-avatar-image"
                data-placeholder-class="post-full__author-avatar-placeholder"
                data-placeholder-size="24"
                aria-label="Профиль автора @<?php echo htmlspecialchars($selectedAuthorUsername, ENT_QUOTES, 'UTF-8'); ?>"
            ></button>
            <div class="post-full__author-meta">
                <a
                    class="post-full__author-username"
                    href="<?php echo htmlspecialchars($selectedAuthorProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
                    aria-label="Профиль автора @<?php echo htmlspecialchars($selectedAuthorUsername, ENT_QUOTES, 'UTF-8'); ?>"
                >@<?php echo htmlspecialchars($selectedAuthorUsername, ENT_QUOTES, 'UTF-8'); ?></a>
                <?php if ($selectedPostCreatedTimestamp > 0): ?>
                    <span class="post-full__author-meta-separator" aria-hidden="true"></span>
                    <span
                        class="post-full__author-published-at"
                        data-component="post-full-published-at"
                        data-created-at-ts="<?php echo $selectedPostCreatedTimestamp; ?>"
                    ><?php echo htmlspecialchars($selectedPostPublishedLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                <?php endif; ?>
            </div>
        </div>

        <div class="post-full__bottom-actions" aria-label="Базовые действия с постом">
            <button
                class="post-full__meta-button post-full__meta-button--like<?php echo $selectedIsLiked ? ' is-active' : ''; ?>"
                type="button"
                data-action="like"
                aria-label="Лайк"
            >
                <span class="post-full__meta-icon" data-icon="heart" data-svg-src="<?php echo $selectedHeartIcon; ?>" aria-hidden="true"></span>
                <span class="post-full__likes-count" data-component="post-full-like-count"><?php echo (int) ($selectedPost['likes_count'] ?? 0); ?></span>
            </button>
            <button
                class="post-full__meta-button<?php echo $selectedIsBookmarked ? ' is-active' : ''; ?>"
                type="button"
                data-action="bookmark"
                aria-label="Сохранить"
            >
                <span class="post-full__meta-icon" data-icon="bookmark" data-svg-src="<?php echo $selectedBookmarkIcon; ?>" aria-hidden="true"></span>
            </button>
            <button class="post-full__meta-button" type="button" data-action="share" aria-label="Поделиться">
                <span class="post-full__meta-icon" data-icon="share" data-svg-src="/assets/images/icons/L-share.svg" aria-hidden="true"></span>
            </button>
        </div>
    </div>

    <?php if ($selectedPostDescription !== ''): ?>
        <div class="post-full__description is-collapsed" data-component="post-full-description">
            <?php echo nl2br(htmlspecialchars($selectedPostDescription, ENT_QUOTES, 'UTF-8')); ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($selectedPostHashtags)): ?>
        <div class="post-full__hashtags" aria-label="Хештеги поста">
            <?php foreach ($selectedPostHashtags as $postHashtag): ?>
                <span class="post-full__tag-item"><span class="post-full__tag-label">#<?php echo htmlspecialchars($postHashtag, ENT_QUOTES, 'UTF-8'); ?></span></span>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <div class="post-full__description-divider" data-component="post-full-description-divider" aria-hidden="true"></div>

    <div class="post-full__comments-block">
        <?php if (!$selectedHasComments): ?>
            <p class="post-full__comments-empty">Комментариев пока нет. Будьте первым!</p>
        <?php endif; ?>
        <div class="post-full__comments-list" data-component="post-full-comments-list">
            <?php foreach ($selectedPostCommentThreads as $threadRow): ?>
                <?php
                    $rootComment = $threadRow['root'] ?? [];
                    $rootId = (int) ($rootComment['id'] ?? 0);
                    $threadChildren = $threadRow['children'] ?? [];
                    $renderCommentItem = null;
                    $renderCommentItem = static function (array $commentRow, bool $isReply = false, array $childrenRows = []) use (&$renderCommentItem, $normalizePublicPath, $formatPostPublishedLabel): void {
                        $commentUsername = ltrim((string) ($commentRow['username'] ?? 'unknown'), '@');
                        $commentProfileUrl = '/profile?username=' . urlencode($commentUsername);
                        $commentAvatar = $normalizePublicPath((string) ($commentRow['avatar'] ?? ''));
                        $commentHasAvatar = $commentAvatar !== '/uploads/avatars/avatar.jpg';
                        $commentCreatedTimestamp = (int) ($commentRow['created_at_ts'] ?? 0);
                        $commentPublishedLabel = $formatPostPublishedLabel($commentCreatedTimestamp);
                        $commentLikesCount = (int) ($commentRow['likes_count'] ?? 0);
                        $commentId = (int) ($commentRow['id'] ?? 0);
                        $commentRootId = (int) ($commentRow['root_comment_id'] ?? $commentId);
                        $commentParentId = (int) ($commentRow['parent_comment_id'] ?? 0);
                        $commentParentUsername = ltrim((string) ($commentRow['parent_username'] ?? ''), '@');
                        $commentIsLikedByViewer = !empty($commentRow['is_liked_by_viewer']);
                        $commentIsOwner = !empty($commentRow['is_owner']);
                        ?>
                        <article
                            class="post-full__comment-item<?php echo $isReply ? ' post-full__comment-item--reply' : ''; ?>"
                            data-comment-id="<?php echo $commentId; ?>"
                            data-root-comment-id="<?php echo $commentRootId; ?>"
                            data-comment-username="<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>"
                        >
                            <div class="post-full__comment-side">
                                <a class="post-full__author-avatar post-full__comment-avatar" href="<?php echo htmlspecialchars($commentProfileUrl, ENT_QUOTES, 'UTF-8'); ?>" aria-label="Профиль автора @<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>">
                                    <?php if ($commentHasAvatar): ?>
                                        <img class="post-full__author-avatar-image" src="<?php echo htmlspecialchars($commentAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="Аватар @<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>">
                                    <?php else: ?>
                                        <img class="post-full__author-avatar-placeholder" src="/assets/images/icons/planet.svg" alt="Профиль" width="24" height="24">
                                    <?php endif; ?>
                                </a>
                                <span class="post-full__comment-rail" aria-hidden="true"></span>
                            </div>
                            <div class="post-full__comment-content">
                                <div class="post-full__comment-meta">
                                    <div class="post-full__comment-meta-main">
                                        <a class="post-full__comment-username" href="<?php echo htmlspecialchars($commentProfileUrl, ENT_QUOTES, 'UTF-8'); ?>" aria-label="Профиль автора @<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>">@<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?></a>
                                        <?php if ($isReply): ?>
                                            <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                                            <span class="post-full__comment-published-at" data-created-at-ts="<?php echo $commentCreatedTimestamp; ?>"><?php echo htmlspecialchars($commentPublishedLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                                            <?php if ($commentParentId > 0 && $commentParentUsername !== ''): ?>
                                                <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                                                <span class="post-full__comment-reply-label">Ответ <span class="post-full__comment-reply-target">@<?php echo htmlspecialchars($commentParentUsername, ENT_QUOTES, 'UTF-8'); ?></span></span>
                                            <?php endif; ?>
                                        <?php else: ?>
                                            <?php if ($commentParentId > 0 && $commentParentUsername !== ''): ?>
                                                <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                                                <span class="post-full__comment-reply-label">Ответ <span class="post-full__comment-reply-target">@<?php echo htmlspecialchars($commentParentUsername, ENT_QUOTES, 'UTF-8'); ?></span></span>
                                            <?php endif; ?>
                                            <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                                            <span class="post-full__comment-published-at" data-created-at-ts="<?php echo $commentCreatedTimestamp; ?>"><?php echo htmlspecialchars($commentPublishedLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                                        <?php endif; ?>
                                        <span class="post-full__comment-meta-separator" data-component="post-full-comment-replies-separator" aria-hidden="true" style="display:none;"></span>
                                        <span class="post-full__comment-reply-label" data-component="post-full-comment-replies-meta" style="display:none;"></span>
                                    </div>
                                </div>
                                <p class="post-full__comment-text"><?php echo nl2br(htmlspecialchars((string) ($commentRow['content'] ?? ''), ENT_QUOTES, 'UTF-8')); ?></p>
                                <div class="post-full__comment-actions" aria-label="Действия с комментарием">
                                    <button class="post-full__comment-action-button post-full__comment-action-button--like<?php echo $commentIsLikedByViewer ? ' is-active' : ''; ?>" type="button" data-action="comment-like" aria-label="Лайк комментария">
                                        <span class="post-full__comment-action-icon" data-svg-src="<?php echo $commentIsLikedByViewer ? '/assets/images/icons/U-heart-fill.svg' : '/assets/images/icons/S-heart.svg'; ?>" aria-hidden="true"></span>
                                        <span class="post-full__comment-like-count<?php echo $commentIsLikedByViewer ? ' is-active' : ''; ?>"><?php echo $commentLikesCount; ?></span>
                                    </button>
                                    <button class="post-full__comment-action-button post-full__comment-action-button--reply" type="button" data-action="comment-reply" aria-label="Ответить на комментарий">
                                        Ответить
                                    </button>
                                    <button class="post-full__comment-action-button" type="button" data-action="comment-report" aria-label="<?php echo $commentIsOwner ? 'Редактировать комментарий' : 'Пожаловаться на комментарий'; ?>">
                                        <span class="post-full__comment-action-icon" data-svg-src="<?php echo $commentIsOwner ? '/assets/images/icons/S-edit.svg' : '/assets/images/icons/S-warning.svg'; ?>" aria-hidden="true"></span>
                                    </button>
                                </div>
                                <?php if (!$isReply && !empty($childrenRows)): ?>
                                    <div class="post-full__comment-children">
                                        <?php foreach ($childrenRows as $childComment): ?>
                                            <?php $renderCommentItem($childComment, true, []); ?>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </article>
                    <?php };
                ?>
                <?php if ($rootId > 0): ?>
                    <div class="post-full__comment-thread" data-root-comment-id="<?php echo $rootId; ?>">
                        <?php $renderCommentItem($rootComment, false, $threadChildren); ?>
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
        <?php if ($viewerId > 0 && count($selectedPostCommentThreads) > 3): ?>
            <div class="post-full__comments-toggle-divider" data-component="post-full-comments-toggle-divider">
                <span class="post-full__comments-toggle-line" aria-hidden="true"></span>
                <button class="post-full__comments-toggle-button" type="button" data-action="comments-toggle"></button>
                <span class="post-full__comments-toggle-line" aria-hidden="true"></span>
            </div>
        <?php endif; ?>
        <?php if ($viewerId > 0): ?>
            <div class="post-full__comment-reply-state" data-component="post-full-reply-state" aria-live="polite">
                <button class="post-full__comment-reply-cancel" type="button" data-action="reply-cancel" aria-label="Отменить ответ">×</button>
                <span class="post-full__comment-reply-text">
                    Ответ пользователю <span class="post-full__comment-reply-nickname" data-component="post-full-reply-nickname"></span>
                </span>
            </div>
            <div class="post-full__comment-input-wrap">
                <textarea
                    class="post-full__comment-input"
                    data-component="post-full-comment-input"
                    placeholder="Оставить комментарий"
                    maxlength="256"
                    aria-label="Оставить комментарий"
                ></textarea>
                <span class="post-full__comment-counter" data-component="post-full-comment-counter">0/256</span>
            </div>
        <?php endif; ?>
    </div>
</section>
