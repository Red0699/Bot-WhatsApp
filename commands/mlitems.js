const roneApi = require('../services/roneApi');
const { createRoneCommand } = require('../utils/roneCommand');
const { cleanText, percent, replyWithImage } = require('../utils/roneFormatting');

module.exports = createRoneCommand({
  name: '!mlitems',
  description: 'Busca objetos y muestra sus detalles e imagen',
  usage: '!mlitems [nombre del objeto]',
  requiresArgs: false,
  execute: async (client, message, args) => {
    const search = args.join(' ').toLocaleLowerCase();
    const items = await roneApi.getItems();
    const matches = search
      ? items.filter(item => String(item.equipname || '').toLocaleLowerCase().includes(search))
      : items;

    if (!matches.length) return message.reply('No encontré objetos con ese nombre.');

    const shown = matches.slice(0, 8);
    const caption = `🛡️ *Objetos de Mobile Legends*\n${shown.map((item, index) =>
      `${index + 1}. *${cleanText(item.equipname)}*${item.equipprice ? ` — ${item.equipprice} oro` : ''}${item.equipdesc ? `\n   ${item.equipdesc}` : ''}${item.equipwinrate ? `\n   Win rate: ${percent(item.equipwinrate)}` : ''}`
    ).join('\n')}`;
    const image = shown[0].equipicon || shown[0].icon;

    if (image) {
      await replyWithImage(client, message, image, caption);
    } else {
      await message.reply(caption);
    }
  }
});
