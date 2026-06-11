<?php
const POST_LIKE_EXP_AMOUNT = 50;
const COMMENT_LIKE_EXP_AMOUNT = 25;
const SUBSCRIBE_EXP_AMOUNT = 100;

const LEVEL_THRESHOLDS = [
    1 => 100,
    2 => 105,
    3 => 110,
    4 => 125,
    5 => 150,
    6 => 200,
    7 => 300,
    8 => 500,
    9 => 750,
];

const LEVEL_THRESHOLD_MAX = 1000;

// Вычисляет корректный уровень из суммарного exp.
// Используется при начислении exp и при логине для синхронизации.
function calcLevel(int $exp): int
{
    $level    = 1;
    $expSpent = 0;

    while (true) {
        $needed    = LEVEL_THRESHOLDS[$level] ?? LEVEL_THRESHOLD_MAX;
        $expSpent += $needed;
        if ($exp < $expSpent) break;
        $level++;
    }

    return $level;
}

// Считает прогресс внутри текущего уровня.
// level берётся из БД — он уже актуален.
function getExpProgress(int $exp, int $level): array
{
    $expSpent = 0;
    for ($i = 1; $i < $level; $i++) {
        $expSpent += LEVEL_THRESHOLDS[$i] ?? LEVEL_THRESHOLD_MAX;
    }

    $needed   = LEVEL_THRESHOLDS[$level] ?? LEVEL_THRESHOLD_MAX;
    $current  = $exp - $expSpent;
    $barWidth = round(min($current, $needed) / $needed * 100);

    return [
        'current'    => max(0, $current),
        'needed'     => $needed,
        'next_level' => $level + 1,
        'bar_width'  => $barWidth,
    ];
}

function addExpWithoutTransaction(PDO $pdo, int $userId, int $amount): void
{
    if ($amount <= 0) return;

    $stmt = $pdo->prepare('UPDATE Users SET exp = exp + ? WHERE id = ?');
    $stmt->execute([$amount, $userId]);

    $stmt = $pdo->prepare('SELECT exp FROM Users WHERE id = ?');
    $stmt->execute([$userId]);
    $newExp = (int) $stmt->fetchColumn();
    $newLevel = calcLevel($newExp);

    $stmt = $pdo->prepare('UPDATE Users SET level = ? WHERE id = ?');
    $stmt->execute([$newLevel, $userId]);

    // Обновляем сессию если это текущий пользователь
    if (isset($_SESSION['user_id']) && (int) $_SESSION['user_id'] === $userId) {
        $_SESSION['exp'] = $newExp;
        $_SESSION['level'] = $newLevel;
    }
}

// Начисляем exp пользователю и синхронизируем сессию
function addExp(PDO $pdo, int $userId, int $amount): void
{
    $pdo->beginTransaction();
    addExpWithoutTransaction($pdo, $userId, $amount);
    $pdo->commit();
}
