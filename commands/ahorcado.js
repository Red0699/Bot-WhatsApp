// commands/ahorcado.js

const { iniciarJuego, estadoJuego } = require('../utils/ahorcadoManager');

module.exports = {
  name: '!ahorcado',
  description: 'Inicia un juego de ahorcado con palabras colombianas',
  category: 'Juegos',
  async execute(client, message) {
    const juego = iniciarJuego(message.from);
    const estado = estadoJuego(message.from);

    await message.reply(
      `🎮 *¡Nuevo juego de Ahorcado!*\n` +
      `🔤 Palabra: ${estado.palabra}\n` +
      `❤️ Intentos restantes: ${estado.intentos}\n` +
      `Adivina con: !letra <letra>`
    );
  }
};
