const { getChiste } = require('../services/chistesApi');

module.exports = {
  name: '!chiste',
  async execute(client, message) {
    const chiste = await getChiste();
    await message.reply(`😂 ${chiste}`);
  }
};
