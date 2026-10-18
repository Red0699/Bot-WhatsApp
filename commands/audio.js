const { searchYouTube } = require('../services/youtubeSearch');

module.exports = {
  name: '!audio',
  description: 'Busca la primera canción en YouTube por nombre o comparte un enlace',
  category: 'Servicios',
  async execute(client, message) {
    const query = message.body.trim().split(/\s+/).slice(1).join(' ');

    if (!query) {
      return message.reply('🎵 Escribe el nombre de una canción o pega un enlace de YouTube. Ejemplo: !audio Bohemian Rhapsody');
    }

    try {
      const results = await searchYouTube(query);

      if (!results.length) {
        return message.reply('🔎 No encontré videos. Revisa el enlace de YouTube o intenta otra búsqueda.');
      }

      const reply = results.map((video, index) => {
        const details = [
          `*${index + 1}. ${video.title}*`,
          `Canal: ${video.channel}`,
          video.duration ? `Duración: ${video.duration}` : null,
          video.url
        ].filter(Boolean);
        return details.join('\n');
      }).join('\n\n');

      await message.reply(`🎵 *Resultados de YouTube*\n\n${reply}`);
    } catch (error) {
      console.error('Error al buscar en YouTube:', error.message);
      const reply = error.message.includes('YOUTUBE_API_KEY')
        ? '⚠️ Configura YOUTUBE_API_KEY en .env con una clave que tenga YouTube Data API v3 habilitada.'
        : '⚠️ No se pudo buscar en YouTube en este momento. Inténtalo de nuevo más tarde.';
      await message.reply(reply);
    }
  }
};
