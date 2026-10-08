const { obtenerRespuesta, juegoActivo } = require('../utils/adivinanzaManager');

module.exports = {
  name: '!rendirse',
  description: 'Te rindes en la adivinanza y el bot revela la respuesta.',
  category: 'Comandos para jugar',
  async execute(client, message) {
    const id = message.from;

    if (!juegoActivo(id)) {
      return message.reply('❌ No hay una adivinanza activa.');
    }

    const respuesta = obtenerRespuesta(id);
    await message.reply(`💀 Te rendiste. La respuesta era: *${respuesta}*`);
  }
};
