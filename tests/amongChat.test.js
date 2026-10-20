const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const statsPath = require.resolve('../services/amongChatStats');
const originalStatsModule = require.cache[statsPath];
const matchResults = [];
const statsStub = {
  async buyCosmetic(userId, cosmeticId, cost) {
    cosmeticTransactions.push(['buy', userId, cosmeticId, cost]);
    return { success: true };
  },
  currentSeasonId() { return '2026-T4'; },
  async equipCosmetic(userId, cosmeticId) {
    cosmeticTransactions.push(['equip', userId, cosmeticId]);
    return { success: true };
  },
  async getLeaderboard() { return []; },
  async getProfile() { return null; },
  async recordMatch(players, winner) {
    matchResults.push({ players, winner });
  }
};
const mockedStatsModule = new Module(statsPath);
mockedStatsModule.filename = statsPath;
mockedStatsModule.loaded = true;
mockedStatsModule.exports = statsStub;
require.cache[statsPath] = mockedStatsModule;

const game = require('../utils/amongChat');
const groupId = 'group-1@g.us';
let serial = 0;
const cosmeticTransactions = [];

function createClient() {
  const sent = [];
  return {
    sent,
    async sendMessage(...args) {
      sent.push(args);
    }
  };
}

function makeMessage(userId, body, group = false) {
  const replies = [];
  const message = {
    from: group ? groupId : userId,
    author: group ? userId : undefined,
    body,
    _data: { notifyName: userId.split('@')[0] },
    replies,
    async reply(text) {
      replies.push(text);
    }
  };
  return message;
}

async function startLobby(client, playerCount = 4) {
  game.resetForTests();
  matchResults.length = 0;
  const players = Array.from({ length: playerCount }, () => `player-${++serial}@c.us`);
  await game.handle(client, makeMessage(players[0], '!amongus crear', true), 'amongus');
  for (const player of players.slice(1)) {
    await game.handle(client, makeMessage(player, '!amongus unir', true), 'amongus');
  }
  await game.handle(client, makeMessage(players[0], '!amongus iniciar', true), 'amongus');
  return { players, room: game.rooms.get(groupId) };
}

test.after(() => {
  game.resetForTests();
  if (originalStatsModule) require.cache[statsPath] = originalStatsModule;
  else delete require.cache[statsPath];
});

test('Among Chat crea salas, limita jugadores y asigna roles solo por privado', async () => {
  const client = createClient();
  game.resetForTests();
  const owner = `player-${++serial}@c.us`;
  const groupMessage = makeMessage(owner, '!amongus crear', true);

  await game.handle(client, groupMessage, 'amongus');
  const room = game.rooms.get(groupId);
  assert.equal(room.status, 'LOBBY');
  assert.equal(room.players.size, 1);

  for (let index = 0; index < 3; index += 1) {
    await game.handle(client, makeMessage(`player-${++serial}@c.us`, '!amongus unir', true), 'amongus');
  }
  const otherGroup = makeMessage(`player-${serial}@c.us`, '!amongus iniciar', true);
  await game.handle(client, otherGroup, 'amongus');
  assert.match(otherGroup.replies[0], /Solo quien creó/);

  await game.handle(client, makeMessage(owner, '!amongus iniciar', true), 'amongus');
  assert.equal(room.status, 'ACCIONES');
  assert.equal([...room.players.values()].filter(({ role }) => role === 'IMPOSTOR').length, 1);
  assert.deepEqual(
    client.sent.filter(([to]) => to !== groupId).map(([to]) => to).sort(),
    [...room.players.keys()].sort()
  );
  assert.ok([...room.players.values()].every(({ role }) => role));
  assert.ok(client.sent.some(([to, text]) => to === groupId && /Los roles fueron enviados por privado/.test(text)));
});

test('Among Chat exige acciones privadas y resuelve muerte, votación y victoria', async () => {
  const client = createClient();
  const { room } = await startLobby(client);
  const impostor = [...room.players.values()].find(({ role }) => role === 'IMPOSTOR');
  const victim = [...room.players.values()].find(({ role }) => role !== 'IMPOSTOR');
  const playerNumbers = [...room.players.keys()];
  const victimNumber = playerNumbers.indexOf(victim.id) + 1;
  const impostorNumber = playerNumbers.indexOf(impostor.id) + 1;

  const publicAttempt = makeMessage(impostor.id, `!matar ${victimNumber}`, true);
  await game.handle(client, publicAttempt, 'matar');
  assert.match(publicAttempt.replies[0], /por privado/);
  assert.equal(victim.alive, true);

  await game.handle(client, makeMessage(impostor.id, `!matar ${victimNumber}`), 'matar');
  assert.equal(victim.alive, false);
  assert.equal(room.status, 'ACCIONES');
  assert.ok(room.killTimer);
  assert.equal(room.taskGoal, 6);

  const survivor = [...room.players.values()].find(({ alive }) => alive);
  const taskMessage = makeMessage(survivor.id, '!tarea');
  await game.handle(client, taskMessage, 'tarea');
  assert.ok(survivor.pendingTask);

  const meeting = makeMessage(survivor.id, '!amongus reunion', true);
  await game.handle(client, meeting, 'amongus');
  assert.equal(room.status, 'DISCUSION');
  assert.equal(room.killTimer, null);
  assert.ok(client.sent.some(([to, text]) =>
    to === groupId && new RegExp(`${victim.name} fue encontrado eliminado`).test(text)
  ));
  await game.handle(client, makeMessage(room.ownerId, '!amongus votacion', true), 'amongus');
  assert.equal(room.status, 'VOTACION');
  for (const player of room.players.values()) {
    if (!player.alive) continue;
    await game.handle(client, makeMessage(player.id, `!votar ${impostorNumber}`), 'votar');
  }

  assert.equal(room.status, 'FINALIZADA');
  assert.equal(room.winner, 'CREW');
  assert.equal(matchResults.length, 1);
  assert.equal(matchResults[0].winner, 'CREW');
  assert.ok(client.sent.some(([to, message]) => to === groupId && /La tripulación ganó/.test(message)));
});

test('Among Chat suma tareas y permite reparar sabotajes antes del límite', async () => {
  const client = createClient();
  const { room } = await startLobby(client);
  const crew = [...room.players.values()].find(({ role }) => role !== 'IMPOSTOR');
  const impostor = [...room.players.values()].find(({ role }) => role === 'IMPOSTOR');

  const taskMessage = makeMessage(crew.id, '!tarea');
  await game.handle(client, taskMessage, 'tarea');
  assert.ok(crew.pendingTask);
  await game.handle(client, makeMessage(crew.id, `!tarea ${crew.pendingTask.answer}`), 'tarea');
  assert.equal(crew.tasksCompleted, 1);
  assert.equal(room.taskProgress, 1);

  await game.handle(client, makeMessage(impostor.id, '!sabotear reactor'), 'sabotear');
  assert.equal(room.sabotage.type, 'reactor');
  const answer = room.sabotage.puzzle.answer;
  await game.handle(client, makeMessage(crew.id, `!reparar ${answer}`, true), 'reparar');
  assert.equal(room.sabotage, null);
  assert.equal(room.sabotageTimer, null);
  game.resetForTests();
});

test('las tareas incluyen descifrado, emoji distinto y una espera simulada de correo', async () => {
  const client = createClient();
  const { room } = await startLobby(client);
  const crew = [...room.players.values()].find(({ role }) => role !== 'IMPOSTOR');
  const originalRandom = Math.random;

  try {
    Math.random = () => 0.3;
    await game.handle(client, makeMessage(crew.id, '!tarea'), 'tarea');
    assert.equal(crew.pendingTask.type, 'cipher');
    assert.match(crew.pendingTask.question, /César/);
    await game.handle(client, makeMessage(crew.id, `!tarea ${crew.pendingTask.answer}`), 'tarea');
    assert.equal(crew.tasksCompleted, 1);

    Math.random = () => 0.6;
    await game.handle(client, makeMessage(crew.id, '!tarea'), 'tarea');
    assert.equal(crew.pendingTask.type, 'emoji');
    assert.match(crew.pendingTask.question, /emoji diferente/);
    await game.handle(client, makeMessage(crew.id, `!tarea ${crew.pendingTask.answer}`), 'tarea');
    assert.equal(crew.tasksCompleted, 2);

    Math.random = () => 0.9;
    await game.handle(client, makeMessage(crew.id, '!tarea'), 'tarea');
    assert.equal(crew.pendingTask.type, 'email');
    assert.match(crew.pendingTask.question, /no se enviará ningún email real/);

    const earlyAnswer = makeMessage(crew.id, '!tarea listo');
    await game.handle(client, earlyAnswer, 'tarea');
    assert.match(earlyAnswer.replies[0], /sigue en proceso/);
    assert.equal(crew.tasksCompleted, 2);

    crew.pendingTask.readyAt = Date.now() - 1;
    await game.handle(client, makeMessage(crew.id, '!tarea listo'), 'tarea');
    assert.equal(crew.tasksCompleted, 3);
  } finally {
    Math.random = originalRandom;
    game.resetForTests();
  }
});

test('la protección del Médico bloquea un ataque y consume la acción del impostor', async () => {
  const client = createClient();
  const { room } = await startLobby(client);
  const doctor = [...room.players.values()].find(({ role }) => role === 'DOCTOR');
  const impostor = [...room.players.values()].find(({ role }) => role === 'IMPOSTOR');
  const target = [...room.players.values()].find(({ id, role }) =>
    id !== doctor.id && role !== 'IMPOSTOR'
  );
  const numbers = [...room.players.keys()];
  const targetNumber = numbers.indexOf(target.id) + 1;

  await game.handle(client, makeMessage(doctor.id, `!proteger ${targetNumber}`), 'proteger');
  await game.handle(client, makeMessage(impostor.id, `!matar ${targetNumber}`), 'matar');
  assert.equal(target.alive, true);
  assert.equal(room.status, 'ACCIONES');
  assert.equal(room.impostorActionUsed, true);

  const secondAttempt = makeMessage(impostor.id, `!matar ${numbers.indexOf(doctor.id) + 1}`);
  await game.handle(client, secondAttempt, 'matar');
  assert.match(secondAttempt.replies[0], /ya realizaron su acción/);
  game.resetForTests();
});

test('Among Chat ofrece cosméticos y subcomandos de perfil sin exigir una sala', async () => {
  const client = createClient();
  const user = `player-${++serial}@c.us`;
  const shop = makeMessage(user, '!amongus tienda');
  await game.handle(client, shop, 'amongus');
  assert.match(shop.replies[0], /Cosméticos de 2026-T4/);
  const cosmeticId = '2026-T4-visor-neon';
  assert.match(shop.replies[0], new RegExp(cosmeticId));

  await game.handle(client, makeMessage(user, `!amongus comprar ${cosmeticId}`), 'amongus');
  await game.handle(client, makeMessage(user, `!amongus equipar ${cosmeticId}`), 'amongus');
  assert.deepEqual(cosmeticTransactions.slice(-2), [
    ['buy', user, cosmeticId, 100],
    ['equip', user, cosmeticId]
  ]);

  const season = makeMessage(user, '!amongus temporada');
  await game.handle(client, season, 'amongus');
  assert.match(season.replies[0], /Todavía no hay puntos/);
});

test('Among Chat aplica las reglas de tamaño y no permite entrar en otra partida activa', async () => {
  const client = createClient();
  game.resetForTests();
  const owner = `player-${++serial}@c.us`;
  await game.handle(client, makeMessage(owner, '!amongus crear', true), 'amongus');
  const tooFew = makeMessage(owner, '!amongus iniciar', true);
  await game.handle(client, tooFew, 'amongus');
  assert.match(tooFew.replies[0], /al menos 4/);

  const guest = `player-${++serial}@c.us`;
  await game.handle(client, makeMessage(guest, '!amongus unir', true), 'amongus');
  const otherGroupId = 'group-2@g.us';
  const otherLobby = makeMessage(owner, '!amongus crear', true);
  otherLobby.from = otherGroupId;
  await game.handle(client, otherLobby, 'amongus');
  assert.match(otherLobby.replies[0], /Ya formas parte de una partida activa en otro grupo/);
  game.resetForTests();
});

test('Among Chat acepta hasta 10 jugadores y asigna dos impostores desde siete', async () => {
  const client = createClient();
  const { players, room } = await startLobby(client, 10);
  const extraPlayer = `player-${++serial}@c.us`;
  const joinAttempt = makeMessage(extraPlayer, '!amongus unir', true);
  await game.handle(client, joinAttempt, 'amongus');

  assert.equal(room.players.size, 10);
  assert.match(joinAttempt.replies[0], /no se aceptan más jugadores/);
  assert.equal(players.length, 10);
  assert.equal([...room.players.values()].filter(({ role }) => role === 'IMPOSTOR').length, 2);
  game.resetForTests();
});
