<?php
require __DIR__ . '/bootstrap.php';

$input = array_merge($_GET, body());
$action = $input['action'] ?? 'list';

if ($action === 'list') {
    $board = readJson('leaderboard.json');
    usort($board, function ($a, $b) {
        if (($b['stars'] ?? 0) !== ($a['stars'] ?? 0)) return ($b['stars'] ?? 0) - ($a['stars'] ?? 0);
        return ($b['coins'] ?? 0) - ($a['coins'] ?? 0);
    });
    respond(['ok' => true, 'leaderboard' => array_slice($board, 0, 50)]);
}

if ($action === 'save') {
    $token = $input['token'] ?? '';
    $users = readJson('users.json');
    $user = findUser($users, $token);
    if (!$user) respond(['ok' => false, 'error' => '未登录'], 401);

    $user['stars'] = intval($input['stars'] ?? $user['stars'] ?? 0);
    $user['coins'] = intval($input['coins'] ?? $user['coins'] ?? 0);
    $user['levelStars'] = $input['levelStars'] ?? ($user['levelStars'] ?? []);
    $user['maxLevel'] = intval($input['maxLevel'] ?? ($user['maxLevel'] ?? 0));
    if (isset($input['skin'])) $user['skin'] = $input['skin'];
    if (isset($input['owned'])) $user['owned'] = $input['owned'];
    if (isset($input['equipped'])) $user['equipped'] = $input['equipped'];
    if (isset($input['muteDev'])) $user['muteDev'] = (bool)$input['muteDev'];
    if (isset($input['achievements'])) $user['achievements'] = $input['achievements'];
    writeJson('users.json', $users);

    $board = readJson('leaderboard.json');
    $found = false;
    foreach ($board as &$row) {
        if ($row['nickname'] === $user['nickname']) {
            $row['stars'] = $user['stars'];
            $row['coins'] = $user['coins'];
            $row['maxLevel'] = $user['maxLevel'];
            $row['updated'] = time();
            $found = true;
            break;
        }
    }
    if (!$found) {
        $board[] = [
            'nickname' => $user['nickname'],
            'stars' => $user['stars'],
            'coins' => $user['coins'],
            'maxLevel' => $user['maxLevel'],
            'updated' => time(),
        ];
    }
    writeJson('leaderboard.json', $board);
    $out = $user;
    unset($out['password']);
    respond(['ok' => true, 'profile' => $out]);
}

respond(['ok' => false, 'error' => 'unknown action'], 400);
