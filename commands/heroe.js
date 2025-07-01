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

    const topJugadores = Array.isArray(heroe.topJugador) ? heroe.topJugador : [];
    const menciones = topJugadores.map(num => `${num}@c.us`);

    const topJugadorTexto = topJugadores.length
      ? `👤 Más usado por:\n- ${topJugadores.map(num => `@${num}`).join('\n- ')}`
      : '👤 Más usado por: *Nadie aún*';

    const caption =
      `🟢 *${heroe.nombre}*\n` +
      `⚔️ Rol: ${heroe.roles.join(', ')}\n` +
      `🧭 Líneas jugadas: ${heroe.linea.join(', ')}\n` +
      `🛡 Build recomendada:\n- ${heroe.build.join('\n- ')}\n\n` +
      `${topJugadorTexto}`;

    try {
      const media = await MessageMedia.fromUrl(heroe.imagen);

      await client.sendMessage(chatId, media, {
        caption,
        mentions: menciones
      });
    } catch (error) {
      console.error('❌ Error al enviar imagen:', error.message);
      await message.reply('⚠️ No se pudo cargar la imagen del héroe.');
    }
  }
};
