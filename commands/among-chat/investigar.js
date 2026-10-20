const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!investigar',
  description: 'Permite al Detective investigar a un jugador en privado.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'investigar');
  }
};
