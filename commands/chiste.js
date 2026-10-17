const { getChiste } = require('../services/chistesApi');

module.exports = {
  name: '!chiste',
  description: 'Te cuenta un chiste malo, porque no encuentro una buena página de chistes.',
  category: 'Interacción',
  async execute(client, message) {
    const chiste = await getChiste();
    await message.reply(`😂 ${chiste}`);
  }
};
