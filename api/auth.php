<?php
require __DIR__ . '/bootstrap.php';

$input = array_merge($_GET, body());
$action = $input['action'] ?? 'login';

if ($action === 'register') {
    $nick = trim($input['nickname'] ?? '');
    $pass = trim($input['password'] ?? '');
    if ($nick === '' || $pass === '') respond(['ok' => false, 'error' => '昵称和密码不能为空'], 400);
    if (mb_strlen($nick) > 16) respond(['ok' => false, 'error' => '昵称最多16字'], 400);

    $users = readJson('users.json');
    foreach ($users as $u) {
        if (strcasecmp($u['nickname'], $nick) === 0) {
            respond(['ok' => false, 'error' => '昵称已被使用'], 409);
        }
    }

    $token = bin2hex(random_bytes(16));
    $profile = defaultProfile($nick);
    $profile['password'] = password_hash($pass, PASSWORD_DEFAULT);
    $profile['token'] = $token;
    $profile['created'] = time();
    $users[] = $profile;
    writeJson('users.json', $users);
    unset($profile['password']);
    respond(['ok' => true, 'token' => $token, 'profile' => $profile]);
}

if ($action === 'login') {
    $nick = trim($input['nickname'] ?? '');
    $pass = trim($input['password'] ?? '');
    $users = readJson('users.json');
    foreach ($users as &$u) {
        if (strcasecmp($u['nickname'], $nick) === 0 && verifyPassword($pass, $u['password'])) {
            if (empty($u['token'])) $u['token'] = bin2hex(random_bytes(16));
            writeJson('users.json', $users);
            $out = $u;
            unset($out['password']);
            respond(['ok' => true, 'token' => $u['token'], 'profile' => $out]);
        }
    }
    respond(['ok' => false, 'error' => '昵称或密码错误'], 401);
}

if ($action === 'check') {
    $nick = trim($input['nickname'] ?? '');
    $users = readJson('users.json');
    foreach ($users as $u) {
        if (strcasecmp($u['nickname'], $nick) === 0) {
            respond(['ok' => true, 'exists' => true]);
        }
    }
    respond(['ok' => true, 'exists' => false]);
}

respond(['ok' => false, 'error' => 'unknown action'], 400);
