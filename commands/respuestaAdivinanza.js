const { verificarRespuesta, juegoActivo } = require('../utils/adivinanzaManager');

module.exports = {
  name: '!respuesta',
  description: 'Envía tu intento de respuesta a la adivinanza',
  category: 'Comandos para jugar',
  async execute(client, message) {
    const chat = await message.getChat();
    const args = message.body.trim().split(' ');
    const intento = args.slice(1).join(' ');

    if (!intento) {
      return message.reply('✍️ Debes escribir tu intento. Ej: !respuesta tinto');
    }

    const chatId = chat.id._serialized;

    if (!juegoActivo(chatId)) {
      return message.reply('❌ No hay una adivinanza activa. Usa *!adivinanza* para comenzar.');
    }

    const esCorrecto = verificarRespuesta(chatId, intento);

    if (esCorrecto) {
      const nombre = message._data.notifyName || 'Un jugador';
      await message.reply(`🎉 ¡Correcto, *${nombre}*! La respuesta era *${intento}* 👏`);
    } else {
      await message.reply('❌ Esa no es la respuesta correcta. ¡Intenta de nuevo!');
    }
  }
};
