const { category } = require("./grupo");

module.exports = {
  name: '!hola',
  description: 'El bot te saluda con un mensaje amistoso.',
  category: 'Interacción',
  async execute(client, message) {
    await message.reply('👋 ¡Hola! Soy tu bot.');
  }
};