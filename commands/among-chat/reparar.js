const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!reparar',
  description: 'Resuelve en el grupo el desafío de un sabotaje en curso.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'reparar');
  }
};
