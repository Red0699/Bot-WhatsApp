const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

function unwrapRecord(record) {
  return record?.data || record || {};
}

function recordsFrom(result) {
  return Array.isArray(result?.records) ? result.records : [];
}

function heroData(record) {
  const data = unwrapRecord(record);
  return data?.hero?.data || data?.hero || data;
}

function heroName(record) {
  const data = unwrapRecord(record);
  return data?.main_hero?.data?.name
    || data?.hero?.data?.name
    || data?.hero_name
    || data?.name
    || 'Héroe';
}

function heroImage(record) {
  const data = unwrapRecord(record);
  const hero = data?.main_hero?.data || data?.hero?.data || data?.hero || data;
  return hero?.head || hero?.squarehead || hero?.painting || data?.head || data?.head_big;
}

function percent(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${(numericValue * 100).toFixed(2)}%` : 'N/D';
}

function cleanText(value, fallback = 'Sin datos') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

async function replyWithImage(client, message, imageUrl, caption) {
  if (!/^https?:\/\//i.test(imageUrl || '')) {
    return message.reply(caption);
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024
    });
    const mimeType = String(response.headers['content-type'] || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();

    if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(mimeType)) {
      throw new Error(`La respuesta no es una imagen compatible (${mimeType || 'MIME desconocido'}).`);
    }

    const data = Buffer.from(response.data);
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length);
    const media = new MessageMedia(mimeType, data.toString('base64'), `hero.${extension}`, data.length);
    await client.sendMessage(message.from, media, { caption });
  } catch (error) {
    console.error('No se pudo cargar la imagen de Rone API:', error.message);
    await message.reply(caption);
  }
}

function rankName(rank) {
  const names = {
    all: 'Todos',
    epic: 'Épico',
    legend: 'Leyenda',
    mythic: 'Mítico',
    honor: 'Mítico Honor',
    glory: 'Mítico Gloria'
  };
  return names[rank] || rank;
}

module.exports = {
  unwrapRecord,
  recordsFrom,
  heroData,
  heroName,
  heroImage,
  percent,
  cleanText,
  replyWithImage,
  rankName
};
