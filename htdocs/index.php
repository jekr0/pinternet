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
switch ($path) {
    case '':
    case '/':
    case '/home':
        $page = 'home_pg.php';
        $pageTitle = 'Главная';
        $cssComponents = [
            'header_cp.css',
            'footer_cp.css',
            // ...
        ];
        $jsModules = [
            'profile_button.js',
            'dropdown_menu.js',
            // ...
        ];
        break;

    case '/profile':
        $page = 'profile_pg.php';
        $pageTitle = 'Профиль';
        $cssComponents = [
            'header_cp.css',
            'footer_cp.css',
            // ...
        ];
        $jsModules = [
            'profile_button.js',
            // ...
        ];
        break;

    // case '42':

    default:
        // 404 Not Found
        http_response_code(404);
        $page = '404_pg.php';
        $pageTitle = 'Страница не найдена';
        $cssComponents = [
            'header_cp.css',
            'footer_cp.css',
        ];
        $jsModules = [
            'profile_button.js',
            'dropdown_menu.js',
        ];
        break;
}

// Начинаем вывод HTML
?><!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> / Grinderest</title>
    <link rel="stylesheet" href="assets/css/main.css">
    <?php foreach ($cssComponents as $cssFile): ?>
        <link rel="stylesheet" href="assets/css/components/<?php echo $cssFile; ?>">
    <?php endforeach; ?>
    <?php foreach ($jsModules as $jsFile): ?>
        <script src="assets/js/modules/<?php echo $jsFile; ?>" defer></script>
    <?php endforeach; ?>
    <script src="assets/js/main.js" defer></script>
</head>

<body>
    <!-- Подключаем шапку -->
    <?php include '../src/views/layouts/header_lo.php'; ?>

    <!-- Основной контент страницы -->
    <main class="main-content">
        <?php include '../src/views/pages/' . $page; ?>
    </main>

    <!-- Подключаем подвал -->
    <?php include '../src/views/layouts/footer_lo.php'; ?>
</body>

</html>