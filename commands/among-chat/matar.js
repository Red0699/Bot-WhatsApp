const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!matar',
  description: 'Permite a los impostores eliminar a un jugador usando su número privado.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'matar');
  }
};
