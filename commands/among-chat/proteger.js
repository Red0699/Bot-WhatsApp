const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!proteger',
  description: 'Permite al Médico proteger a un jugador durante la ronda actual.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'proteger');
  }
};
