const { iniciarAdivinanza } = require('../utils/adivinanzaManager');

module.exports = {
  name: '!adivinanza',
  description: 'Inicia una adivinanza con palabras colombianas',
  category: 'Juegos',
  async execute(client, message) {
    const juego = iniciarAdivinanza(message.from);
    const pista = juego.pistas[0];

    await message.reply(
      `🧠 *¡Adivinanza!*\n\n` +
      `🔍 ${pista}\n\n` +
      `Envía tu intento con: *!respuesta <palabra>*`
    );
  }
};
