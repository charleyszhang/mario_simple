<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('DATA_DIR', __DIR__ . '/data');

function ensureDataDir() {
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0777, true);
    }
}

function readJson($file, $default = []) {
    ensureDataDir();
    $path = DATA_DIR . '/' . $file;
    if (!file_exists($path)) return $default;
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : $default;
}

function writeJson($file, $data) {
    ensureDataDir();
    file_put_contents(DATA_DIR . '/' . $file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function respond($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function body() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

function findUserIndex($users, $token) {
    foreach ($users as $i => $u) {
        if (($u['token'] ?? '') === $token) return $i;
    }
    return null;
}

function findUser(&$users, $token) {
    $i = findUserIndex($users, $token);
    return $i === null ? null : $users[$i];
}

function normalizeLevelStars($stars) {
    if (!is_array($stars)) return [];
    $out = [];
    foreach ($stars as $v) {
        $out[] = (bool)$v;
    }
    return $out;
}

function defaultProfile($nick) {
    return [
        'nickname' => $nick,
        'stars' => 0,
        'coins' => 0,
        'levelStars' => [],
        'maxLevel' => 0,
        'currentLevel' => 0,
        'skin' => 'skin_default',
        'trail' => 'none',
        'splat' => 'default',
        'owned' => ['skin_default'],
        'equipped' => ['skin' => 'skin_default', 'trail' => 'none', 'splat' => 'default'],
        'jumpBoots' => false,
        'muteDev' => false,
        'achievements' => [],
    ];
}

/** PHP on Windows/旧版本对 $2b$ 支持不稳定，统一转 $2y$ 再验证 */
function verifyPassword($plain, $hash) {
    if (!$hash) return false;
    if (password_verify($plain, $hash)) return true;
    if (strpos($hash, '$2b$') === 0) {
        $fixed = '$2y$' . substr($hash, 4);
        if (password_verify($plain, $fixed)) return true;
    }
    return false;
}

/** 保证 demo / demo123 始终可用（PHP 原生 password_hash） */
function ensureDemoAccount() {
    $users = readJson('users.json');
    $demoIdx = null;
    foreach ($users as $i => $u) {
        if (strcasecmp($u['nickname'] ?? '', 'demo') === 0) {
            $demoIdx = $i;
            break;
        }
    }

    $demoData = [
        'nickname' => 'demo',
        'password' => password_hash('demo123', PASSWORD_DEFAULT),
        'token' => 'demo_token_bubble_gum_factory_2026',
        'stars' => 3,
        'coins' => 500,
        'levelStars' => array_merge(array_fill(0, 3, true), array_fill(0, 17, false)),
        'maxLevel' => 2,
        'currentLevel' => 2,
        'skin' => 'skin_default',
        'trail' => 'none',
        'splat' => 'default',
        'owned' => ['skin_default'],
        'equipped' => ['skin' => 'skin_default', 'trail' => 'none', 'splat' => 'default'],
        'jumpBoots' => false,
        'muteDev' => false,
        'achievements' => [],
        'created' => time(),
    ];

    if ($demoIdx === null) {
        $users[] = $demoData;
        writeJson('users.json', $users);
        return;
    }

    if (!verifyPassword('demo123', $users[$demoIdx]['password'] ?? '')
        || strpos($users[$demoIdx]['password'] ?? '', '$2b$') === 0) {
        foreach ($demoData as $k => $v) {
            if ($k !== 'nickname') $users[$demoIdx][$k] = $v;
        }
        writeJson('users.json', $users);
    }
}

ensureDataDir();
ensureDemoAccount();
