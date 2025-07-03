const { obtenerPista, juegoActivo } = require('../utils/adivinanzaManager');

module.exports = {
  name: '!pista',
  description: 'Solicita una nueva pista de la adivinanza actual',
  category: 'Comandos para jugar',
  async execute(client, message) {
    const chat = await message.getChat();

    if (!juegoActivo(chat.id._serialized)) {
      return message.reply('⚠️ No hay una adivinanza activa. Usa *!adivinanza* para iniciar.');
    }

    const pista = obtenerPista(chat.id._serialized);

    if (!pista) {
      return message.reply('❌ No hay más pistas disponibles para esta adivinanza.');
    }

    await message.reply(`💡 *Pista:* ${pista}`);
  }
};
