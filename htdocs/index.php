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
    $redirectToCanonical('/auth/register');
}

if ($path === '/sign_up') {
    $redirectToCanonical('/auth/login');
}

if (preg_match('#^/post/(\d+)$#', $path, $matches)) {
    $redirectToCanonical('/post?id=' . urlencode((string) $matches[1]));
}

if (preg_match('#^/post/(\d+)/edit$#', $path, $matches)) {
    $redirectToCanonical('/post?id=' . urlencode((string) $matches[1]) . '/edit');
}

if ($path === '/collections-editing') {
    $redirectToCanonical('/collections');
}

// Этап 2 (partial rendering): определяем HTMX-запросы для возврата фрагментов.
$isHtmxRequest = isset($_SERVER['HTTP_HX_REQUEST']) && $_SERVER['HTTP_HX_REQUEST'] === 'true';

// Определяем, какая страница нужна
$selectedPostId = 0;
$selectedPostEditId = 0;
$postIdQueryValue = isset($_GET['id']) ? (string) $_GET['id'] : '';
if ($path === '/post' && preg_match('#^(\d+)(?:/edit)?$#', $postIdQueryValue, $matches)) {
    $selectedPostId = (int) $matches[1];
    if (str_ends_with($postIdQueryValue, '/edit')) {
        $selectedPostEditId = $selectedPostId;
    }
}

switch ($path) {
    case '':
    case '/':
    case '/post':
    case '/post/create':
    case '/collections':
        $page = 'home_pg.php';
        $pageTitle = match (true) {
            $path === '/post/create' => 'Создание поста',
            $selectedPostEditId > 0 => 'Пост ' . $selectedPostEditId . ' / Редактирование',
            $selectedPostId > 0 => 'Пост ' . $selectedPostId,
            $path === '/collections' => 'Коллекции',
            default => 'Главная',
        };
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
            'collection-modal_cp.css',
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
            'footer_lo.js',
            'post_modal.js',
            'post_card.js',
            'post_full.js',
            'dropdown_collections.js',
            'collection_modal.js',
            'masonry_feed.js',
            'adaptive_text.js'
        ];
        break;

        case '/profile':
        case '/profile-editing':
        $page = 'profile_pg.php';
        $profileTitleUsername = trim(ltrim((string) ($_GET['username'] ?? ''), '@'));
        $pageTitle = $profileTitleUsername !== '' ? '@' . $profileTitleUsername : 'Профиль';
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
            'profile-full_cp.css',
            'post-modal_cp.css',
            'warn-modal_cp.css',
            'toast-stack_cp.css',
            'footer_lo.css'
        ];
        $JS  = [
            'overlay_manager.js',
            'modal_ctrl.js',
            'warn_modal.js',
            'toast_stack.js',
            'profile_button.js',
            'dropdown_profile.js',
            'dropdown_search.js',
            'footer_lo.js',
            'post_modal.js',
            'collection_modal.js',
            'profile_full.js',
            'adaptive_text.js'
        ];
        break;

        case '/auth/login':
        $_SESSION['auth_mode'] = 'login';
        $page = 'auth-full_cp.php';
        $pageTitle = 'Вход';
        $PHP = [];
        $CSS = [
            'toast-stack_cp.css',
            'auth-full_cp.css'
        ];
        $JS  = [
            'toast_stack.js',
            'password_toggle.js',
            'auth_form_guard.js',
            'auto-god.js'
        ];
        break;

        case '/auth/register':
        case '/auth/registration':
        $_SESSION['auth_mode'] = 'registration';
        $page = 'auth-full_cp.php';
        $pageTitle = 'Регистрация';
        $PHP = [];
        $CSS = [
            'toast-stack_cp.css',
            'auth-full_cp.css'
        ];
        $JS  = [
            'toast_stack.js',
            'password_toggle.js',
            'auth_form_guard.js',
            'auto-god.js'
        ];
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

        case '/profile/follow':
        case '/profile/unfollow':
        case '/profile/report':
        case '/profile/notifications':
        case '/profile/block':
        case '/profile/friends':
        case '/profile/messages/list':
        case '/profile/messages/send':
        case '/profile/messages/chats':
        case '/profile/notifications/list':
        case '/profile/notifications/read':
        case '/profile/footer-counts':
        require_once '../src/controllers/profile_ctrl.php';
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
            'footer_lo.js',
            'post_modal.js',
            'post_card.js',
            'collection_modal.js',
            'adaptive_text.js'
        ];
        break;
}

$APP_CSS = [
    'header_lo.css',
    'blur_lo.css',
    'dropdown-search_cp.css',
    'profile-container_cp.css',
    'dropdown-profile_cp.css',
    'profile-full_cp.css',
    'post-modal_cp.css',
    'post-card_cp.css',
    'post-full_cp.css',
    'dropdown-collections_cp.css',
    'collection-modal_cp.css',
    'warn-modal_cp.css',
    'toast-stack_cp.css',
    'home_pg.css',
    'footer_lo.css',
    'auth-full_cp.css'
];
$APP_JS = [
    'overlay_manager.js',
    'modal_ctrl.js',
    'warn_modal.js',
    'toast_stack.js',
    'profile_button.js',
    'dropdown_profile.js',
    'dropdown_search.js',
    'footer_lo.js',
    'post_modal.js',
    'post_card.js',
    'post_full.js',
    'profile_full.js',
    'dropdown_collections.js',
    'collection_modal.js',
    'masonry_feed.js',
    'adaptive_text.js',
    'password_toggle.js',
    'auth_form_guard.js',
    'auto-god.js'
];
$CSS_TO_LOAD = array_values(array_unique(array_merge($APP_CSS, $CSS)));
$JS_TO_LOAD = array_values(array_unique(array_merge($APP_JS, $JS)));

// Начинаем вывод HTML
if ($isHtmxRequest) {
    ?>
    <main id="app-main" class="main-content" data-render-mode="partial" data-active-modules='<?php echo htmlspecialchars(json_encode($JS), ENT_QUOTES, 'UTF-8'); ?>'>
        <?php include (str_ends_with($page, '_cp.php') ? '../src/views/components/' : '../src/views/pages/') . $page; ?>
    </main>
    <?php
    exit;
}

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
    foreach ($CSS_TO_LOAD as $cssFile):
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

    <!-- HTMX для partial navigation -->
    <script src="https://unpkg.com/htmx.org@1.9.12"></script>

    <!-- Основной скрипт приложения (определяет App) -->
    <script src="/assets/js/main.js" defer></script>

    <!-- Модули (регистрируются в App.registry) -->
    <?php foreach ($JS_TO_LOAD as $jsFile): ?>
        <script src="/assets/js/modules/<?php echo $jsFile; ?>" defer></script>
    <?php endforeach; ?>
</head>

<body>
    <!-- Подключаем layout-файлы (шапка, подвал) -->
    <?php foreach ($PHP as $layout): ?>
        <?php include '../src/views/layouts/' . $layout; ?>
    <?php endforeach; ?>

    <!-- Основной контент страницы -->
    <main id="app-main" class="main-content" data-render-mode="full" data-active-modules='<?php echo htmlspecialchars(json_encode($JS), ENT_QUOTES, 'UTF-8'); ?>'>
        <?php include (str_ends_with($page, '_cp.php') ? '../src/views/components/' : '../src/views/pages/') . $page; ?>
    </main>
</body>

</html>
