<?php
    require_once __DIR__ . '/../../config/database_conf.php';

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $viewerId = (int) ($_SESSION['user_id'] ?? 0);
    $posts = [];

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
?>

<section class="home-post-masonry" data-component="masonry-feed" aria-label="Лента постов">
    <?php foreach ($posts as $row): ?>
        <?php
            $postId = (int) ($row['id'] ?? 0);
            $dbImagePath = (string) ($row['image_path'] ?? '');
            $postImagePath = $dbImagePath !== '' ? $dbImagePath : 'uploads/avatars/avatar.jpg';
            $authorUsername = (string) ($row['username'] ?? 'unknown');
            $isLiked = !empty($row['is_liked']);
            $isBookmarked = !empty($row['is_bookmarked']);
            $isOwner = !empty($row['is_owner']);

            include '../src/views/components/post-card_cp.php';
        ?>
    <?php endforeach; ?>
</section>
