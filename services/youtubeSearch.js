const axios = require('axios');

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const API_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be'
]);

function getVideoId(input) {
  const value = input.trim();
  if (VIDEO_ID_PATTERN.test(value)) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  let videoId;
  if (url.hostname.endsWith('youtu.be')) {
    videoId = url.pathname.split('/').filter(Boolean)[0];
  } else {
    videoId = url.searchParams.get('v');
    if (!videoId) {
      videoId = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})(?:\/|$)/)?.[1];
    }
  }

  return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

async function searchYouTube(input) {
  const query = input.trim();
  const isUrl = /^https?:\/\//i.test(query);
  const videoId = getVideoId(query);

  if (isUrl) {
    if (!videoId) return [];
    return [{
      title: 'Video de YouTube',
      channel: 'Abre el enlace para ver los detalles',
      duration: '',
      url: `https://www.youtube.com/watch?v=${videoId}`
    }];
  }

  if (!query) return [];
  if (VIDEO_ID_PATTERN.test(query)) {
    return [{
      title: 'Video de YouTube',
      channel: 'Abre el enlace para ver los detalles',
      duration: '',
      url: `https://www.youtube.com/watch?v=${query}`
    }];
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('Falta configurar YOUTUBE_API_KEY en el archivo .env.');
  }

  const response = await axios.get(API_URL, {
    params: {
      part: 'snippet',
      type: 'video',
      maxResults: 1,
      q: query,
      key: apiKey
    },
    timeout: 15000
  });

  const firstResult = response.data.items?.[0];
  const resultVideoId = firstResult?.id?.videoId;

  if (!resultVideoId || !VIDEO_ID_PATTERN.test(resultVideoId)) return [];

  return [{
    title: firstResult.snippet?.title || 'Video de YouTube',
    channel: firstResult.snippet?.channelTitle || 'Canal desconocido',
    duration: '',
    url: `https://www.youtube.com/watch?v=${resultVideoId}`
  }];
}

module.exports = { searchYouTube };
