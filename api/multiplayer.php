<?php
require __DIR__ . '/bootstrap.php';

$input = array_merge($_GET, body());
$action = $input['action'] ?? 'heartbeat';
$now = time();

function onlinePlayers($presence, $now) {
    $out = [];
    foreach ($presence as $nick => $p) {
        if (($now - ($p['lastSeen'] ?? 0)) <= 12) $out[$nick] = $p;
    }
    return $out;
}

if ($action === 'heartbeat') {
    $nick = trim($input['nickname'] ?? '');
    if ($nick === '') respond(['ok' => false, 'error' => 'no nickname'], 400);

    $presence = readJson('presence.json');
    $presence[$nick] = [
        'nickname' => $nick,
        'level' => intval($input['level'] ?? -1),
        'x' => floatval($input['x'] ?? 0),
        'y' => floatval($input['y'] ?? 0),
        'playing' => !empty($input['playing']),
        'lastSeen' => $now,
    ];
    foreach ($presence as $k => $p) {
        if (($now - ($p['lastSeen'] ?? 0)) > 30) unset($presence[$k]);
    }
    writeJson('presence.json', $presence);

    $online = onlinePlayers($presence, $now);
    $playing = array_values(array_filter($online, fn($p) => !empty($p['playing'])));

    $match = readJson('match.json');
    if (count($playing) >= 2) {
        $keys = array_map(fn($p) => $p['nickname'], $playing);
        shuffle($keys);
        $a = $keys[0];
        $b = $keys[1];
        $lv = intval($input['level'] ?? 0);
        if ($lv < 0) $lv = rand(0, 19);
        $match = ['a' => $a, 'b' => $b, 'level' => $lv, 'updated' => $now];
        writeJson('match.json', $match);
    }

    $myMatch = null;
    $opponent = null;
    if (!empty($match['a']) && ($match['a'] === $nick || $match['b'] === $nick)) {
        $oppNick = $match['a'] === $nick ? $match['b'] : $match['a'];
        $myMatch = ['level' => $match['level'], 'opponent' => $oppNick];
        if (isset($online[$oppNick])) $opponent = $online[$oppNick];
    }

    respond([
        'ok' => true,
        'onlineCount' => count($online),
        'match' => $myMatch,
        'opponent' => $opponent,
    ]);
}

if ($action === 'gift' || $action === 'attack') {
    $from = trim($input['from'] ?? '');
    $to = trim($input['to'] ?? '');
    if ($from === '' || $to === '') respond(['ok' => false, 'error' => 'missing'], 400);
    $events = readJson('events.json');
    $events[] = ['from' => $from, 'to' => $to, 'type' => $action, 'time' => $now];
    writeJson('events.json', array_slice($events, -100));
    respond(['ok' => true]);
}

if ($action === 'poll_events') {
    $nick = trim($input['nickname'] ?? '');
    $events = readJson('events.json');
    $mine = array_values(array_filter($events, function ($e) use ($nick, $now) {
        return ($e['to'] ?? '') === $nick && ($now - ($e['time'] ?? 0)) < 10;
    }));
    respond(['ok' => true, 'events' => $mine]);
}

respond(['ok' => false, 'error' => 'unknown action'], 400);
