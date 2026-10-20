const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');

const commandsPath = path.join(__dirname, '..', 'commands');

function getCommandFiles(directory = commandsPath) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return getCommandFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.js')
        ? [path.relative(commandsPath, entryPath).split(path.sep).join('/')]
        : [];
    })
    .sort();
}

test('la corrección de whatsapp-web.js elimina el ID privado de medios y es idempotente', () => {
  const { patchMediaMessageId } = require('../scripts/patch-whatsapp-web-media-id');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'whatsapp-media-id-'));
  const utilsPath = path.join(directory, 'Utils.js');
  const anchor = "        // Bot's won't reply if canonicalUrl is set (linking)\n";
  fs.writeFileSync(utilsPath, `message.__x_id = 'media-id';\n${anchor}`);

  try {
    assert.equal(patchMediaMessageId(utilsPath), true);
    assert.equal(patchMediaMessageId(utilsPath), false);
    assert.equal(
      fs.readFileSync(utilsPath, 'utf8'),
      `message.__x_id = 'media-id';\n        delete message.__x_id;\n\n${anchor}`
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('la corrección de whatsapp-web.js falla explícitamente si cambia el código de origen', () => {
  const { patchMediaMessageId } = require('../scripts/patch-whatsapp-web-media-id');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'whatsapp-media-id-'));
  const utilsPath = path.join(directory, 'Utils.js');
  fs.writeFileSync(utilsPath, 'unexpected source');

  try {
    assert.throws(patchMediaMessageId.bind(null, utilsPath), /punto de inserción/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createHarness({ body = '', from = '12345@g.us', author, mentionedIds = [] } = {}) {
  const replies = [];
  const sent = [];
  const client = {
    async sendMessage(...args) {
      sent.push(args);
    },
    async getChatById(id) {
      return {
        id: { _serialized: id },
        name: 'Grupo de prueba',
        isGroup: true,
        participants: [{ id: { _serialized: '67890@lid' } }]
      };
    },
    async getContactById(id) {
      return { id: { _serialized: id }, number: id.split('@')[0] };
    }
  };
  const message = {
    body,
    from,
    author,
    mentionedIds,
    fromMe: false,
    _data: { notifyName: 'Jugador' },
    async reply(text) {
      replies.push(text);
    },
    async getChat() {
      throw new Error('Este comando no debería consultar message.getChat()');
    },
    async getContact() {
      return { id: { _serialized: author || from }, number: '67890' };
    }
  };

  return { client, message, replies, sent };
}

async function withModuleStub(request, exports, callback) {
  const resolvedPath = require.resolve(request);
  const previousModule = require.cache[resolvedPath];
  const mockedModule = new Module(resolvedPath);
  mockedModule.filename = resolvedPath;
  mockedModule.loaded = true;
  mockedModule.exports = exports;
  require.cache[resolvedPath] = mockedModule;

  try {
    return await callback();
  } finally {
    if (previousModule) {
      require.cache[resolvedPath] = previousModule;
    } else {
      delete require.cache[resolvedPath];
    }
  }
}

async function runCommand(file, options = {}) {
  const commandPath = path.join(commandsPath, file);
  delete require.cache[commandPath];
  const command = require(commandPath);
  const harness = createHarness({ body: command.name, ...options });
  await command.execute(harness.client, harness.message);
  return harness;
}

test('detecta todas las palabras prohibidas sin importar mayúsculas, tildes o puntuación', async (t) => {
  const palabrasProhibidas = require('../utils/palabrasClave');
  const { detectarPalabraProhibida } = require('../utils/wordFilter');

  for (const palabra of palabrasProhibidas) {
    await t.test(palabra, () => {
      const variante = palabra
        .replace(/[aá]/gi, 'Á')
        .replace(/[eé]/gi, 'É')
        .replace(/[ií]/gi, 'Í')
        .replace(/[oó]/gi, 'Ó')
        .replace(/[uú]/gi, 'Ú')
        .toUpperCase();

      assert.ok(detectarPalabraProhibida(`Mensaje: ¡${variante}!!!`));
    });
  }
});

test('detecta expresiones con espacios variables y evita coincidencias parciales', () => {
  const { detectarPalabraProhibida } = require('../utils/wordFilter');

  assert.ok(detectarPalabraProhibida('¡COMA   MIERDA!'));
  assert.ok(detectarPalabraProhibida('pirobo, hijueputa'));
  assert.equal(detectarPalabraProhibida('perrazo'), undefined);
  assert.equal(detectarPalabraProhibida('mensaje normal'), undefined);
});

test('el filtro alerta en grupos con IDs @lid y no depende de getChat', async () => {
  const registerMessageEvents = require('../events/messages');
  const { sent } = createHarness();
  let handler;
  const client = {
    on(event, callback) {
      if (event === 'message') handler = callback;
    },
    async sendMessage(...args) {
      sent.push(args);
    }
  };
  registerMessageEvents(client);

  await handler({
    body: 'Ese ESTÚPIDO!',
    from: '12345@g.us',
    author: '67890@lid',
    fromMe: false
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '12345@g.us');
  assert.match(sent[0][1], /ESTÚPIDO/);
  assert.deepEqual(sent[0][2].mentions, ['573214663210@c.us', '67890@lid']);
});

test('el filtro no alerta por mensajes privados ni mensajes propios', async () => {
  const registerMessageEvents = require('../events/messages');
  let handler;
  const sent = [];
  registerMessageEvents({
    on(event, callback) {
      if (event === 'message') handler = callback;
    },
    async sendMessage(...args) {
      sent.push(args);
    }
  });

  await handler({ body: 'maldito', from: '12345@c.us', fromMe: false });
  await handler({ body: 'maldito', from: '12345@g.us', author: 'bot@c.us', fromMe: true });

  assert.equal(sent.length, 0);
});

test('group_join envía la bienvenida desde el chat de grupo sin consultar contactos', async () => {
  const registerGroupJoin = require('../events/groupJoin');
  let handler;
  const sent = [];
  const groupId = '12345@g.us';
  registerGroupJoin({
    on(event, callback) {
      if (event === 'group_join') handler = callback;
    },
    async getContactById() {
      throw new Error('No debería consultar contactos');
    },
    async getChatById() {
      throw new Error('No debería convertir el grupo a un modelo Chat');
    },
    async sendMessage(...args) {
      sent.push(args);
    }
  });
  const notification = {
    chatId: groupId,
    recipientIds: ['67890@lid'],
    async getChat() {
      throw new Error('No debería consultar notification.getChat()');
    },
    async reply() {
      throw new Error('La bienvenida debe enviar al ID explícito del grupo');
    }
  };

  await handler(notification);

  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '12345@g.us');
  assert.equal(sent[0][1].mimetype, 'image/webp');
  assert.match(sent[0][2].caption, /¡Bienvenido\(a\) al grupo/);
  assert.equal(sent[0][2].mentions, undefined);
});

test('group_join usa el ID remoto cuando chatId no está disponible', async () => {
  const registerGroupJoin = require('../events/groupJoin');
  let handler;
  const sent = [];
  registerGroupJoin({
    on(event, callback) {
      if (event === 'group_join') handler = callback;
    },
    async sendMessage(...args) {
      sent.push(args);
    }
  });

  await handler({
    id: { remote: { _serialized: '54321@g.us' } },
    recipientIds: ['67890@lid']
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '54321@g.us');
  assert.equal(sent[0][1].mimetype, 'image/webp');
  assert.match(sent[0][2].caption, /¡Bienvenido\(a\) al grupo/);
});

test('group_join recurre a texto y no reintenta si WhatsApp rechaza la imagen', async () => {
  const registerGroupJoin = require('../events/groupJoin');
  let handler;
  let attempts = 0;
  const sent = [];
  const originalConsoleError = console.error;

  registerGroupJoin({
    on(event, callback) {
      if (event === 'group_join') handler = callback;
    },
    async sendMessage(...args) {
      if (args[1]?.mimetype) {
        attempts += 1;
        throw new Error('WhatsApp Web no pudo enviar la imagen');
      }
      sent.push(args);
    }
  });
  console.error = () => {};

  try {
    await handler({
      chatId: '12345@g.us',
      async reply() {
        throw new Error('No se debe usar reply');
      }
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(attempts, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '12345@g.us');
  assert.match(sent[0][1], /¡Bienvenido\(a\) al grupo/);
});

test('group_leave envía la despedida con imagen si alguien sale o es retirado', async () => {
  const registerGroupLeave = require('../events/groupLeave');
  let handler;
  const sent = [];
  registerGroupLeave({
    on(event, callback) {
      if (event === 'group_leave') handler = callback;
    },
    async sendMessage(...args) {
      sent.push(args);
    }
  });

  await handler({
    chatId: '12345@g.us',
    type: 'leave',
    recipientIds: ['67890@lid']
  });
  await handler({
    id: { remote: { _serialized: '12345@g.us' } },
    type: 'remove',
    recipientIds: ['67890@lid']
  });

  assert.equal(sent.length, 2);
  assert.equal(sent[0][0], '12345@g.us');
  assert.equal(sent[0][1].mimetype, 'image/png');
  assert.match(sent[0][2].caption, /Un integrante ha abandonado el grupo/);
  assert.match(sent[1][2].caption, /Un integrante ha sido expulsado del grupo/);
});

test('group_leave envía el texto de despedida si falla la imagen', async () => {
  const registerGroupLeave = require('../events/groupLeave');
  let handler;
  const sent = [];
  const originalConsoleError = console.error;
  registerGroupLeave({
    on(event, callback) {
      if (event === 'group_leave') handler = callback;
    },
    async sendMessage(...args) {
      if (args[1]?.mimetype) throw new Error('WhatsApp Web no pudo enviar la imagen');
      sent.push(args);
    }
  });
  console.error = () => {};

  try {
    await handler({ chatId: '12345@g.us', type: 'leave', recipientIds: ['67890@lid'] });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '12345@g.us');
  assert.match(sent[0][1], /ha abandonado el grupo/);
});

test('el registro de eventos declara explícitamente los eventos del cliente', () => {
  const registerEvents = require('../events');
  const registeredEvents = [];
  registerEvents({
    on(event) {
      registeredEvents.push(event);
    }
  });

  assert.deepEqual(registeredEvents.sort(), [
    'auth_failure',
    'authenticated',
    'change_state',
    'disconnected',
    'group_join',
    'group_leave',
    'loading_screen',
    'message',
    'qr',
    'ready'
  ]);
});

test('todos los comandos disponibles cargan y responden', async (t) => {
  const commandFiles = getCommandFiles();
  const expectedCommands = [
    'adivinanza/adivinanza.js', 'adivinanza/pista.js', 'adivinanza/rendirse.js',
    'adivinanza/respuestaAdivinanza.js', 'ahorcado/ahorcado.js', 'ahorcado/letra.js',
    'among-chat/amongus.js', 'among-chat/investigar.js', 'among-chat/matar.js',
    'among-chat/proteger.js', 'among-chat/reparar.js', 'among-chat/sabotear.js',
    'among-chat/tarea.js', 'among-chat/votar.js', 'audio.js', 'chiste.js', 'composicion.js',
    'gemini.js', 'grupo.js', 'help.js', 'hola.js', 'jugada.js', 'ppt.js', 'presentate.js',
    'rone-api/heroe.js', 'rone-api/mlbuild.js', 'rone-api/mlcompat.js',
    'rone-api/mlcounters.js', 'rone-api/mlitems.js', 'rone-api/mlrank.js',
    'rone-api/mlstats.js', 'rone-api/mltendencias.js', 'tagall.js'
  ].sort();

  assert.deepEqual(commandFiles, expectedCommands);

  await t.test('!adivinanza', async () => {
    const result = await runCommand('adivinanza/adivinanza.js');
    assert.match(result.replies[0], /¡Adivinanza!/);
  });

  await t.test('!ahorcado', async () => {
    const result = await runCommand('ahorcado/ahorcado.js');
    assert.match(result.replies[0], /Nuevo juego de Ahorcado/);
  });

  await t.test('!audio', async () => {
    await withModuleStub('../services/youtubeSearch', {
      searchYouTube: async query => [{
        title: `Resultado para ${query}`,
        channel: 'Canal de prueba',
        duration: '',
        url: 'https://www.youtube.com/watch?v=abcdefghijk'
      }]
    }, async () => {
      const result = await runCommand('audio.js', { body: '!audio música clásica' });
      assert.equal(result.replies.length, 1);
      assert.match(result.replies[0], /Resultado para música clásica/);
      assert.match(result.replies[0], /Canal de prueba/);
      assert.match(result.replies[0], /youtube\.com\/watch/);
    });
  });

  await t.test('!audio comparte enlaces de YouTube sin descargar audio', async () => {
    await withModuleStub('../services/youtubeSearch', {
      searchYouTube: async () => [{
        title: 'Video de YouTube',
        channel: 'Abre el enlace para ver los detalles',
        duration: '',
        url: 'https://www.youtube.com/watch?v=abcdefghijk'
      }]
    }, async () => {
      const result = await runCommand('audio.js', {
        body: '!audio https://youtu.be/abcdefghijk'
      });
      assert.equal(result.sent.length, 0);
      assert.match(result.replies[0], /youtube\.com\/watch\?v=abcdefghijk/);
    });
  });

  await t.test('!chiste', async () => {
    await withModuleStub('../services/chistesApi', {
      getChiste: async () => 'Chiste de prueba'
    }, async () => {
      const result = await runCommand('chiste.js');
      assert.match(result.replies[0], /Chiste de prueba/);
    });
  });

  await t.test('!composicion', async () => {
    const result = await runCommand('composicion.js');
    assert.match(result.replies[0], /Gold Lane/);
    assert.match(result.replies[0], /Roam/);
  });

  await t.test('!gemini', async () => {
    await withModuleStub('../services/geminiService', {
      getGeminiResponse: async prompt => `Respuesta a ${prompt}`
    }, async () => {
      const result = await runCommand('gemini.js', { body: '!gemini prueba' });
      assert.equal(result.replies[0], 'Respuesta a prueba');
    });
  });

  await t.test('!grupo', async () => {
    const result = await runCommand('grupo.js');
    assert.match(result.replies[0], /Grupo de prueba/);
  });

  await t.test('!grupo recupera los datos almacenados si falla la consulta del chat', async () => {
    const command = require('../commands/grupo');
    const replies = [];
    const message = {
      body: '!grupo',
      from: '12345@g.us',
      async reply(text) {
        replies.push(text);
      }
    };
    const client = {
      async getChatById() {
        throw new Error('No se pudo actualizar el grupo');
      },
      pupPage: {
        async evaluate(callback, chatId) {
          assert.equal(chatId, message.from);
          return { name: 'Grupo en caché', participantCount: 4 };
        }
      }
    };

    await command.execute(client, message);
    assert.match(replies[0], /Grupo en caché/);
    assert.match(replies[0], /4 participantes/);
  });

  await t.test('!help', async () => {
    const result = await runCommand('help.js');
    assert.match(result.replies[0], /!ppt/);
    assert.match(result.replies[0], /!presentate/);
    assert.match(result.replies[0], /!amongus/);
  });

  await t.test('!heroe', async () => {
    const axios = require('axios');
    const originalGet = axios.get;
    axios.get = async () => ({
      data: Buffer.from('image-data'),
      headers: { 'content-type': 'image/png; charset=binary' }
    });

    try {
      await withModuleStub('../services/roneApi', {
        getHero: async () => ({
          data: {
            hero: {
              data: {
                name: 'Pharsa',
                head: 'https://example.com/pharsa.png',
                sortlabel: ['Mage'],
                roadsortlabel: ['Mid Lane'],
                speciality: ['Burst'],
                story: 'Crow Princess'
              }
            }
          }
        })
      }, async () => {
        const result = await runCommand('rone-api/heroe.js', { body: '!heroe Pharsa' });
        assert.equal(result.sent.length, 1);
        assert.equal(result.sent[0][1].mimetype, 'image/png');
        assert.equal(result.sent[0][1].data, Buffer.from('image-data').toString('base64'));
        assert.match(result.sent[0][2].caption, /Pharsa/);
        assert.match(result.sent[0][2].caption, /Mid Lane/);
      });
    } finally {
      axios.get = originalGet;
    }
  });

  await t.test('!mlrank muestra los mejores héroes y sus tasas', async () => {
    await withModuleStub('../services/roneApi', {
      normalizeRank: value => value,
      getRankStatistics: async () => ({
        records: [{
          data: {
            main_hero: { data: { name: 'Pharsa' } },
            main_hero_win_rate: 0.6,
            main_hero_appearance_rate: 0.2,
            main_hero_ban_rate: 0.1
          }
        }]
      })
    }, async () => {
      const result = await runCommand('rone-api/mlrank.js', { body: '!mlrank mythic' });
      assert.match(result.replies[0], /Pharsa/);
      assert.match(result.replies[0], /60\.00%/);
    });
  });

  await t.test('!mlcounters y !mlcompat muestran nombres asociados a sus héroes', async () => {
    await withModuleStub('../services/roneApi', {
      normalizeRank: value => value,
      getHeroCounters: async () => ({
        records: [{
          data: {
            main_hero: { data: { name: 'Pharsa' } },
            sub_hero: [{ heroid: 10, hero_win_rate: 0.55, increase_win_rate: 0.03 }]
          }
        }]
      }),
      getHeroCompatibility: async () => ({
        records: [{
          data: {
            main_hero: { data: { name: 'Pharsa' } },
            sub_hero: [{ heroid: 10, hero_win_rate: 0.55, increase_win_rate: 0.03 }]
          }
        }]
      }),
      getHeroNamesById: async () => new Map([['10', 'Franco']])
    }, async () => {
      const counterResult = await runCommand('rone-api/mlcounters.js', { body: '!mlcounters Pharsa' });
      assert.match(counterResult.replies[0], /Franco/);

      const compatibilityResult = await runCommand('rone-api/mlcompat.js', { body: '!mlcompat Pharsa' });
      assert.match(compatibilityResult.replies[0], /Franco/);
    });
  });

  await t.test('!mlitems permite buscar un objeto', async () => {
    await withModuleStub('../services/roneApi', {
      getItems: async () => [
        { equipname: 'Magic Shoes', equipid: 1 },
        { equipname: 'Warrior Boots', equipid: 2 }
      ]
    }, async () => {
      const result = await runCommand('rone-api/mlitems.js', { body: '!mlitems magic' });
      assert.match(result.replies[0], /Magic Shoes/);
      assert.doesNotMatch(result.replies[0], /Warrior Boots/);
    });
  });

  await t.test('!mlbuild muestra la build asociada a la línea solicitada', async () => {
    await withModuleStub('../services/roneApi', {
      normalizeRank: value => value,
      getHeroBuilds: async () => ({
        records: [{
          data: {
            hero_name: 'Pharsa',
            build: [{
              equipid: [1, 2],
              build_win_rate: 0.54,
              build_pick_rate: 0.08
            }]
          }
        }]
      }),
      getItems: async () => [
        { equipid: 1, equipname: 'Magic Shoes' },
        { equipid: 2, equipname: 'Holy Crystal' }
      ],
      getHero: async () => null
    }, async () => {
      const result = await runCommand('rone-api/mlbuild.js', { body: '!mlbuild Pharsa mid' });
      assert.match(result.replies[0], /Magic Shoes → Holy Crystal/);
      assert.match(result.replies[0], /Mid Lane/);
    });
  });

  await t.test('!mlstats y !mltendencias muestran datos recientes del héroe', async () => {
    await withModuleStub('../services/roneApi', {
      normalizeRank: value => value,
      getHeroStatistics: async () => ({
        records: [{
          data: {
            main_hero: { data: { name: 'Pharsa' } },
            main_hero_win_rate: 0.51,
            main_hero_appearance_rate: 0.04,
            main_hero_ban_rate: 0.02
          }
        }]
      }),
      getHeroTrends: async () => ({
        records: [{ data: { win_rate: 0.52 } }]
      }),
      getHero: async () => ({
        data: { hero: { data: { name: 'Pharsa' } } }
      })
    }, async () => {
      const stats = await runCommand('rone-api/mlstats.js', { body: '!mlstats Pharsa mythic' });
      assert.match(stats.replies[0], /51\.00%/);

      const trends = await runCommand('rone-api/mltendencias.js', { body: '!mltendencias Pharsa' });
      assert.match(trends.replies[0], /52\.00%/);
    });
  });

  await t.test('!hola', async () => {
    const result = await runCommand('hola.js');
    assert.match(result.replies[0], /¡Hola!/);
  });

  await t.test('!jugada', async () => {
    const matches = require('../utils/pptMatches');
    const groupId = 'game-jugada@g.us';
    const player1 = '11111@lid';
    const player2 = '22222@lid';
    matches.startMatch(groupId, player1, player2);

    const first = await runCommand('jugada.js', {
      body: '!jugada piedra',
      from: player1
    });
    assert.match(first.replies[0], /Esperando al otro jugador/);

    const second = await runCommand('jugada.js', {
      body: '!jugada tijera',
      from: player2
    });
    assert.equal(second.sent[0][0], groupId);
    assert.deepEqual(second.sent[0][2].mentions, [player1, player2]);
    matches.deleteMatch(groupId);
  });

  await t.test('!letra', async () => {
    const { iniciarJuego } = require('../utils/ahorcadoManager');
    const chatId = 'game-letra@g.us';
    iniciarJuego(chatId);
    const result = await runCommand('ahorcado/letra.js', {
      body: '!letra 1',
      from: chatId
    });
    assert.match(result.replies[0], /Letra incorrecta/);
  });

  await t.test('!pista', async () => {
    const { iniciarAdivinanza } = require('../utils/adivinanzaManager');
    iniciarAdivinanza('game-pista@g.us');
    const result = await runCommand('adivinanza/pista.js', {
      from: 'game-pista@g.us'
    });
    assert.ok(result.replies.length > 0);
  });

  await t.test('!ppt', async () => {
    const groupId = 'game-ppt@g.us';
    const player1 = '11112@lid';
    const player2 = '22223@lid';
    const result = await runCommand('ppt.js', {
      from: groupId,
      author: player1,
      mentionedIds: [player2]
    });
    assert.match(result.sent[0][1], /Partida iniciada/);
    assert.deepEqual(result.sent[0][2].mentions, [player1, player2]);
  });

  await t.test('!presentate', async () => {
    const result = await runCommand('presentate.js');
    assert.match(result.replies[0], /Me alegra estar aquí/);
  });

  await t.test('!rendirse', async () => {
    const { iniciarAdivinanza } = require('../utils/adivinanzaManager');
    const chatId = 'game-rendirse@g.us';
    iniciarAdivinanza(chatId);
    const result = await runCommand('adivinanza/rendirse.js', { from: chatId });
    assert.match(result.replies[0], /Te rendiste/);
  });

  await t.test('!respuesta', async () => {
    await withModuleStub('../utils/adivinanzaManager', {
      juegoActivo: () => true,
      verificarRespuesta: () => true
    }, async () => {
      const result = await runCommand('adivinanza/respuestaAdivinanza.js', {
        body: '!respuesta respuesta',
        from: 'game-respuesta@g.us'
      });
      assert.match(result.replies[0], /Correcto/);
    });
  });

  await t.test('!todos', async () => {
    const command = require('../commands/tagall');
    const sent = [];
    const replies = [];
    const message = {
      body: '!todos',
      from: '12345@g.us',
      async reply(text) {
        replies.push(text);
      }
    };
    const client = {
      async getChatById() {
        throw new Error('!todos no debe cargar el chat');
      },
      async getContactById() {
        throw new Error('!todos no debe cargar los contactos');
      },
      async sendMessage(...args) {
        sent.push(args);
      }
    };

    await command.execute(client, message);
    assert.equal(replies.length, 0);
    assert.equal(sent.length, 1);
    assert.match(sent[0][1], /Atención a todos/);
    assert.match(sent[0][1], /@all/);
    assert.equal(sent[0][2].mentions, undefined);
    assert.equal(sent[0][2].extra.nonJidMentions, 1);
  });
});
