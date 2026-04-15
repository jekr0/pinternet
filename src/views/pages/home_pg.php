<?php
    require_once __DIR__ . '/../../config/database_conf.php';

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $viewerId = (int) ($_SESSION['user_id'] ?? 0);
    $viewerUsername = '';
    $viewerAvatar = '/uploads/avatars/avatar.jpg';
    $viewerHasAvatar = false;
    $viewerProfileUrl = '/profile';
    $posts = [];
    $selectedPostId = isset($selectedPostId) ? (int) $selectedPostId : 0;

    if ($viewerId > 0) {
        $stmt = $pdo->prepare('
            SELECT p.id, p.image_path, p.description, p.created_at, u.username, u.avatar AS user_avatar,
                   (pl.id IS NOT NULL) AS is_liked,
                   EXISTS(
                       SELECT 1
                       FROM Saved_Posts sp
                       INNER JOIN Boards b ON b.id = sp.board_id AND b.user_id = sp.user_id
                       WHERE sp.post_id = p.id AND sp.user_id = ?
                   ) AS has_any_bookmark,
                   EXISTS(
                       SELECT 1
                       FROM Saved_Posts sp
                       INNER JOIN Boards b ON b.id = sp.board_id AND b.user_id = sp.user_id
                       WHERE sp.post_id = p.id
                         AND sp.user_id = ?
                         AND LOWER(b.name) <> LOWER(?)
                   ) AS has_non_profile_bookmark,
                   (SELECT COUNT(*) FROM Post_Likes pl_all WHERE pl_all.post_id = p.id) AS likes_count,
                   (p.user_id = ?) AS is_owner
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            LEFT JOIN Post_Likes pl ON pl.post_id = p.id AND pl.user_id = ?
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute([$viewerId, $viewerId, 'Profile', $viewerId, $viewerId]);
    } else {
        $stmt = $pdo->query('
            SELECT p.id, p.image_path, p.description, p.created_at, u.username, u.avatar AS user_avatar,
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

    $pluralizeRu = static function (int $value, string $one, string $few, string $many): string {
        $mod100 = $value % 100;
        if ($mod100 >= 11 && $mod100 <= 14) {
            return $many;
        }

        $mod10 = $value % 10;
        if ($mod10 === 1) {
            return $one;
        }
        if ($mod10 >= 2 && $mod10 <= 4) {
            return $few;
        }

        return $many;
    };

    $formatPostPublishedLabel = static function (?string $createdAtRaw) use ($pluralizeRu): string {
        if (!is_string($createdAtRaw) || trim($createdAtRaw) === '') {
            return '';
        }

        try {
            $createdAt = new DateTimeImmutable($createdAtRaw);
            $now = new DateTimeImmutable('now');
        } catch (Throwable) {
            return '';
        }

        $diffSeconds = max(0, $now->getTimestamp() - $createdAt->getTimestamp());
        if ($diffSeconds <= 59) {
            return max(1, $diffSeconds) . ' сек. назад';
        }

        $minutes = (int) floor($diffSeconds / 60);
        if ($minutes <= 59) {
            return $minutes . ' мин. назад';
        }

        $hours = (int) floor($diffSeconds / 3600);
        if ($hours <= 23) {
            return $hours . ' ' . $pluralizeRu($hours, 'час', 'часа', 'часов') . ' назад';
        }

        $days = (int) floor($diffSeconds / 86400);
        if ($days <= 3) {
            return $days . ' ' . $pluralizeRu($days, 'день', 'дня', 'дней') . ' назад';
        }

        return $createdAt->format('d.m.Y');
    };

    $selectedPost = null;
    $selectedPostHashtags = [];
    $selectedPostCommentsCount = 0;
    $selectedPostComments = [];

    $normalizeTag = static function (string $tag): string {
        return mb_strtolower(trim($tag));
    };

    $metaTags = [
        '2d', '3d', 'art', 'fanart', 'gif', 'anime', 'meme', 'ai', 'sketch', 'digital',
        'illustration', 'drawing', 'pixelart', 'render', 'animation', 'edit', 'photo', 'aesthetic', 'design', 'conceptart'
    ];
    $metaTagSet = [];
    foreach ($metaTags as $metaTag) {
        $metaTagSet[$normalizeTag($metaTag)] = true;
    }

    $fetchHashtagsByPostIds = static function (PDO $pdo, array $postIds) use ($normalizeTag): array {
        if (empty($postIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($postIds), '?'));
        $tagsStmt = $pdo->prepare("
            SELECT ph.post_id, h.name
            FROM Post_Hashtags ph
            INNER JOIN Hashtags h ON h.id = ph.hashtag_id
            WHERE ph.post_id IN ($placeholders)
        ");
        $tagsStmt->execute(array_values($postIds));

        $tagsByPost = [];
        foreach ($tagsStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $tagRow) {
            $postId = (int) ($tagRow['post_id'] ?? 0);
            $tagName = (string) ($tagRow['name'] ?? '');
            $normalizedTag = $normalizeTag($tagName);
            if ($postId <= 0 || $normalizedTag === '') {
                continue;
            }
            if (!isset($tagsByPost[$postId])) {
                $tagsByPost[$postId] = [];
            }
            $tagsByPost[$postId][$normalizedTag] = true;
        }

        return $tagsByPost;
    };

    $fetchRelatedHashtags = static function (PDO $pdo, array $seedTags, array $excludedTags = []) use ($normalizeTag): array {
        if (empty($seedTags)) {
            return [];
        }

        $seedPlaceholders = implode(',', array_fill(0, count($seedTags), '?'));
        $params = array_values($seedTags);

        $excludedSql = '';
        if (!empty($excludedTags)) {
            $excludedPlaceholders = implode(',', array_fill(0, count($excludedTags), '?'));
            $excludedSql = " AND LOWER(related_h.name) NOT IN ($excludedPlaceholders)";
            $params = array_merge($params, array_values($excludedTags));
        }

        $relatedStmt = $pdo->prepare("
            SELECT related_h.name AS tag_name, COUNT(*) AS weight
            FROM Post_Hashtags base_ph
            INNER JOIN Hashtags base_h ON base_h.id = base_ph.hashtag_id
            INNER JOIN Post_Hashtags related_ph ON related_ph.post_id = base_ph.post_id
            INNER JOIN Hashtags related_h ON related_h.id = related_ph.hashtag_id
            WHERE LOWER(base_h.name) IN ($seedPlaceholders)
              AND LOWER(related_h.name) <> LOWER(base_h.name)
              $excludedSql
            GROUP BY related_h.name
            ORDER BY weight DESC, related_h.name ASC
            LIMIT 30
        ");
        $relatedStmt->execute($params);

        $relatedTags = [];
        foreach ($relatedStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $relatedRow) {
            $name = $normalizeTag((string) ($relatedRow['tag_name'] ?? ''));
            $weight = (int) ($relatedRow['weight'] ?? 0);
            if ($name === '' || $weight <= 0) {
                continue;
            }
            $relatedTags[$name] = $weight;
        }

        return $relatedTags;
    };

    $countPostComments = static function (PDO $pdo, int $postId): int {
        if ($postId <= 0) {
            return 0;
        }

        try {
            $tableExistsStmt = $pdo->query("SHOW TABLES LIKE 'Comments'");
            if ($tableExistsStmt->fetchColumn() === false) {
                return 0;
            }

            $countStmt = $pdo->prepare('
                SELECT COUNT(*)
                FROM Comments
                WHERE post_id = ?
                  AND is_deleted = 0
                  AND parent_comment_id IS NULL
            ');
            $countStmt->execute([$postId]);

            return (int) $countStmt->fetchColumn();
        } catch (Throwable) {
            return 0;
        }
    };

    if ($viewerId > 0) {
        $viewerStmt = $pdo->prepare('SELECT username, avatar FROM Users WHERE id = ? LIMIT 1');
        $viewerStmt->execute([$viewerId]);
        $viewerRow = $viewerStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($viewerRow) {
            $viewerUsername = ltrim((string) ($viewerRow['username'] ?? ''), '@');
            $viewerAvatar = $normalizePublicPath((string) ($viewerRow['avatar'] ?? ''));
            $viewerHasAvatar = $viewerAvatar !== '/uploads/avatars/avatar.jpg';
            $viewerProfileUrl = '/profile?username=' . urlencode($viewerUsername);
        }
    }

    if ($selectedPostId > 0) {
        foreach ($posts as $row) {
            if ((int) ($row['id'] ?? 0) !== $selectedPostId) {
                continue;
            }

            $selectedPost = $row;
            break;
        }

        if ($selectedPost) {
            $selectedPostCommentsCount = $countPostComments($pdo, $selectedPostId);

            if ($selectedPostCommentsCount > 0) {
                $commentsStmt = $pdo->prepare('
                    SELECT pc.content, pc.created_at, u.username, u.avatar,
                           (SELECT COUNT(*) FROM Comment_Likes cl WHERE cl.comment_id = pc.id) AS likes_count
                    FROM Comments pc
                    INNER JOIN Users u ON u.id = pc.user_id
                    WHERE pc.post_id = ?
                      AND pc.is_deleted = 0
                      AND pc.parent_comment_id IS NULL
                    ORDER BY pc.created_at ASC, pc.id ASC
                ');
                $commentsStmt->execute([$selectedPostId]);
                $selectedPostComments = $commentsStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            }

            $hashtagsStmt = $pdo->prepare('
                SELECT h.name
                FROM Hashtags h
                INNER JOIN Post_Hashtags ph ON ph.hashtag_id = h.id
                WHERE ph.post_id = ?
                ORDER BY h.name ASC
            ');
            $hashtagsStmt->execute([$selectedPostId]);
            $selectedPostHashtags = array_values(array_filter(array_map(
                static fn(array $tagRow): string => (string) ($tagRow['name'] ?? ''),
                $hashtagsStmt->fetchAll(PDO::FETCH_ASSOC) ?: []
            )));

            if (!empty($selectedPostHashtags)) {
                $postIds = array_map(static fn(array $row): int => (int) ($row['id'] ?? 0), $posts);
                $postTagMap = $fetchHashtagsByPostIds($pdo, $postIds);

                $normalizedSelectedTags = array_values(array_unique(array_filter(array_map($normalizeTag, $selectedPostHashtags))));

                $seedTags = [];
                foreach ($normalizedSelectedTags as $tagName) {
                    if (isset($metaTagSet[$tagName])) {
                        continue;
                    }
                    $seedTags[$tagName] = true;
                }

                if (empty($seedTags)) {
                    foreach ($normalizedSelectedTags as $tagName) {
                        $seedTags[$tagName] = true;
                    }
                }

                $relatedWeights = [];
                $frontier = array_keys($seedTags);
                $visited = $seedTags;

                for ($depth = 1; $depth <= 2 && !empty($frontier); $depth++) {
                    $relatedBatch = $fetchRelatedHashtags($pdo, $frontier, array_keys($visited));
                    if (empty($relatedBatch)) {
                        break;
                    }

                    $batchCount = 0;
                    foreach ($relatedBatch as $relatedTag => $weight) {
                        if (isset($metaTagSet[$relatedTag])) {
                            continue;
                        }
                        if (isset($visited[$relatedTag])) {
                            continue;
                        }

                        $visited[$relatedTag] = true;
                        $score = $weight / $depth;
                        $relatedWeights[$relatedTag] = ($relatedWeights[$relatedTag] ?? 0.0) + $score;
                        $frontier[] = $relatedTag;
                        $batchCount++;

                        if ($batchCount >= 6) {
                            break;
                        }
                    }

                    $frontier = array_slice($frontier, -6);
                }

                $baseOrder = [];
                foreach ($posts as $idx => $row) {
                    $postId = (int) ($row['id'] ?? 0);
                    if ($postId > 0) {
                        $baseOrder[$postId] = $idx;
                    }
                }

                usort($posts, static function (array $left, array $right) use ($selectedPostId, $seedTags, $relatedWeights, $postTagMap, $baseOrder, $metaTagSet): int {
                    $leftId = (int) ($left['id'] ?? 0);
                    $rightId = (int) ($right['id'] ?? 0);

                    $rankPost = static function (int $postId) use ($selectedPostId, $seedTags, $relatedWeights, $postTagMap, $baseOrder, $metaTagSet): array {
                        if ($postId === $selectedPostId) {
                            return [-1, 0, 0.0, $baseOrder[$postId] ?? PHP_INT_MAX];
                        }

                        $tags = $postTagMap[$postId] ?? [];
                        $overlap = 0;
                        foreach ($seedTags as $seedTag => $_) {
                            if (isset($tags[$seedTag])) {
                                $overlap++;
                            }
                        }

                        $isExact = !empty($seedTags) && $overlap === count($seedTags);
                        $relatedScore = 0.0;
                        if ($overlap === 0 && !empty($tags)) {
                            foreach ($tags as $tagName => $_) {
                                $relatedScore += (float) ($relatedWeights[$tagName] ?? 0.0);
                                if (isset($metaTagSet[$tagName])) {
                                    $relatedScore += 0.15;
                                }
                            }
                        }

                        if ($isExact) {
                            $phase = 0;
                        } elseif ($overlap > 0) {
                            $phase = 1;
                        } elseif ($relatedScore > 0) {
                            $phase = 2;
                        } else {
                            $phase = 3;
                        }

                        return [$phase, -$overlap, -$relatedScore, $baseOrder[$postId] ?? PHP_INT_MAX];
                    };

                    $leftRank = $rankPost($leftId);
                    $rightRank = $rankPost($rightId);

                    foreach ([0, 1, 2, 3] as $index) {
                        if ($leftRank[$index] === $rightRank[$index]) {
                            continue;
                        }
                        return ($leftRank[$index] <=> $rightRank[$index]);
                    }

                    return 0;
                });
            }
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
            $selectedIsOwner = !empty($selectedPost['is_owner']);
            $selectedHasAnyBookmark = !empty($selectedPost['has_any_bookmark']);
            $selectedHasNonProfileBookmark = !empty($selectedPost['has_non_profile_bookmark']);
            $selectedIsBookmarked = $selectedIsOwner ? $selectedHasNonProfileBookmark : $selectedHasAnyBookmark;
            $selectedHeartIcon = $selectedIsLiked ? '/assets/images/icons/U-heart-fill.svg' : '/assets/images/icons/L-heart.svg';
            $selectedBookmarkIcon = $selectedIsBookmarked
                ? '/assets/images/icons/L-bookmark-plus.svg'
                : ($selectedIsOwner ? '/assets/images/icons/U-bookmark-fill.svg' : '/assets/images/icons/L-bookmark.svg');
            $selectedAuthorUsername = ltrim((string) ($selectedPost['username'] ?? 'unknown'), '@');
            $selectedAuthorAvatar = $normalizePublicPath((string) ($selectedPost['user_avatar'] ?? ''));
            $selectedAuthorHasAvatar = $selectedAuthorAvatar !== '/uploads/avatars/avatar.jpg';
            $selectedAuthorProfileUrl = '/profile?username=' . urlencode($selectedAuthorUsername);
            $selectedPostDescription = trim((string) ($selectedPost['description'] ?? ''));
            $selectedPostPublishedLabel = $formatPostPublishedLabel((string) ($selectedPost['created_at'] ?? ''));
            $selectedPostCreatedTimestamp = (int) strtotime((string) ($selectedPost['created_at'] ?? ''));
            $selectedHasComments = $selectedPostCommentsCount > 0;
        ?>
        <section
            class="post-full is-open"
            data-component="post-full"
            data-post-id="<?php echo (int) ($selectedPost['id'] ?? 0); ?>"
            data-liked="<?php echo $selectedIsLiked ? '1' : '0'; ?>"
            data-bookmarked="<?php echo $selectedIsBookmarked ? '1' : '0'; ?>"
            data-owner="<?php echo $selectedIsOwner ? '1' : '0'; ?>"
            data-created-at-ts="<?php echo $selectedPostCreatedTimestamp; ?>"
            data-page-opened-ts="<?php echo time(); ?>"
            data-viewer-username="<?php echo htmlspecialchars($viewerUsername, ENT_QUOTES, 'UTF-8'); ?>"
            data-viewer-avatar-src="<?php echo htmlspecialchars($viewerAvatar, ENT_QUOTES, 'UTF-8'); ?>"
            data-viewer-profile-url="<?php echo htmlspecialchars($viewerProfileUrl, ENT_QUOTES, 'UTF-8'); ?>"
            data-viewer-has-avatar="<?php echo $viewerHasAvatar ? '1' : '0'; ?>"
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
                        <span class="post-full__action-icon" data-svg-src="/assets/images/icons/L-warning.svg" aria-hidden="true"></span>
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
                    <?php if ($selectedPostCreatedTimestamp > 0): ?>
                        <span class="post-full__author-meta-separator" aria-hidden="true"></span>
                        <span class="post-full__author-published-at" data-component="post-full-published-at"><?php echo htmlspecialchars($selectedPostPublishedLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endif; ?>
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
                        <span class="post-full__tag-item">#<?php echo htmlspecialchars($postHashtag, ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <div class="post-full__description-divider" aria-hidden="true"></div>

            <div class="post-full__comments-block">
                <?php if (!$selectedHasComments): ?>
                    <p class="post-full__comments-empty">Комментариев пока нет. Будьте первым!</p>
                <?php endif; ?>
                <div class="post-full__comments-list" data-component="post-full-comments-list">
                    <?php foreach ($selectedPostComments as $commentRow): ?>
                        <?php
                            $commentUsername = ltrim((string) ($commentRow['username'] ?? 'unknown'), '@');
                            $commentProfileUrl = '/profile?username=' . urlencode($commentUsername);
                            $commentAvatar = $normalizePublicPath((string) ($commentRow['avatar'] ?? ''));
                            $commentHasAvatar = $commentAvatar !== '/uploads/avatars/avatar.jpg';
                            $commentPublishedLabel = $formatPostPublishedLabel((string) ($commentRow['created_at'] ?? ''));
                            $commentLikesCount = (int) ($commentRow['likes_count'] ?? 0);
                        ?>
                        <article class="post-full__comment-item">
                            <div class="post-full__comment-side">
                                <a class="post-full__author-avatar post-full__comment-avatar" href="<?php echo htmlspecialchars($commentProfileUrl, ENT_QUOTES, 'UTF-8'); ?>" aria-label="Профиль автора @<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>">
                                    <?php if ($commentHasAvatar): ?>
                                        <img class="post-full__author-avatar-image" src="<?php echo htmlspecialchars($commentAvatar, ENT_QUOTES, 'UTF-8'); ?>" alt="Аватар @<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>">
                                    <?php else: ?>
                                        <img class="post-full__author-avatar-placeholder" src="/assets/images/icons/planet.svg" alt="Профиль" width="28" height="28">
                                    <?php endif; ?>
                                </a>
                                <span class="post-full__comment-rail" aria-hidden="true"></span>
                            </div>
                            <div class="post-full__comment-content">
                                <div class="post-full__comment-meta">
                                    <a class="post-full__comment-username" href="<?php echo htmlspecialchars($commentProfileUrl, ENT_QUOTES, 'UTF-8'); ?>" aria-label="Профиль автора @<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?>">@<?php echo htmlspecialchars($commentUsername, ENT_QUOTES, 'UTF-8'); ?></a>
                                    <span class="post-full__comment-meta-separator" aria-hidden="true"></span>
                                    <span class="post-full__comment-published-at"><?php echo htmlspecialchars($commentPublishedLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                                </div>
                                <p class="post-full__comment-text"><?php echo nl2br(htmlspecialchars((string) ($commentRow['content'] ?? ''), ENT_QUOTES, 'UTF-8')); ?></p>
                                <div class="post-full__comment-actions" aria-label="Действия с комментарием">
                                    <button class="post-full__comment-action-button" type="button" data-action="comment-like" aria-label="Лайк комментария">
                                        <span class="post-full__comment-action-icon" data-svg-src="/assets/images/icons/S-heart.svg" aria-hidden="true"></span>
                                    </button>
                                    <span class="post-full__comment-like-count"><?php echo $commentLikesCount; ?></span>
                                    <button class="post-full__comment-action-button" type="button" data-action="comment-reply" aria-label="Ответить на комментарий">
                                        <span class="post-full__comment-action-icon" data-svg-src="/assets/images/icons/S-comment.svg" aria-hidden="true"></span>
                                    </button>
                                    <button class="post-full__comment-action-button" type="button" data-action="comment-report" aria-label="Пожаловаться на комментарий">
                                        <span class="post-full__comment-action-icon" data-svg-src="/assets/images/icons/S-warning.svg" aria-hidden="true"></span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
                <?php if ($viewerId > 0): ?>
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
    <?php endif; ?>

    <?php foreach ($posts as $row): ?>
        <?php
            $postId = (int) ($row['id'] ?? 0);
            $dbImagePath = (string) ($row['image_path'] ?? '');
            $postImagePath = $normalizePublicPath($dbImagePath);
            $authorUsername = (string) ($row['username'] ?? 'unknown');
            $isLiked = !empty($row['is_liked']);
            $isOwner = !empty($row['is_owner']);
            $hasAnyBookmark = !empty($row['has_any_bookmark']);
            $hasNonProfileBookmark = !empty($row['has_non_profile_bookmark']);
            $isBookmarked = $isOwner ? $hasNonProfileBookmark : $hasAnyBookmark;
            $isPostFullActive = $selectedPostId > 0 && $postId === $selectedPostId;
            include '../src/views/components/post-card_cp.php';
        ?>
    <?php endforeach; ?>
</section>
