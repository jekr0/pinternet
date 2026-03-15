<?php

// Удаляем начальный /htdocs, если он есть
$base = '/htdocs';
if (strpos($path, $base) === 0) {
    $path = substr($path, strlen($base));
    if ($path === '') {
        $path = '/';
    }
}

// Получаем запрошенный URI без параметров
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$path = rtrim($path, '/');

// Определяем, какая страница нужна
switch ($path) {
    case '':

    case '/':
        $page = 'home_page.php';
        $pageTitle = 'Главная';
        // Список CSS-компонентов для главной страницы
        $cssComponents = [
            'header_comp.css',
            'footer_comp.css',
            // ...
        ];
        // Список JS-модулей для главной страницы
        $jsModules = [
            'header_mod-profile_button.js', // если модуль отвечает за шапку
            // ...
        ];
        break;

    case '/profile':
        $page = 'profile_page.php';
        $pageTitle = 'Профиль';
        $cssComponents = [
            'header_comp.css',
            'footer_comp.css',
            // ...
        ];
        $jsModules = [
            'header_mod-profile_button.js',
            // ...
        ];
        break;

    // case '...':

    default:
        // 404 Not Found
        http_response_code(404);
        $page = '404_page.php'; // создайте такой шаблон при необходимости
        $pageTitle = 'Страница не найдена';
        $cssComponents = [
            'header_comp.css',
            'footer_comp.css',
        ];
        $jsModules = [
            'header_mod-profile_button.js',
        ];
        break;
}

// Начинаем вывод HTML
?><!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> | Grinderest</title>
        <link rel="stylesheet" href="assets/css/main.css">
    <?php foreach ($cssComponents as $cssFile): ?>
        <link rel="stylesheet" href="assets/css/components/<?php echo $cssFile; ?>">
    <?php endforeach; ?>
        <script src="assets/js/main.js" defer></script>
    <?php foreach ($jsModules as $jsFile): ?>
        <script src="assets/js/modules/<?php echo $jsFile; ?>" defer></script>
    <?php endforeach; ?>
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