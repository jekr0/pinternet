<?php
// Отображение ошибок
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Сессия должна стартовать до любого вывода (иначе предупреждение headers already sent)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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


$redirectToCanonical = static function (string $to): void {
    header('Location: ' . $to, true, 302);
    exit;
};





// Нормализация trailing slash для канонического поведения URL.
if ($path !== '/' && $path !== '' && str_ends_with($path, '/')) {
    $path = rtrim($path, '/');
    $redirectToCanonical($path === '' ? '/' : $path);
}

// Этап 1 (routing prep): канонизация URL и алиасы совместимости.
if ($path === '/home') {
    $redirectToCanonical('/');
}

if ($path === '/login') {
    $redirectToCanonical('/auth/login');
}

if ($path === '/registration') {
    $redirectToCanonical('/auth/registration');
}

if ($path === '/sign_up') {
    $redirectToCanonical('/auth/login');
}

$postEditMatches = [];
if (preg_match('#^/post/(\d+)/edit$#', $path, $postEditMatches)) {
    $redirectToCanonical('/post/' . ((int) $postEditMatches[1]) . '?modal=edit');
}

if ($path === '/post/create') {
    $redirectToCanonical('/?modal=post-create');
}

if ($path === '/collections-editing') {
    $redirectToCanonical('/?modal=collections-editing');
}

if ($path === '/profile-editing') {
    $redirectToCanonical('/profile?modal=editing');
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
    case '/post/:id':
        $page = 'home_pg.php';
        $pageTitle = 'Главная';
        $PHP = [
            'header_lo.php',
            'footer_lo.php'
        ];
        $CSS = [
            'header_lo.css',
            'blur_lo.css',
            'dropdown-search_cp.css',
            'profile-container_cp.css',
            'dropdown-profile_cp.css',
            'post-modal_cp.css',
            'post-card_cp.css',
            'post-full_cp.css',
            'dropdown-collections_cp.css',
            'collection-modul_cp.css',
            'warn-modal_cp.css',
            'toast-stack_cp.css',
            'home_pg.css',
            'footer_lo.css'
        ];
        $JS = [
            'overlay_manager.js',
            'modal_ctrl.js',
            'warn_modal.js',
            'toast_stack.js',
            'profile_button.js',
            'dropdown_profile.js',
            'dropdown_search.js',
            'post_modal.js',
            'post_card.js',
            'post_full.js',
            'dropdown_collections.js',
            'collection_modul.js',
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

        case '/auth/login':
        $_SESSION['auth_mode'] = 'login';
        $page = 'sign_up_pg.php';
        $pageTitle = 'Авторизация';
        $PHP = [];
        $CSS = ['warn-modal_cp.css',
            'toast-stack_cp.css', 'auth_pg.css'];
        $JS  = ['warn_modal.js',
            'toast_stack.js', 'password_toggle.js', 'auth_form_guard.js', 'auto-god.js'];
        break;

        case '/auth/registration':
        $_SESSION['auth_mode'] = 'registration';
        $page = 'sign_up_pg.php';
        $pageTitle = 'Авторизация';
        $PHP = [];
        $CSS = ['warn-modal_cp.css',
            'toast-stack_cp.css', 'auth_pg.css'];
        $JS  = ['warn_modal.js',
            'toast_stack.js', 'password_toggle.js', 'auth_form_guard.js', 'auto-god.js'];
        break;

        case '/logout':
        require_once '../src/controllers/logout_ctrl.php';
        exit;

        case '/auth':
        require_once '../src/controllers/auth_ctrl.php';
        exit;

        case '/search/history':
        case '/search/suggest':
        require_once '../src/controllers/search_ctrl.php';
        exit;

        case '/posts/create':
        case '/posts/update':
        case '/posts/delete':
        case '/posts/list':
        case '/posts/like':
        case '/posts/bookmark':
        case '/posts/bookmark/collections':
        case '/posts/bookmark/collection-toggle':
        case '/posts/bookmark/collection-create':
        case '/posts/bookmark/clear':
        case '/collections/list':
        case '/collections/create':
        case '/collections/update':
        case '/collections/delete':
        case '/collections/tags':
        case '/hashtags/suggest':
        case '/posts/report':
        case '/posts/comment':
        case '/comments/like':
        case '/comments/report':
        case '/comments/update':
        case '/comments/delete':
        require_once '../src/controllers/post_ctrl.php';
        exit;

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
            'blur_lo.css',
            'dropdown-search_cp.css',
            'profile-container_cp.css',
            'dropdown-profile_cp.css',
            'post-modal_cp.css',
            'warn-modal_cp.css',
            'toast-stack_cp.css',
            'footer_lo.css'
        ];
        $JS = [
            'warn_modal.js',
            'toast_stack.js',
            'profile_button.js',
            'dropdown_profile.js',
            'dropdown_search.js',
            'post_modal.js',
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
