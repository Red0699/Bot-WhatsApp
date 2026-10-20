const {
  buyCosmetic,
  currentSeasonId,
  equipCosmetic,
  getLeaderboard,
  getProfile,
  recordMatch
} = require('../services/amongChatStats');

const rooms = new Map();
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 10;
const TASKS_PER_CREWMATE = 3;
const SABOTAGE_DURATION_MS = 60_000;
const POST_KILL_ACTION_WINDOW_MS = 60_000;
const SIMULATED_EMAIL_DELAY_MS = 10_000;
const activeStates = new Set(['LOBBY', 'ACCIONES', 'DISCUSION', 'VOTACION']);
const achievementNames = {
  'primera-partida': 'Primera partida',
  'primera-victoria': 'Primera victoria',
  'tres-tareas': 'Manos a la obra'
};

function getSeasonCosmetics() {
  const season = currentSeasonId();
  return [
    { id: `${season}-visor-neon`, name: 'Visor neón', cost: 100 },
    { id: `${season}-casco-orbita`, name: 'Casco órbita', cost: 200 },
    { id: `${season}-traje-estelar`, name: 'Traje estelar', cost: 300 }
  ];
}

function getActorId(message) {
  return message.author || (message.from?.endsWith('@g.us') ? undefined : message.from);
}

function getName(message, id) {
  return message._data?.notifyName || message._data?.pushname ||
    message.pushName || id?.split('@')[0] || 'Tripulante';
}

function getArguments(message) {
  return (message.body || '').trim().split(/\s+/).slice(1);
}

function isGroupMessage(message) {
  return typeof message.from === 'string' && message.from.endsWith('@g.us');
}

function getRoomForUser(userId) {
  if (!userId) return undefined;
  return [...rooms.values()].find((room) =>
    activeStates.has(room.status) && room.players.has(userId)
  );
}

function getPlayer(room, userId) {
  return room?.players.get(userId);
}

function getAlivePlayers(room) {
  return [...room.players.values()].filter((player) => player.alive);
}

function getImpostors(room) {
  return [...room.players.values()].filter((player) => player.role === 'IMPOSTOR');
}

function getCrew(room) {
  return [...room.players.values()].filter((player) => player.role !== 'IMPOSTOR');
}

function getRoster(room, aliveOnly = false) {
  return [...room.players.values()]
    .map((player, index) => ({ player, number: index + 1 }))
    .filter(({ player }) => !aliveOnly || player.alive)
    .map(({ player, number }) => `${number}. ${player.name}`)
    .join('\n');
}

function makePuzzle() {
  const first = Math.floor(Math.random() * 8) + 2;
  const second = Math.floor(Math.random() * 8) + 2;
  const operation = Math.floor(Math.random() * 3);

  if (operation === 0) {
    return { question: `Calcula ${first} + ${second}.`, answer: String(first + second) };
  }
  if (operation === 1) {
    const larger = Math.max(first, second);
    const smaller = Math.min(first, second);
    return { question: `Calcula ${larger} - ${smaller}.`, answer: String(larger - smaller) };
  }
  return { question: `Calcula ${first} × ${second}.`, answer: String(first * second) };
}

function encodeCaesar(text, shift) {
  return text.replace(/[A-Z]/g, (letter) =>
    String.fromCharCode(((letter.charCodeAt(0) - 65 + shift) % 26) + 65)
  );
}

function makeTaskChallenge() {
  const challengeType = Math.floor(Math.random() * 4);
  if (challengeType === 0) return { ...makePuzzle(), type: 'math' };

  if (challengeType === 1) {
    const answer = ['REACTOR', 'TRIPULANTE', 'SABOTAJE', 'OXIGENO'][
      Math.floor(Math.random() * 4)
    ];
    return {
      type: 'cipher',
      answer: answer.toLocaleLowerCase('es'),
      question: `Descifra con César desplazando 3 letras hacia atrás: *${encodeCaesar(answer, 3)}*.`
    };
  }

  if (challengeType === 2) {
    const sets = [
      { repeated: '🔴', different: '🟠' },
      { repeated: '🐶', different: '🐺' },
      { repeated: '🍎', different: '🍐' }
    ];
    const { repeated, different } = sets[Math.floor(Math.random() * sets.length)];
    const differentIndex = Math.floor(Math.random() * 5) + 1;
    const emojis = Array.from({ length: 5 }, (_, index) =>
      index + 1 === differentIndex ? different : repeated
    );
    return {
      type: 'emoji',
      answer: String(differentIndex),
      question: `Encuentra el emoji diferente y responde su posición (1-5):\n${emojis.join(' ')}`
    };
  }

  return {
    type: 'email',
    answer: 'listo',
    readyAt: Date.now() + SIMULATED_EMAIL_DELAY_MS,
    question: '📧 Simulación de envío de correo iniciada (no se enviará ningún email real). Espera 10 segundos y luego responde *!tarea listo*.'
  };
}

function normalizeAnswer(value) {
  return (value || '').trim().toLocaleLowerCase('es').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function resolveAliveTarget(room, argument) {
  const number = Number(argument);
  if (!Number.isInteger(number) || number < 1) return undefined;
  const target = [...room.players.values()][number - 1];
  return target?.alive ? target : undefined;
}

async function reply(message, content) {
  await message.reply(content);
}

async function sendGroup(client, room, content) {
  await client.sendMessage(room.groupId, content);
}

async function sendPrivate(client, userId, content) {
  await client.sendMessage(userId, content);
}

async function finishGame(client, room, winner, reason) {
  if (!activeStates.has(room.status)) return;

  room.status = 'FINALIZADA';
  room.winner = winner;
  room.finishedAt = Date.now();
  if (room.sabotageTimer) clearTimeout(room.sabotageTimer);
  if (room.killTimer) clearTimeout(room.killTimer);
  room.pendingBody = null;

  await recordMatch([...room.players.values()], winner);
  const title = winner === 'CREW' ? '¡La tripulación ganó!' : '¡Los impostores ganaron!';
  const roles = [...room.players.values()]
    .map((player) => `${player.name}: ${player.role === 'IMPOSTOR' ? 'Impostor' : player.role}`)
    .join('\n');
  await sendGroup(
    client,
    room,
    `🏁 *${title}*\n${reason}\n\n*Roles revelados:*\n${roles}\n\n` +
      'Usa *!amongus perfil* o *!amongus ranking* para ver tu progreso.'
  );
}

async function checkVictory(client, room) {
  const impostorsAlive = getImpostors(room).filter((player) => player.alive).length;
  const crewAlive = getCrew(room).filter((player) => player.alive).length;

  if (impostorsAlive === 0) {
    await finishGame(client, room, 'CREW', 'Todos los impostores fueron descubiertos.');
    return true;
  }
  if (impostorsAlive >= crewAlive) {
    await finishGame(client, room, 'IMPOSTOR', 'Los impostores igualaron o superaron a la tripulación.');
    return true;
  }
  if (room.taskProgress >= room.taskGoal) {
    await finishGame(client, room, 'CREW', 'La tripulación completó todas las tareas.');
    return true;
  }
  return false;
}

function assignRoles(room) {
  const players = [...room.players.values()];
  const impostorCount = players.length >= 7 ? 2 : 1;
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  for (const player of shuffled) player.role = 'CREWMATE';
  for (const player of shuffled.slice(0, impostorCount)) player.role = 'IMPOSTOR';

  const crew = shuffled.filter((player) => player.role === 'CREWMATE');
  const specialRoles = ['DETECTIVE', 'DOCTOR', 'ENGINEER'];
  for (let index = 0; index < Math.min(crew.length, specialRoles.length); index += 1) {
    crew[index].role = specialRoles[index];
  }

  room.status = 'ACCIONES';
  room.round = 1;
  room.taskGoal = crew.length * TASKS_PER_CREWMATE;
  room.taskProgress = 0;
  room.impostorActionUsed = false;
  room.killTimer = null;
  room.pendingBody = null;
  room.votes = new Map();
  room.bodies = [];
}

function roleName(role) {
  return ({
    IMPOSTOR: 'Impostor',
    CREWMATE: 'Tripulante',
    DETECTIVE: 'Detective',
    DOCTOR: 'Médico',
    ENGINEER: 'Ingeniero'
  })[role];
}

async function handleLobbyCommand(client, message, subcommand, args) {
  const actorId = getActorId(message);
  if (subcommand === 'perfil') {
    const profile = await getProfile(actorId);
    if (!profile) return reply(message, 'Aún no tienes estadísticas. Completa una partida para empezar a ganar XP y monedas.');
    const level = Math.floor(profile.xp / 100) + 1;
    const achievements = profile.achievements?.length
      ? profile.achievements.map((achievement) => achievementNames[achievement] || achievement).join(', ')
      : 'ninguno todavía';
    return reply(
      message,
      `👨‍🚀 *Perfil Among Chat: ${profile.name}*\n` +
        `Nivel: ${level} · XP: ${profile.xp} · 🪙 ${profile.coins}\n` +
        `Partidas: ${profile.matches} · Victorias: ${profile.wins} · Derrotas: ${profile.losses}\n` +
        `Tareas completadas: ${profile.tasksCompleted}\n` +
        `Temporada ${profile.seasonId || currentSeasonId()}: ${profile.seasonXp || 0} XP · ${profile.seasonWins || 0} victorias\n` +
        `Cosmético equipado: ${profile.equippedCosmetic || 'ninguno'}\n` +
        `Logros: ${achievements}`
    );
  }

  if (subcommand === 'ranking') {
    const leaderboard = await getLeaderboard();
    if (!leaderboard.length) return reply(message, 'El ranking estará disponible después de la primera partida terminada.');
    const rows = leaderboard.map((profile, index) =>
      `${index + 1}. ${profile.name} — nivel ${Math.floor(profile.xp / 100) + 1}, ${profile.xp} XP, ${profile.wins} victorias`
    );
    return reply(message, `🏆 *Ranking global de Among Chat*\n${rows.join('\n')}`);
  }

  if (subcommand === 'temporada') {
    const leaderboard = await getLeaderboard(10, true);
    if (!leaderboard.length) return reply(message, 'Todavía no hay puntos en la temporada actual.');
    const rows = leaderboard.map((profile, index) =>
      `${index + 1}. ${profile.name} — ${profile.seasonXp} XP, ${profile.seasonWins} victorias`
    );
    return reply(message, `🏆 *Temporada ${currentSeasonId()}*\n${rows.join('\n')}`);
  }

  if (subcommand === 'tienda') {
    const catalog = getSeasonCosmetics();
    return reply(
      message,
      `🛍️ *Cosméticos de ${currentSeasonId()}*\n` +
        catalog.map(({ id, name, cost }) => `• ${name} — ${cost} monedas\n  ID: ${id}`).join('\n') +
        '\nCompra con *!amongus comprar <ID>* y equipa con *!amongus equipar <ID>*.'
    );
  }

  if (subcommand === 'comprar') {
    const cosmetic = getSeasonCosmetics().find(({ id }) => id === args[0]);
    if (!cosmetic) return reply(message, 'Ese cosmético no está disponible esta temporada. Consulta *!amongus tienda*.');
    const result = await buyCosmetic(actorId, cosmetic.id, cosmetic.cost);
    if (!result.success) {
      return reply(message, result.reason === 'comprado'
        ? 'Ya tienes ese cosmético.'
        : `No tienes suficientes monedas. Cuesta ${cosmetic.cost} monedas.`);
    }
    return reply(message, `🛍️ Compraste *${cosmetic.name}*. Equípalo con *!amongus equipar ${cosmetic.id}*.`);
  }

  if (subcommand === 'equipar') {
    if (!args[0]) return reply(message, 'Indica el ID del cosmético que quieres equipar.');
    const result = await equipCosmetic(actorId, args[0]);
    return reply(message, result.success
      ? `✨ Equipaste *${args[0]}*.`
      : 'No tienes ese cosmético. Usa *!amongus tienda* para ver los disponibles.');
  }

  const groupId = message.from;
  const actorName = getName(message, actorId);
  if (!isGroupMessage(message) || !actorId) {
    return reply(message, '⚠️ Este comando de sala debe usarse en un grupo.');
  }

  if (subcommand === 'crear') {
    const current = rooms.get(groupId);
    if (current && activeStates.has(current.status)) {
      return reply(message, '⚠️ Ya hay una sala activa en este grupo.');
    }
    const otherRoom = getRoomForUser(actorId);
    if (otherRoom) return reply(message, 'Ya formas parte de una partida activa en otro grupo.');
    const room = {
      groupId,
      ownerId: actorId,
      players: new Map([[actorId, {
        id: actorId, name: actorName, role: null, alive: true, tasksCompleted: 0,
        pendingTask: null, protectedRound: 0, investigations: 0, protectedThisRound: false
      }]]),
      status: 'LOBBY'
    };
    rooms.set(groupId, room);
    return reply(
      message,
      `🚀 *Sala de Among Chat creada por ${actorName}.*\n` +
        `Jugadores: 1/${MAX_PLAYERS}. Se necesitan ${MIN_PLAYERS} para iniciar.\n` +
        'Únete con *!amongus unir* y el anfitrión inicia con *!amongus iniciar*.'
    );
  }

  const room = rooms.get(groupId);
  if (!room || !activeStates.has(room.status)) {
    return reply(message, '⚠️ No hay una sala activa. Crea una con *!amongus crear*.');
  }

  if (subcommand === 'unir') {
    if (room.status !== 'LOBBY') return reply(message, '⚠️ La partida ya comenzó; no se aceptan más jugadores.');
    if (room.players.has(actorId)) return reply(message, 'Ya estás en la sala.');
    const otherRoom = getRoomForUser(actorId);
    if (otherRoom) return reply(message, 'Ya formas parte de una partida activa en otro grupo.');
    if (room.players.size >= MAX_PLAYERS) return reply(message, `La sala llegó al máximo de ${MAX_PLAYERS} jugadores.`);
    room.players.set(actorId, {
      id: actorId, name: actorName, role: null, alive: true, tasksCompleted: 0,
      pendingTask: null, protectedRound: 0, investigations: 0, protectedThisRound: false
    });
    return reply(message, `✅ ${actorName} se unió. Jugadores: ${room.players.size}/${MAX_PLAYERS}.`);
  }

  if (subcommand === 'iniciar') {
    if (room.ownerId !== actorId) return reply(message, 'Solo quien creó la sala puede iniciar la partida.');
    if (room.status !== 'LOBBY') return reply(message, 'La partida ya fue iniciada.');
    if (room.players.size < MIN_PLAYERS) return reply(message, `Se necesitan al menos ${MIN_PLAYERS} jugadores para comenzar.`);

    assignRoles(room);
    const roster = getRoster(room);
    const dmFailures = [];
    for (const player of room.players.values()) {
      const privateRole = player.role === 'IMPOSTOR'
        ? `🔪 *Eres Impostor.* Tu objetivo es eliminar a la tripulación sin ser descubierto.\n` +
          `Impostores: ${getImpostors(room).map((impostor) => impostor.name).join(', ')}\n\n` +
          `Elige una víctima con *!matar <número>*.\n` +
          'Sabotajes: *!sabotear luces*, *!sabotear reactor* o *!sabotear oxígeno*.'
        : `🧑‍🚀 *Tu rol: ${roleName(player.role)}.* Completa tareas, debate y descubre a los impostores.\n\n` +
          `Tareas: *!tarea* (responde el reto por privado).\n` +
          (player.role === 'DETECTIVE' ? 'Investiga con *!investigar <número>*.\n' : '') +
          (player.role === 'DOCTOR' ? 'Protege con *!proteger <número>* una vez por ronda.\n' : '') +
          (player.role === 'ENGINEER' ? 'Puedes reparar sabotajes con *!reparar <respuesta>*.\n' : '');
      try {
        await sendPrivate(client, player.id, privateRole);
      } catch (error) {
        dmFailures.push(player.name);
        console.error(`❌ No se pudo enviar el rol privado de Among Chat a ${player.id}:`, error);
      }
    }

    await sendGroup(
      client,
      room,
      `🛸 *¡Partida iniciada!* Los roles fueron enviados por privado.\n` +
        `Jugadores:\n${roster}\n\n` +
        `Progreso de tareas: 0/${room.taskGoal}. Tripulantes: usen *!tarea* por privado.\n` +
        'Al detectar algo sospechoso, escriban *!amongus reunion*.'
    );
    if (dmFailures.length) {
      await sendGroup(
        client,
        room,
        '⚠️ No se pudo entregar el rol privado a todos. Quienes no recibieron mensaje deben iniciar un chat privado con el bot y avisar al anfitrión.'
      );
    }
    return;
  }

  if (subcommand === 'estado') {
    const status = room.status === 'LOBBY'
      ? `Sala: ${room.players.size}/${MAX_PLAYERS} jugadores.`
      : `Estado: ${room.status}. Tareas: ${room.taskProgress}/${room.taskGoal}. Vivos: ${getAlivePlayers(room).length}.`;
    return reply(message, `🛸 ${status}\n${getRoster(room, room.status !== 'LOBBY')}`);
  }

  if (subcommand === 'cancelar') {
    if (room.ownerId !== actorId) return reply(message, 'Solo quien creó la sala puede cancelarla.');
    if (room.status !== 'LOBBY') return reply(message, 'No se puede cancelar la partida una vez iniciada.');
    rooms.delete(groupId);
    return reply(message, 'La sala fue cancelada.');
  }

  if (subcommand === 'reunion') {
    const player = getPlayer(room, actorId);
    if (!player?.alive || room.status !== 'ACCIONES') {
      return reply(message, 'Solo una persona viva puede convocar una reunión durante las acciones.');
    }
    return beginDiscussion(client, room);
  }

  if (subcommand === 'votacion') {
    if (room.status !== 'DISCUSION') return reply(message, 'No hay una discusión activa para votar.');
    room.status = 'VOTACION';
    room.votes = new Map();
    return sendGroup(
      client,
      room,
      `🗳️ *Votación abierta.* Vota en privado al bot con *!votar <número>*; usa *0* para abstenerte.\n\n` +
        `${getRoster(room, true)}\n\nCuando todos los vivos voten, se anunciará el resultado.`
    );
  }

  if (subcommand === 'resolver') {
    if (room.ownerId !== actorId || room.status !== 'VOTACION') {
      return reply(message, 'Solo quien creó la sala puede cerrar una votación abierta.');
    }
    return resolveVote(client, room);
  }

  return reply(
    message,
    'Comandos: *!amongus crear*, *unir*, *iniciar*, *estado*, *reunion*, *votacion*, *resolver*, *cancelar*, *perfil*, *ranking*, *temporada*, *tienda*, *comprar <ID>* y *equipar <ID>*.'
  );
}

async function resolveVote(client, room) {
  const counts = new Map();
  for (const targetId of room.votes.values()) {
    if (targetId) counts.set(targetId, (counts.get(targetId) || 0) + 1);
  }

  const highest = Math.max(0, ...counts.values());
  const top = [...counts.entries()].filter(([, count]) => count === highest && highest > 0);
  let result;
  if (top.length === 1) {
    const ejected = getPlayer(room, top[0][0]);
    if (ejected?.alive) {
      ejected.alive = false;
      if (ejected.role !== 'IMPOSTOR') {
        room.taskGoal -= TASKS_PER_CREWMATE - ejected.tasksCompleted;
      }
      result = `🚀 ${ejected.name} fue expulsado. Era ${ejected.role === 'IMPOSTOR' ? 'Impostor' : 'Tripulante'}.`;
    }
  }
  if (!result) result = '🤝 Empate o abstención: nadie fue expulsado.';

  if (await checkVictory(client, room)) return;
  room.round += 1;
  room.status = 'ACCIONES';
  room.impostorActionUsed = false;
  room.votes.clear();
  room.pendingBody = null;
  for (const player of room.players.values()) player.protectedThisRound = false;
  await sendGroup(client, room, `${result}\n\nRonda ${room.round}: continúan las acciones.`);
}

async function beginDiscussion(client, room) {
  if (room.status !== 'ACCIONES') return;
  if (room.killTimer) clearTimeout(room.killTimer);
  room.killTimer = null;
  const body = room.pendingBody ? getPlayer(room, room.pendingBody) : undefined;
  room.pendingBody = null;
  room.status = 'DISCUSION';

  const report = body
    ? `🚨 ${body.name} fue encontrado eliminado.`
    : '📣 *Reunión de emergencia.*';
  await sendGroup(
    client,
    room,
    `${report} Hablen en el grupo y luego escriban *!amongus votacion*.\n\n` +
      `Vivos:\n${getRoster(room, true)}`
  );
}

async function handleAction(client, message, action) {
  const actorId = getActorId(message);
  const args = getArguments(message);
  if (action !== 'reparar' && isGroupMessage(message)) {
    return reply(message, '🔒 Para mantener secreta tu acción, envíame ese comando por privado.');
  }
  const room = isGroupMessage(message)
    ? rooms.get(message.from)
    : getRoomForUser(actorId);
  const player = getPlayer(room, actorId);

  if (!room || !activeStates.has(room.status) || room.status === 'LOBBY') {
    return reply(message, 'No tienes una partida activa. Únete a una sala en un grupo con *!amongus unir*.');
  }
  if (!player) return reply(message, 'No formas parte de esta partida.');
  if (!player.alive) return reply(message, 'Estás eliminado y ya no puedes realizar acciones.');
  if (!['reparar', 'votar'].includes(action) && room.status !== 'ACCIONES') {
    return reply(message, 'Esta acción solo se puede realizar durante la fase de acciones.');
  }

  if (action === 'tarea') {
    if (player.role === 'IMPOSTOR') return reply(message, 'Los impostores no pueden completar tareas.');
    if (player.tasksCompleted >= TASKS_PER_CREWMATE) return reply(message, 'Ya completaste todas tus tareas.');
    if (player.pendingTask && args.length) {
      if (player.pendingTask.type === 'email' && Date.now() < player.pendingTask.readyAt) {
        const remaining = Math.ceil((player.pendingTask.readyAt - Date.now()) / 1000);
        return reply(message, `📧 El envío simulado sigue en proceso. Espera ${remaining} segundos y luego usa *!tarea listo*.`);
      }
      if (normalizeAnswer(args.join(' ')) !== player.pendingTask.answer) {
        return reply(message, '❌ Respuesta incorrecta. Inténtalo de nuevo con *!tarea <respuesta>*.');
      }
      player.pendingTask = null;
      player.tasksCompleted += 1;
      room.taskProgress += 1;
      await sendGroup(client, room, `✅ ${player.name} completó una tarea. Progreso: ${room.taskProgress}/${room.taskGoal}.`);
      if (await checkVictory(client, room)) return;
      return reply(message, `¡Correcto! Te quedan ${TASKS_PER_CREWMATE - player.tasksCompleted} tareas.`);
    }
    if (player.pendingTask) {
      if (player.pendingTask.type === 'email' && Date.now() >= player.pendingTask.readyAt) {
        return reply(message, '📧 El envío simulado terminó. Confírmalo con *!tarea listo*.');
      }
      return reply(message, `Tu tarea pendiente: ${player.pendingTask.question}\nResponde con *!tarea <respuesta>*.`);
    }
    if (args.length) return reply(message, 'Primero solicita una tarea con *!tarea*.');
    player.pendingTask = makeTaskChallenge();
    return reply(message, `🧩 Tu tarea: ${player.pendingTask.question}\nResponde con *!tarea <respuesta>*.`);
  }

  if (action === 'matar') {
    if (player.role !== 'IMPOSTOR') return reply(message, 'Solo los impostores pueden usar esa acción.');
    if (room.impostorActionUsed) return reply(message, 'Los impostores ya realizaron su acción esta ronda.');
    const target = resolveAliveTarget(room, args[0]);
    if (!target?.alive || target.role === 'IMPOSTOR') {
      return reply(message, `Elige un objetivo vivo de la lista privada:\n${getRoster(room, true)}\nUsa *!matar <número>*.`);
    }
    room.impostorActionUsed = true;
    if (target.protectedRound === room.round) {
      target.protectedRound = 0;
      await sendGroup(client, room, '🛡️ ¡Un ataque fue bloqueado por el médico! La partida continúa.');
      return reply(message, 'El objetivo estaba protegido; el ataque falló.');
    }
    target.alive = false;
    if (target.role !== 'IMPOSTOR') {
      room.taskGoal -= TASKS_PER_CREWMATE - target.tasksCompleted;
    }
    room.bodies.push(target.id);
    if (await checkVictory(client, room)) return;
    room.pendingBody = target.id;
    await sendGroup(
      client,
      room,
      '⚠️ Se detectó un incidente. La tripulación conserva 60 segundos para completar tareas; ' +
        'después se anunciará la reunión automáticamente.'
    );
    room.killTimer = setTimeout(() => {
      beginDiscussion(client, room).catch((error) => {
        console.error('❌ No se pudo iniciar la discusión tras el tiempo de acciones:', error);
      });
    }, POST_KILL_ACTION_WINDOW_MS);
    room.killTimer.unref?.();
    return reply(message, 'Acción realizada.');
  }

  if (action === 'proteger') {
    if (player.role !== 'DOCTOR') return reply(message, 'Solo el Médico puede proteger a alguien.');
    if (player.protectedThisRound) return reply(message, 'Ya usaste tu protección esta ronda.');
    const target = resolveAliveTarget(room, args[0]);
    if (!target?.alive) return reply(message, `Elige un jugador vivo:\n${getRoster(room, true)}`);
    target.protectedRound = room.round;
    player.protectedThisRound = true;
    return reply(message, `🛡️ Protegiste a ${target.name} durante esta ronda.`);
  }

  if (action === 'investigar') {
    if (player.role !== 'DETECTIVE') return reply(message, 'Solo el Detective puede investigar.');
    if (player.investigations >= 2) return reply(message, 'Ya realizaste tus dos investigaciones.');
    const target = resolveAliveTarget(room, args[0]);
    if (!target?.alive || target.id === player.id) return reply(message, `Elige otro jugador vivo:\n${getRoster(room, true)}`);
    player.investigations += 1;
    return reply(message, target.role === 'IMPOSTOR'
      ? '🔎 Encontraste indicios de que esa persona es impostora.'
      : '🔎 No encontraste indicios de que esa persona sea impostora.');
  }

  if (action === 'sabotear') {
    if (player.role !== 'IMPOSTOR') return reply(message, 'Solo un impostor puede iniciar un sabotaje.');
    if (room.impostorActionUsed) return reply(message, 'Los impostores ya realizaron su acción esta ronda.');
    if (room.sabotage) return reply(message, 'Ya hay un sabotaje en curso.');
    const sabotageType = normalizeAnswer(args[0]);
    const sabotageNames = { luces: 'las luces', reactor: 'el reactor', oxigeno: 'el oxígeno' };
    if (!sabotageNames[sabotageType]) return reply(message, 'Elige *luces*, *reactor* u *oxigeno*.');
    const puzzle = makePuzzle();
    room.sabotage = {
      type: sabotageType,
      puzzle,
      expiresAt: Date.now() + SABOTAGE_DURATION_MS
    };
    room.impostorActionUsed = true;
    await sendGroup(
      client,
      room,
      `🚨 *¡Sabotaje en ${sabotageNames[sabotageType]}!* Tripulación: resuelvan ${puzzle.question} y reparen con *!reparar <respuesta>* antes de 60 segundos.`
    );
    room.sabotageTimer = setTimeout(async () => {
      if (!room.sabotage || room.status === 'FINALIZADA') return;
      room.sabotage = null;
      await finishGame(client, room, 'IMPOSTOR', `La tripulación no reparó ${sabotageNames[sabotageType]} a tiempo.`);
    }, SABOTAGE_DURATION_MS);
    room.sabotageTimer.unref?.();
    return reply(message, `Sabotaje en ${sabotageNames[sabotageType]} iniciado.`);
  }

  if (action === 'reparar') {
    if (player.role === 'IMPOSTOR') return reply(message, 'No puedes reparar el sabotaje de tu equipo.');
    if (!room.sabotage) return reply(message, 'No hay ningún sabotaje que reparar.');
    if (!args.length) return reply(message, 'Resuelve el desafío y usa *!reparar <respuesta>*.');
    if (normalizeAnswer(args.join(' ')) !== room.sabotage.puzzle.answer) {
      return reply(message, 'Respuesta incorrecta; el sabotaje sigue activo.');
    }
    clearTimeout(room.sabotageTimer);
    room.sabotage = null;
    room.sabotageTimer = null;
    await sendGroup(client, room, `🧰 ${player.name} reparó el sabotaje. ¡La partida continúa!`);
    return;
  }

  if (action === 'votar') {
    if (isGroupMessage(message)) return reply(message, 'Para mantener tu voto secreto, envíame *!votar <número>* por privado.');
    if (room.status !== 'VOTACION') return reply(message, 'No hay una votación abierta.');
    const target = args[0] === '0' ? null : resolveAliveTarget(room, args[0]);
    if (args[0] !== '0' && !target?.alive) return reply(message, `Voto no válido. Elige un número de esta lista o 0 para abstenerte:\n${getRoster(room, true)}`);
    if (room.votes.has(player.id)) return reply(message, 'Ya registré tu voto en esta ronda.');
    room.votes.set(player.id, target?.id || null);
    await reply(message, '✅ Tu voto quedó registrado de forma privada.');
    const livingIds = getAlivePlayers(room).map((alive) => alive.id);
    if (livingIds.every((id) => room.votes.has(id))) await resolveVote(client, room);
    return;
  }
}

async function handle(client, message, action) {
  const [subcommand = 'ayuda', ...args] = getArguments(message);
  if (action === 'amongus') {
    if ([
      'crear', 'unir', 'iniciar', 'estado', 'cancelar', 'reunion', 'votacion',
      'resolver', 'perfil', 'ranking', 'temporada', 'tienda', 'comprar', 'equipar'
    ].includes(subcommand)) {
      return handleLobbyCommand(client, message, subcommand, args);
    }
    return reply(
      message,
      '🛸 *Among Chat*: *!amongus crear/unir/iniciar/estado/reunion/votacion/resolver/cancelar/perfil/ranking/temporada/tienda/comprar/equipar*, ' +
        '*!tarea*, *!matar*, *!sabotear*, *!proteger*, *!investigar*, *!reparar* y *!votar*.'
    );
  }
  return handleAction(client, message, action);
}

function resetForTests() {
  for (const room of rooms.values()) {
    if (room.sabotageTimer) clearTimeout(room.sabotageTimer);
    if (room.killTimer) clearTimeout(room.killTimer);
  }
  rooms.clear();
}

module.exports = { handle, resetForTests, rooms };
