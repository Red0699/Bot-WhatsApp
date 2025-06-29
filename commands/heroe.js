const { MessageMedia } = require('whatsapp-web.js');
const heroes = require('../utils/heroesData');

module.exports = {
  name: '!heroe',
  description: 'Muestra la información de un héroe de Mobile Legends',
  category: 'Utilidades',
  async execute(client, message) {
    const args = message.body.trim().split(' ');
    const nombre = args.slice(1).join(' ').toLowerCase();

    if (!nombre) {
      return message.reply('⚠️ Debes escribir el nombre del héroe. Ej: !heroe Pharsa');
    }

    const heroe = heroes.find(h => h.nombre.toLowerCase() === nombre);

    if (!heroe) {
      return message.reply('❌ Héroe no encontrado. Asegúrate de escribirlo correctamente.');
    }

    const chat = await message.getChat();
    const chatId = chat.id._serialized;

    const topJugador = heroe.topJugador;
    const topJugadorTexto = topJugador
      ? `👤 Más usado por: @${topJugador} `
      : '👤 Más usado por: *Nadie aún*';

    console.log(`@${topJugador} `);

    const caption = 
      `🧱 *${heroe.nombre}*\n` +
      `⚔️ Rol: ${heroe.roles.join(', ')}\n` +
      `🧭 Líneas jugadas: ${heroe.linea.join(', ')}\n` +
      `🛡 Build recomendada:\n- ${heroe.build.join('\n- ')}\n\n` +
      `${topJugadorTexto}`;

    try {
      const media = await MessageMedia.fromUrl(heroe.imagen);

      await client.sendMessage(chatId, media, {
        caption,
        mentions: topJugador ? [{ id: { _serialized: topJugador } }] : []
      });
    } catch (error) {
      console.error('❌ Error al enviar imagen:', error.message);
      await message.reply('⚠️ No se pudo cargar la imagen del héroe.');
    }
  }
};
