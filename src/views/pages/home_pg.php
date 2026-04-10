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
            SELECT p.id, p.image_path, u.username,
                   (pl.id IS NOT NULL) AS is_liked,
                   EXISTS(
                       SELECT 1
                       FROM Saved_Posts sp
                       WHERE sp.post_id = p.id AND sp.user_id = ?
                   ) AS is_bookmarked,
                   (p.user_id = ?) AS is_owner
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            LEFT JOIN Post_Likes pl ON pl.post_id = p.id AND pl.user_id = ?
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute([$viewerId, $viewerId, $viewerId]);
    } else {
        $stmt = $pdo->query('
            SELECT p.id, p.image_path, u.username,
                   0 AS is_liked,
                   0 AS is_bookmarked,
                   0 AS is_owner
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            ORDER BY p.created_at DESC, p.id DESC
        ');
    }

    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $selectedPost = null;
    if ($selectedPostId > 0) {
        foreach ($posts as $row) {
            if ((int) ($row['id'] ?? 0) !== $selectedPostId) {
                continue;
            }

            $selectedPost = $row;
            break;
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
            if ($selectedImagePath === '') {
                $selectedImagePath = 'uploads/avatars/avatar.jpg';
            }
        ?>
        <section class="post-full is-open" data-component="post-full" aria-hidden="false">
            <div
                class="post-full__frame"
                style="--post-full-bg-image: url('<?php echo htmlspecialchars($selectedImagePath, ENT_QUOTES, 'UTF-8'); ?>');"
            >
                <img
                    class="post-full__image"
                    src="<?php echo htmlspecialchars($selectedImagePath, ENT_QUOTES, 'UTF-8'); ?>"
                    alt="Изображение поста"
                >
            </div>
        </section>
    <?php endif; ?>

    <?php foreach ($posts as $row): ?>
        <?php
            $postId = (int) ($row['id'] ?? 0);
            $dbImagePath = (string) ($row['image_path'] ?? '');
            $postImagePath = $dbImagePath !== '' ? $dbImagePath : 'uploads/avatars/avatar.jpg';
            $authorUsername = (string) ($row['username'] ?? 'unknown');
            $isLiked = !empty($row['is_liked']);
            $isBookmarked = !empty($row['is_bookmarked']);
            $isOwner = !empty($row['is_owner']);
            $isPostFullActive = $selectedPostId > 0 && $postId === $selectedPostId;

            include '../src/views/components/post-card_cp.php';
        ?>
    <?php endforeach; ?>
</section>
