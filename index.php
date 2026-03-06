<!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pinternet</title>
    <link rel="stylesheet" href="css/style.css">
</head>

<body>
    <!-- Шапка сайта -->
    <header class="header">
        work in progress

        <!-- Профиль -->
        <button class="header__profile-button" id="profile-button">
            <svg class="header__profile-icon">
                <use xlink:href="images/sprite.svg#icon-at-sign"></use>
            </svg>
        </button>

        <!-- Профиль, настройки -->
        <button class="header__prof_settings-button">
            <svg class="header__prof_settings-icon">
                <use xlink:href="images/sprite.svg#icon-vertical-dots"></use>
            </svg>
        </button>
    </header>

    <!-- Подключение Supabase JS -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <!-- Подключение JS файлов -->
    <script src="js/script.js"></script>
</body>

</html>