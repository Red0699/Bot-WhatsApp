const { handle } = require('../../utils/amongChat');

module.exports = {
  name: '!amongus',
  description: 'Crea salas, inicia partidas, convoca reuniones y consulta tu perfil o ranking de Among Chat.',
  category: 'Juegos',
  async execute(client, message) {
    await handle(client, message, 'amongus');
  }
};
