<?php
    require_once __DIR__ . '/../../config/database_conf.php';

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $viewerId = (int) ($_SESSION['user_id'] ?? 0);
    $posts = [];
    $selectedPostId = isset($selectedPostId) ? (int) $selectedPostId : 0;

    if ($viewerId > 0) {
        $stmt = $pdo->prepare('
            SELECT p.id, p.image_path, p.description, u.username, u.avatar AS user_avatar,
                   (pl.id IS NOT NULL) AS is_liked,
                   EXISTS(
                       SELECT 1
                       FROM Saved_Posts sp
                       INNER JOIN Boards b ON b.id = sp.board_id AND b.user_id = sp.user_id
                       WHERE sp.post_id = p.id AND sp.user_id = ?
                   ) AS is_bookmarked,
                   (SELECT COUNT(*) FROM Post_Likes pl_all WHERE pl_all.post_id = p.id) AS likes_count,
                   (p.user_id = ?) AS is_owner
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            LEFT JOIN Post_Likes pl ON pl.post_id = p.id AND pl.user_id = ?
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute([$viewerId, $viewerId, $viewerId]);
    } else {
        $stmt = $pdo->query('
            SELECT p.id, p.image_path, p.description, u.username, u.avatar AS user_avatar,
                   0 AS is_liked,
                   0 AS is_bookmarked,
                   (SELECT COUNT(*) FROM Post_Likes pl_all WHERE pl_all.post_id = p.id) AS likes_count,
                   0 AS is_owner
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            ORDER BY p.created_at DESC, p.id DESC
        ');
    }

    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $normalizePublicPath = static function (string $path): string {
        if ($path === '') {
            return '/uploads/avatars/avatar.jpg';
        }

        if (preg_match('#^(https?:)?//#', $path) === 1) {
            return $path;
        }

        return '/' . ltrim($path, '/');
    };

    $selectedPost = null;
    $selectedPostHashtags = [];
    if ($selectedPostId > 0) {
        foreach ($posts as $row) {
            if ((int) ($row['id'] ?? 0) !== $selectedPostId) {
                continue;
            }

            $selectedPost = $row;
            break;
        }

        if ($selectedPost) {
            $hashtagsStmt = $pdo->prepare('
                SELECT h.name
                FROM Hashtags h
                INNER JOIN Post_Hashtags ph ON ph.hashtag_id = h.id
                WHERE ph.post_id = ?
                ORDER BY h.name ASC
            ');
            $hashtagsStmt->execute([$selectedPostId]);
            $selectedPostHashtags = array_map(
                static fn(array $tagRow): string => (string) ($tagRow['name'] ?? ''),
                $hashtagsStmt->fetchAll(PDO::FETCH_ASSOC) ?: []
            );
        }
    }
?>

<section
    class="home-post-masonry"
    data-component="masonry-feed"
    data-selected-post-id="<?php echo $selectedPostId > 0 ? $selectedPostId : ''; ?>"
    aria-label="Лента постов"
>
    <?php if ($selectedPost): ?>
        <?php
            $selectedImagePath = (string) ($selectedPost['image_path'] ?? '');
            $selectedImagePath = $normalizePublicPath($selectedImagePath);
            $selectedIsLiked = !empty($selectedPost['is_liked']);
            $selectedIsBookmarked = !empty($selectedPost['is_bookmarked']);
            $selectedIsOwner = !empty($selectedPost['is_owner']);
            $selectedHeartIcon = $selectedIsLiked ? '/assets/images/icons/U-heart-fill.svg' : '/assets/images/icons/L-heart.svg';
            $selectedBookmarkIcon = $selectedIsBookmarked
                ? '/assets/images/icons/L-bookmark-plus.svg'
                : ($selectedIsOwner ? '/assets/images/icons/U-bookmark-fill.svg' : '/assets/images/icons/L-bookmark.svg');
            $selectedAuthorUsername = ltrim((string) ($selectedPost['username'] ?? 'unknown'), '@');
            $selectedAuthorAvatar = $normalizePublicPath((string) ($selectedPost['user_avatar'] ?? ''));
            $selectedAuthorHasAvatar = $selectedAuthorAvatar !== '/uploads/avatars/avatar.jpg';
            $selectedAuthorProfileUrl = '/profile?username=' . urlencode($selectedAuthorUsername);
            $selectedPostDescription = trim((string) ($selectedPost['description'] ?? ''));
        ?>
        <section
            class="post-full is-open"
            data-component="post-full"
            data-post-id="<?php echo (int) ($selectedPost['id'] ?? 0); ?>"
            data-liked="<?php echo $selectedIsLiked ? '1' : '0'; ?>"
            data-bookmarked="<?php echo $selectedIsBookmarked ? '1' : '0'; ?>"
            data-owner="<?php echo $selectedIsOwner ? '1' : '0'; ?>"
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

                <div class="post-full__actions" aria-label="Действия с изображением">
                    <button class="post-full__action-button" type="button" data-action="warning" aria-label="Пожаловаться">
                        <span class="post-full__action-icon" data-svg-src="/assets/images/icons/warning.svg" aria-hidden="true"></span>
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
                        data-placeholder-size="28"
                        aria-label="Профиль автора @<?php echo htmlspecialchars($selectedAuthorUsername, ENT_QUOTES, 'UTF-8'); ?>"
                    ></button>
                    <a
                        class="post-full__author-username"
                        href="<?php echo htmlspecialchars($selectedAuthorProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
                        aria-label="Профиль автора @<?php echo htmlspecialchars($selectedAuthorUsername, ENT_QUOTES, 'UTF-8'); ?>"
                    >@<?php echo htmlspecialchars($selectedAuthorUsername, ENT_QUOTES, 'UTF-8'); ?></a>
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
                <div class="post-full__description">
                    <?php echo nl2br(htmlspecialchars($selectedPostDescription, ENT_QUOTES, 'UTF-8')); ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($selectedPostHashtags)): ?>
                <div class="post-full__hashtags" aria-label="Хештеги поста">
                    <?php foreach ($selectedPostHashtags as $postHashtag): ?>
                        <span class="post-full__tag-item">#<?php echo htmlspecialchars($postHashtag, ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <?php if ($selectedPostDescription !== '' || !empty($selectedPostHashtags)): ?>
                <div class="post-full__description-divider" aria-hidden="true"></div>
            <?php endif; ?>
        </section>
    <?php endif; ?>

    <?php foreach ($posts as $row): ?>
        <?php
            $postId = (int) ($row['id'] ?? 0);
            $dbImagePath = (string) ($row['image_path'] ?? '');
            $postImagePath = $normalizePublicPath($dbImagePath);
            $authorUsername = (string) ($row['username'] ?? 'unknown');
            $isLiked = !empty($row['is_liked']);
            $isBookmarked = !empty($row['is_bookmarked']);
            $isOwner = !empty($row['is_owner']);
            $isPostFullActive = $selectedPostId > 0 && $postId === $selectedPostId;

            include '../src/views/components/post-card_cp.php';
        ?>
    <?php endforeach; ?>
</section>
