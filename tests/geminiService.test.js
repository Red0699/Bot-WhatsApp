const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const servicePath = path.join(__dirname, '..', 'services', 'geminiService.js');
const axiosPath = require.resolve('axios');

async function withAxiosStub(axios, callback) {
  const previousAxios = require.cache[axiosPath];
  const previousService = require.cache[servicePath];
  const mockedAxios = new Module(axiosPath);
  mockedAxios.filename = axiosPath;
  mockedAxios.loaded = true;
  mockedAxios.exports = axios;
  require.cache[axiosPath] = mockedAxios;
  delete require.cache[servicePath];

  try {
    return await callback(require(servicePath));
  } finally {
    if (previousAxios) {
      require.cache[axiosPath] = previousAxios;
    } else {
      delete require.cache[axiosPath];
    }

    if (previousService) {
      require.cache[servicePath] = previousService;
    } else {
      delete require.cache[servicePath];
    }
  }
}

test('getGeminiResponse usa el modelo actual y envía la clave en el encabezado', async () => {
  const previousApiKey = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = 'test-api-key';
  let request;

  try {
    await withAxiosStub({
      async post(...args) {
        request = args;
        return {
          data: {
            candidates: [{ content: { parts: [{ text: 'Respuesta' }] } }]
          }
        };
      }
    }, async ({ getGeminiResponse }) => {
      assert.equal(await getGeminiResponse('Hola'), 'Respuesta');
    });
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }

  assert.equal(
    request[0],
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
  );
  assert.deepEqual(request[1], {
    contents: [{ parts: [{ text: 'Hola' }] }]
  });
  assert.equal(request[2].headers['X-goog-api-key'], 'test-api-key');
});

test('getGeminiResponse informa si falta la clave de API', async () => {
  const previousApiKey = process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  try {
    await withAxiosStub({
      async post() {
        assert.fail('No debe llamar a la API sin clave');
      }
    }, async ({ getGeminiResponse }) => {
      await assert.rejects(
        getGeminiResponse('Hola'),
        /Falta configurar GOOGLE_API_KEY/
      );
    });
  } finally {
    if (previousApiKey !== undefined) {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }
});

test('getGeminiResponse reintenta errores temporales del servicio', async () => {
  const previousApiKey = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = 'test-api-key';
  let attempts = 0;

  try {
    await withAxiosStub({
      async post() {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error('Alta demanda');
          error.response = { status: 503 };
          throw error;
        }

        return {
          data: {
            candidates: [{ content: { parts: [{ text: 'Respuesta' }] } }]
          }
        };
      }
    }, async ({ getGeminiResponse }) => {
      assert.equal(await getGeminiResponse('Hola'), 'Respuesta');
    });
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }

  assert.equal(attempts, 2);
});

test('getGeminiResponse no reintenta errores que no son temporales', async () => {
  const previousApiKey = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = 'test-api-key';
  const error = new Error('Solicitud inválida');
  error.response = { status: 400 };
  let attempts = 0;

  try {
    await withAxiosStub({
      async post() {
        attempts += 1;
        throw error;
      }
    }, async ({ getGeminiResponse }) => {
      await assert.rejects(getGeminiResponse('Hola'), error);
    });
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }

  assert.equal(attempts, 1);
});
