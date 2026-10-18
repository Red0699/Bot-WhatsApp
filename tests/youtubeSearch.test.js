const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const servicePath = path.join(__dirname, '..', 'services', 'youtubeSearch.js');
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

test('searchYouTube devuelve la URL del primer resultado de la API oficial', async () => {
  const previousApiKey = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = 'test-youtube-key';
  let request;

  try {
    await withAxiosStub({
      async get(...args) {
        request = args;
        return {
          data: {
            items: [
              {
                id: { videoId: 'abcdefghijk' },
                snippet: { title: 'Canción encontrada', channelTitle: 'Canal musical' }
              },
              {
                id: { videoId: 'lmnopqrstuv' },
                snippet: { title: 'Segundo resultado', channelTitle: 'Otro canal' }
              }
            ]
          }
        };
      }
    }, async ({ searchYouTube }) => {
      assert.deepEqual(await searchYouTube('canción de prueba'), [{
        title: 'Canción encontrada',
        channel: 'Canal musical',
        duration: '',
        url: 'https://www.youtube.com/watch?v=abcdefghijk'
      }]);
    });
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.YOUTUBE_API_KEY;
    } else {
      process.env.YOUTUBE_API_KEY = previousApiKey;
    }
  }

  assert.equal(request[0], 'https://www.googleapis.com/youtube/v3/search');
  assert.deepEqual(request[1].params, {
    part: 'snippet',
    type: 'video',
    maxResults: 1,
    q: 'canción de prueba',
    key: 'test-youtube-key'
  });
});

test('searchYouTube convierte enlaces válidos en enlaces canónicos sin usar la API', async () => {
  const { searchYouTube } = require(servicePath);
  const results = await searchYouTube('https://youtu.be/abcdefghijk?t=15');

  assert.deepEqual(results, [{
    title: 'Video de YouTube',
    channel: 'Abre el enlace para ver los detalles',
    duration: '',
    url: 'https://www.youtube.com/watch?v=abcdefghijk'
  }]);
});

test('searchYouTube rechaza URL que no es de YouTube', async () => {
  const { searchYouTube } = require(servicePath);
  assert.deepEqual(await searchYouTube('https://example.com/video'), []);
});

test('searchYouTube informa cuando falta la clave de API para buscar por nombre', async () => {
  const previousApiKey = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const { searchYouTube } = require(servicePath);
    await assert.rejects(
      searchYouTube('canción de prueba'),
      /Falta configurar YOUTUBE_API_KEY/
    );
  } finally {
    if (previousApiKey !== undefined) {
      process.env.YOUTUBE_API_KEY = previousApiKey;
    }
  }
});
