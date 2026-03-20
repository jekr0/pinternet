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
        $PHP = [
            'header_lo.php',
            'footer_lo.php'
        ];
        $CSS = [
            'header_lo.css',
            'footer_lo.css',
            'dropdown-menu_cp.css',
            'profile-container_cp.css'
        ];
        $JS = [
            'profile_button.js',
            'dropdown_menu.js'
        ];
        break;

    case '/profile':
        $page = 'profile_pg.php';
        $pageTitle = 'Профиль';
        $PHP = [
            // none
        ];
        $CSS = [
            // none
        ];
        $JS = [
            // none
        ];
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
            'footer_lo.css',
            'dropdown-menu_cp.css',
            'profile-container_cp.css'
        ];
        $JS = [
            'profile_button.js',
            'dropdown_menu.js'
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

    <?php
    // Подключаем CSS-файлы из подпапок layouts/ и components/
    foreach ($CSS as $cssFile):
        // Определяем подпапку по суффиксу файла
        if (str_ends_with($cssFile, '_lo.css')) {
            $subfolder = 'layouts';
        } elseif (str_ends_with($cssFile, '_cp.css')) {
            $subfolder = 'components';
        } else {
            // fallback – компоненты
            $subfolder = 'components';
        }
    ?>
        <link rel="stylesheet" href="assets/css/<?php echo $subfolder; ?>/<?php echo $cssFile; ?>">
    <?php endforeach; ?>

    <!-- Передаём список JS-модулей для инициализации (синхронно) -->
    <script>
        window.activeModules = <?php echo json_encode($JS); ?>;
    </script>

    <!-- Основной скрипт приложения (определяет App) -->
    <script src="assets/js/main.js" defer></script>

    <!-- Модули (регистрируются в App.registry) -->
    <?php foreach ($JS as $jsFile): ?>
        <script src="assets/js/modules/<?php echo $jsFile; ?>" defer></script>
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