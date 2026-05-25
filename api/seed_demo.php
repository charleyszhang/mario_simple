<?php
/**
 * One-time demo account seed (uses PHP password_hash).
 * Visit: /mario/mario_simple/api/seed_demo.php
 */
require __DIR__ . '/bootstrap.php';

$users = readJson('users.json');
foreach ($users as $u) {
    if (strcasecmp($u['nickname'] ?? '', 'demo') === 0) {
        respond(['ok' => true, 'message' => 'Demo account already exists', 'nickname' => 'demo', 'password' => 'demo123']);
    }
}

$profile = defaultProfile('demo');
$profile['password'] = password_hash('demo123', PASSWORD_DEFAULT);
$profile['token'] = 'demo_token_bubble_gum_factory_2026';
$profile['stars'] = 3;
$profile['coins'] = 500;
$profile['levelStars'] = array_merge(array_fill(0, 3, true), array_fill(0, 17, false));
$profile['maxLevel'] = 2;
$profile['created'] = time();
$users[] = $profile;
writeJson('users.json', $users);

$board = readJson('leaderboard.json');
$board[] = [
    'nickname' => 'demo',
    'stars' => 3,
    'coins' => 500,
    'maxLevel' => 2,
    'updated' => time(),
];
writeJson('leaderboard.json', $board);

respond([
    'ok' => true,
    'message' => 'Demo account created',
    'nickname' => 'demo',
    'password' => 'demo123',
]);
