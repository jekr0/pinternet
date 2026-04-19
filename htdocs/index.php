<?php
// Отображение ошибок
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Получаем запрошенный URI без параметров
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$path = rtrim($path, '/');

// Удаляем начальный /htdocs, если он есть (для случая, когда сайт расположен в подпапке)
$base = '/htdocs';
if (strpos($path, $base) === 0) {
    $path = substr($path, strlen($base));
    if ($path === '') {
        $path = '/';
    }
}

// Определяем, какая страница нужна
$selectedPostId = 0;
if (preg_match('#^/post/(\d+)$#', $path, $matches)) {
    $selectedPostId = (int) $matches[1];
    $path = '/post/:id';
}

switch ($path) {
    case '':
    case '/':
    case '/home':
    case '/post/:id':
        $page = 'home_pg.php';
        $pageTitle = 'Главная';
        $PHP = [
            'header_lo.php',
            'footer_lo.php'
        ];
        $CSS = [
            'header_lo.css',
            'profile-container_cp.css',
            'dropdown-profile_cp.css',
            'create-post-modal_cp.css',
            'post-card_cp.css',
            'post-full_cp.css',
            'dropdown-collections_cp.css',
            'create-collection_cp.css',
            'toast-stack_cp.css',
            'home_pg.css',
            'footer_lo.css'
        ];
        $JS = [
            'overlay_manager.js',
            'toast_stack.js',
            'profile_button.js',
            'dropdown_profile.js',
            'create_post_modal.js',
            'post_card.js',
            'post_full.js',
            'dropdown_collections.js',
            'create_collection.js',
            'masonry_feed.js',
            'adaptive_text.js'
        ];
        break;

        case '/profile':
        $page = 'profile_pg.php';
        $pageTitle = 'Профиль';
        $PHP = [];
        $CSS = [];
        $JS  = [];
        break;

        case '/login':
        $page = 'login_pg.php';
        $pageTitle = 'Вход';
        $PHP = [];
        $CSS = ['auth_pg.css'];
        $JS  = ['password_toggle.js', 'auth_form_guard.js'];
        break;

        case '/logout':
        require_once '../src/controllers/logout_ctrl.php';
        exit;

        case '/auth':
        require_once '../src/controllers/auth_ctrl.php';
        exit;

        case '/posts/create':
        case '/posts/list':
        case '/posts/like':
        case '/posts/bookmark':
        case '/boards/list':
        case '/boards/create':
        case '/hashtags/suggest':
        case '/posts/report':
        case '/posts/comment':
        require_once '../src/controllers/post_ctrl.php';
        exit;

        case '/posts/bookmark/boards':
        case '/posts/bookmark/board-toggle':
        case '/posts/bookmark/board-create':
        case '/posts/bookmark/clear':
        require_once '../src/controllers/dropdown_collections_ctrl.php';
        exit;

        case '/registration':
        $page = 'registration_pg.php';
        $pageTitle = 'Регистрация';
        $PHP = [];
        $CSS = ['auth_pg.css'];
        $JS  = ['password_toggle.js', 'auth_form_guard.js', 'auto-god.js'];
        break;

    default:
        // 404 Not Found
        http_response_code(404);
        $page = '404_pg.php';
        $pageTitle = 'Страница не найдена';
        $PHP = [
            'header_lo.php',
            'footer_lo.php'
        ];
        $CSS = [
            'header_lo.css',
            'profile-container_cp.css',
            'dropdown-profile_cp.css',
            'create-post-modal_cp.css',
            'toast-stack_cp.css',
            'footer_lo.css'
        ];
        $JS = [
            'toast_stack.js',
            'profile_button.js',
            'dropdown_profile.js',
            'create_post_modal.js',
            'post_card.js',
            'adaptive_text.js'
        ];
        break;
}

// Начинаем вывод HTML
?><!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grinderest / <?php echo $pageTitle; ?></title>
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="icon" type="image/svg+xml" href="/assets/images/icons/planet.svg">

    <?php
    // Подключаем CSS-файлы из подпапок layouts/ и components/
    foreach ($CSS as $cssFile):
        // Определяем подпапку по суффиксу файла
        if (str_ends_with($cssFile, '_lo.css')) {
            $subfolder = 'layouts';
        } elseif (str_ends_with($cssFile, '_cp.css')) {
            $subfolder = 'components';
        } elseif (str_ends_with($cssFile, '_pg.css')) {
            $subfolder = 'pages';
        } else {
            $subfolder = 'components';
        }
    ?>
        <link rel="stylesheet" href="/assets/css/<?php echo $subfolder; ?>/<?php echo $cssFile; ?>">
    <?php endforeach; ?>

    <!-- Передаём список JS-модулей для инициализации (синхронно) -->
    <script>
        window.activeModules = <?php echo json_encode($JS); ?>;
    </script>

    <!-- Основной скрипт приложения (определяет App) -->
    <script src="/assets/js/main.js" defer></script>

    <!-- Модули (регистрируются в App.registry) -->
    <?php foreach ($JS as $jsFile): ?>
        <script src="/assets/js/modules/<?php echo $jsFile; ?>" defer></script>
    <?php endforeach; ?>
</head>

<body>
    <!-- Подключаем layout-файлы (шапка, подвал) -->
    <?php foreach ($PHP as $layout): ?>
        <?php include '../src/views/layouts/' . $layout; ?>
    <?php endforeach; ?>

    <!-- Основной контент страницы -->
    <main class="main-content">
        <?php include '../src/views/pages/' . $page; ?>
    </main>
</body>

</html>
