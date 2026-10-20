const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!sabotear',
  description: 'Permite a los impostores iniciar un sabotaje temporizado.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'sabotear');
  }
};
