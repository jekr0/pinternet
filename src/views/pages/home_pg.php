<?php
    require_once __DIR__ . '/../../config/database_conf.php';

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $viewerId = (int) ($_SESSION['user_id'] ?? 0);

    $postId = 0;
    $postImagePath = 'uploads/avatars/avatar.jpg';
    $authorUsername = 'unknown';
    $isLiked = false;
    $isBookmarked = false;
    $isOwner = false;

    if ($viewerId > 0) {
        $stmt = $pdo->prepare('
            SELECT p.id, p.image_path, u.username,
                   (pl.id IS NOT NULL) AS is_liked,
                   (sp.id IS NOT NULL) AS is_bookmarked,
                   (p.user_id = ?) AS is_owner
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            LEFT JOIN Post_Likes pl ON pl.post_id = p.id AND pl.user_id = ?
            LEFT JOIN Saved_Posts sp ON sp.post_id = p.id AND sp.user_id = ?
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT 1
        ');
        $stmt->execute([$viewerId, $viewerId, $viewerId]);
    } else {
        $stmt = $pdo->query('
            SELECT p.id, p.image_path, u.username
            FROM Posts p
            INNER JOIN Users u ON u.id = p.user_id
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT 1
        ');
    }

    $latestPost = $stmt->fetch();

    if (is_array($latestPost)) {
        $postId = (int) ($latestPost['id'] ?? 0);
        $dbImagePath = (string) ($latestPost['image_path'] ?? '');
        $authorUsername = (string) ($latestPost['username'] ?? 'unknown');
        $isLiked = !empty($latestPost['is_liked']);
        $isBookmarked = !empty($latestPost['is_bookmarked']);
        $isOwner = !empty($latestPost['is_owner']);

        if ($dbImagePath !== '') {
            $postImagePath = $dbImagePath;
        }
    }
?>

<section class="home-post-card-wrapper" aria-label="Превью модуля поста">
    <?php include '../src/views/components/post-card_cp.php'; ?>
</section>

<button class="create-post-open-button" data-component="create-post-open" aria-label="Создать пост">+</button>
