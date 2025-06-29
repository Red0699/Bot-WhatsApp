const { iniciarAdivinanza } = require('../utils/adivinanzaManager');

module.exports = {
  name: '!adivinanza',
  description: 'Inicia una adivinanza con palabras colombianas',
  category: 'Juegos',
  async execute(client, message) {
    const chat = await message.getChat();

    const { pista } = iniciarAdivinanza(chat.id._serialized);

    await message.reply(
      `🧠 *Adivinanza!*\n\n` +
      `🔍 ${pista}\n\n` +
      `Envía tu intento con: *!respuesta <palabra>*`
    );
  }
};
