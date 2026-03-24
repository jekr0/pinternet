<?php
// Параметры подключения
define('DB_HOST',    'localhost');
define('DB_NAME',    'Grinderest_DB');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

// Настройки PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // бросать исключения при ошибках
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // возвращать ассоциативные массивы
    PDO::ATTR_EMULATE_PREPARES   => false,                    // настоящие prepared statements (защита от SQL-инъекций)
];

$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    error_log('Database loaded successfully');
} catch (PDOException $e) {
    error_log('Unable to load database: ' . $e->getCode());
    exit; // останавливаем выполнение — без БД сайт не работает
}