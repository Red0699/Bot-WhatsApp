const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!tarea',
  description: 'Solicita o responde una tarea privada en Among Chat.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'tarea');
  }
};
