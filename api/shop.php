<?php
require __DIR__ . '/bootstrap.php';

$input = array_merge($_GET, body());
$action = $input['action'] ?? 'list';

$ITEMS = [
    'skin_fire' => ['price' => 200, 'cat' => 'skin', 'needStar' => 3],
    'skin_snow' => ['price' => 250, 'cat' => 'skin', 'needStar' => 3],
    'skin_green' => ['price' => 300, 'cat' => 'skin', 'needStar' => 3],
    'skin_vintage' => ['price' => 150, 'cat' => 'skin', 'needStar' => 3],
    'skin_default' => ['price' => 0, 'cat' => 'skin', 'needStar' => 0],
    'skin_star' => ['price' => 999, 'cat' => 'skin', 'needStar' => 3],
    'skin_neon' => ['price' => 450, 'cat' => 'skin', 'needStar' => 3],
    'skin_zombie' => ['price' => 400, 'cat' => 'skin', 'needStar' => 3],
    'skin_cosmic' => ['price' => 500, 'cat' => 'skin', 'needStar' => 3],
    'trail_glitter' => ['price' => 120, 'cat' => 'trail', 'needStar' => 3],
    'trail_bubble' => ['price' => 100, 'cat' => 'trail', 'needStar' => 3],
    'trail_wrappers' => ['price' => 80, 'cat' => 'trail', 'needStar' => 3],
    'splat_confetti' => ['price' => 90, 'cat' => 'splat', 'needStar' => 3],
    'splat_ooze' => ['price' => 110, 'cat' => 'splat', 'needStar' => 3],
    'splat_gold' => ['price' => 150, 'cat' => 'splat', 'needStar' => 3],
    'snack_bullet' => ['price' => 25, 'cat' => 'snack', 'needStar' => 3],
    'snack_block' => ['price' => 20, 'cat' => 'snack', 'needStar' => 3],
    'snack_waffle' => ['price' => 30, 'cat' => 'snack', 'needStar' => 3],
    'snack_locket' => ['price' => 35, 'cat' => 'snack', 'needStar' => 3],
    'snack_goomba' => ['price' => 28, 'cat' => 'snack', 'needStar' => 3],
    'snack_flower' => ['price' => 32, 'cat' => 'snack', 'needStar' => 3],
    'snack_soda' => ['price' => 22, 'cat' => 'snack', 'needStar' => 3],
    'snack_yoshi' => ['price' => 26, 'cat' => 'snack', 'needStar' => 3],
    'snack_pasta' => ['price' => 40, 'cat' => 'snack', 'needStar' => 3],
    'snack_mushroom' => ['price' => 50, 'cat' => 'snack', 'needStar' => 3],
    'snack_star' => ['price' => 45, 'cat' => 'snack', 'needStar' => 3],
    'snack_shy' => ['price' => 24, 'cat' => 'snack', 'needStar' => 3],
    'fake_star' => ['price' => 500, 'cat' => 'trick', 'needStar' => 3],
    'mute_dev' => ['price' => 150, 'cat' => 'trick', 'needStar' => 3],
];

if ($action === 'list') {
    respond(['ok' => true, 'items' => $ITEMS]);
}

if ($action === 'buy') {
    $token = $input['token'] ?? '';
    $itemId = $input['item'] ?? '';
    if (!isset($ITEMS[$itemId])) respond(['ok' => false, 'error' => '商品不存在'], 400);

    $users = readJson('users.json');
    $user = findUser($users, $token);
    if (!$user) respond(['ok' => false, 'error' => '未登录'], 401);

    $stars = intval($user['stars'] ?? 0);
    $need = $ITEMS[$itemId]['needStar'] ?? 3;
    if ($stars < $need) respond(['ok' => false, 'error' => '需要至少3颗星星才能进入商店'], 403);

    $owned = $user['owned'] ?? ['skin_default'];
    if (in_array($itemId, $owned, true) && $itemId !== 'fake_star') {
        respond(['ok' => false, 'error' => '已拥有'], 409);
    }

    $price = $ITEMS[$itemId]['price'];
    $coins = intval($user['coins'] ?? 0);
    if ($coins < $price) respond(['ok' => false, 'error' => '金币不足'], 402);

    $user['coins'] = $coins - $price;
    $troll = false;
    if ($itemId === 'fake_star') {
        $troll = true;
        $ach = $user['achievements'] ?? [];
        if (!in_array('chewed_gum', $ach, true)) $ach[] = 'chewed_gum';
        $user['achievements'] = $ach;
    } else {
        if (!in_array($itemId, $owned, true)) $owned[] = $itemId;
        $user['owned'] = $owned;
        $cat = $ITEMS[$itemId]['cat'];
        if ($cat === 'skin') $user['skin'] = $itemId;
        if ($cat === 'trail') $user['trail'] = $itemId;
        if ($cat === 'splat') $user['splat'] = $itemId;
        if ($itemId === 'mute_dev') $user['muteDev'] = true;
    }
    writeJson('users.json', $users);
    $out = $user;
    unset($out['password']);
    respond(['ok' => true, 'troll' => $troll, 'profile' => $out]);
}

if ($action === 'equip') {
    $token = $input['token'] ?? '';
    $itemId = $input['item'] ?? '';
    $users = readJson('users.json');
    $user = findUser($users, $token);
    if (!$user) respond(['ok' => false, 'error' => '未登录'], 401);
    $owned = $user['owned'] ?? [];
    if (!in_array($itemId, $owned, true)) respond(['ok' => false, 'error' => '未拥有'], 403);
    if (!isset($ITEMS[$itemId])) respond(['ok' => false, 'error' => '无效'], 400);
    $cat = $ITEMS[$itemId]['cat'];
    if ($cat === 'skin') $user['skin'] = $itemId;
    if ($cat === 'trail') $user['trail'] = $itemId;
    if ($cat === 'splat') $user['splat'] = $itemId;
    writeJson('users.json', $users);
    $out = $user;
    unset($out['password']);
    respond(['ok' => true, 'profile' => $out]);
}

respond(['ok' => false, 'error' => 'unknown action'], 400);
