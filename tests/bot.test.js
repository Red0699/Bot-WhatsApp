const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');

const commandsPath = path.join(__dirname, '..', 'commands');

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

test('todos los comandos disponibles cargan y responden', async (t) => {
  const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'))
    .sort();
  const expectedCommands = [
    'adivinanza.js', 'ahorcado.js', 'chiste.js', 'composicion.js', 'gemini.js',
    'grupo.js', 'help.js', 'heroe.js', 'hola.js', 'jugada.js', 'letra.js',
    'pista.js', 'ppt.js', 'presentate.js', 'rendirse.js',
    'respuestaAdivinanza.js', 'tagall.js'
  ].sort();

  assert.deepEqual(commandFiles, expectedCommands);

  await t.test('!adivinanza', async () => {
    const result = await runCommand('adivinanza.js');
    assert.match(result.replies[0], /¡Adivinanza!/);
  });

  await t.test('!ahorcado', async () => {
    const result = await runCommand('ahorcado.js');
    assert.match(result.replies[0], /Nuevo juego de Ahorcado/);
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

  await t.test('!help', async () => {
    const result = await runCommand('help.js');
    assert.match(result.replies[0], /!ppt/);
    assert.match(result.replies[0], /!presentate/);
  });

  await t.test('!heroe', async () => {
    const { MessageMedia } = require('whatsapp-web.js');
    const originalFromUrl = MessageMedia.fromUrl;
    MessageMedia.fromUrl = async () => ({ testMedia: true });

    try {
      const result = await runCommand('heroe.js', { body: '!heroe Pharsa' });
      assert.equal(result.sent.length, 1);
      assert.match(result.sent[0][2].caption, /Pharsa/);
    } finally {
      MessageMedia.fromUrl = originalFromUrl;
    }
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
    const result = await runCommand('letra.js', {
      body: '!letra 1',
      from: chatId
    });
    assert.match(result.replies[0], /Letra incorrecta/);
  });

  await t.test('!pista', async () => {
    const { iniciarAdivinanza } = require('../utils/adivinanzaManager');
    iniciarAdivinanza('game-pista@g.us');
    const result = await runCommand('pista.js', {
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
    const result = await runCommand('rendirse.js', { from: chatId });
    assert.match(result.replies[0], /Te rendiste/);
  });

  await t.test('!respuesta', async () => {
    await withModuleStub('../utils/adivinanzaManager', {
      juegoActivo: () => true,
      verificarRespuesta: () => true
    }, async () => {
      const result = await runCommand('respuestaAdivinanza.js', {
        body: '!respuesta respuesta',
        from: 'game-respuesta@g.us'
      });
      assert.match(result.replies[0], /Correcto/);
    });
  });

  await t.test('!todos', async () => {
    const result = await runCommand('tagall.js');
    assert.equal(result.sent.length, 1);
    assert.match(result.sent[0][1], /Atención todos/);
    assert.equal(result.sent[0][2].mentions.length, 1);
  });
});
