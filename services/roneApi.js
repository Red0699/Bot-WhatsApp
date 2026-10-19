const axios = require('axios');

const DEFAULT_BASE_URL = 'https://arena.rone.dev';
const CACHE_TTL = 30 * 60 * 1000;
let heroNamesCache;
let heroNamesCacheExpiresAt = 0;
let itemsCache;
let itemsCacheExpiresAt = 0;

function getBaseUrl() {
  return (process.env.RONE_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function request(path, params = {}) {
  const response = await axios.get(`${getBaseUrl()}${path}`, {
    params,
    timeout: 20000
  });
  const payload = response.data;

  if (payload?.code !== 0) {
    throw new Error(payload?.message || 'La API de Rone devolvió una respuesta inválida.');
  }

  return payload.data || {};
}

function getRecords(result) {
  return Array.isArray(result?.records) ? result.records : [];
}

function normalizeRank(rank = 'all') {
  const normalized = rank.toLowerCase();
  const aliases = {
    leyenda: 'legend',
    mitico: 'mythic',
    mítico: 'mythic',
    honor: 'honor',
    gloria: 'glory',
    epico: 'epic',
    épico: 'epic',
    todos: 'all'
  };

  return aliases[normalized] || normalized;
}

async function getHero(identifier) {
  const result = await request(`/api/heroes/${encodeURIComponent(identifier)}`, {
    size: 1,
    lang: 'en'
  });
  return getRecords(result)[0];
}

async function getRankStatistics({ rank = 'all', days = '7', size = 5 } = {}) {
  return request('/api/heroes/rank', {
    rank: normalizeRank(rank),
    days,
    sort_field: 'win_rate',
    sort_order: 'desc',
    size,
    index: 1,
    lang: 'en'
  });
}

async function getHeroStatistics(identifier, rank = 'all') {
  return request(`/api/heroes/${encodeURIComponent(identifier)}/stats`, {
    rank: normalizeRank(rank),
    size: 1,
    lang: 'en'
  });
}

async function getHeroCounters(identifier, rank = 'all') {
  return request(`/api/heroes/${encodeURIComponent(identifier)}/counters`, {
    rank: normalizeRank(rank),
    size: 1,
    lang: 'en'
  });
}

async function getHeroCompatibility(identifier, rank = 'all') {
  return request(`/api/heroes/${encodeURIComponent(identifier)}/compatibility`, {
    rank: normalizeRank(rank),
    size: 1,
    lang: 'en'
  });
}

async function getHeroBuilds(identifier, lane, rank = 'all') {
  return request(`/api/academy/heroes/${encodeURIComponent(identifier)}/builds`, {
    lane,
    rank: normalizeRank(rank),
    size: 5,
    lang: 'en'
  });
}

async function getHeroTrends(identifier, rank = 'all') {
  return request(`/api/heroes/${encodeURIComponent(identifier)}/trends`, {
    rank: normalizeRank(rank),
    size: 5,
    lang: 'en'
  });
}

async function getItems() {
  if (itemsCache && Date.now() < itemsCacheExpiresAt) return itemsCache;

  const items = [];
  let index = 1;
  let total = 0;

  do {
    const page = await request('/api/academy/equipment', {
      size: 100,
      index,
      lang: 'en'
    });
    const records = getRecords(page);

    items.push(...records.map(record => record?.data || record));
    total = Number(page.total) || items.length;
    index += 1;
  } while (items.length < total && index <= 5);

  itemsCache = items;
  itemsCacheExpiresAt = Date.now() + CACHE_TTL;
  return items;
}

async function getHeroNamesById() {
  if (heroNamesCache && Date.now() < heroNamesCacheExpiresAt) return heroNamesCache;

  const names = new Map();
  let index = 1;
  let total = 0;

  do {
    const page = await request('/api/heroes', {
      size: 100,
      index,
      lang: 'en'
    });
    const records = getRecords(page);

    for (const record of records) {
      const data = record?.data || record;
      const hero = data?.hero?.data || data?.hero || {};
      const id = data?.hero_id ?? hero.heroid ?? hero.hero_id;
      const name = hero.name || data?.name;
      if (id !== undefined && name) names.set(String(id), name);
    }

    total = Number(page.total) || names.size;
    index += 1;
  } while (names.size < total && index <= 5);

  heroNamesCache = names;
  heroNamesCacheExpiresAt = Date.now() + CACHE_TTL;
  return names;
}

module.exports = {
  getHero,
  getRankStatistics,
  getHeroStatistics,
  getHeroCounters,
  getHeroCompatibility,
  getHeroBuilds,
  getHeroTrends,
  getItems,
  getHeroNamesById,
  getRecords,
  normalizeRank
};
