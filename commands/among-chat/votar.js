const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!votar',
  description: 'Emite tu voto secreto por privado durante una partida de Among Chat.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'votar');
  }
};
