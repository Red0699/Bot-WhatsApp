const roneApi = require('../../services/roneApi');
const { createRoneCommand } = require('../../utils/roneCommand');
const {
  heroData,
  heroImage,
  cleanText,
  replyWithImage
} = require('../../utils/roneFormatting');

module.exports = createRoneCommand({
  name: '!heroe',
  description: 'Muestra los detalles e imagen de un héroe de Mobile Legends',
  usage: '!heroe <nombre del héroe>',
  execute: async (client, message, args) => {
    const record = await roneApi.getHero(args.join(' '));
    if (!record) {
      return message.reply('❌ No encontré ese héroe. Revisa el nombre e inténtalo de nuevo.');
    }

    const hero = heroData(record);
    const roles = Array.isArray(hero.sortlabel) ? hero.sortlabel.filter(Boolean) : [];
    const lanes = Array.isArray(hero.roadsortlabel) ? hero.roadsortlabel.filter(Boolean) : [];
    const specialties = Array.isArray(hero.speciality) ? hero.speciality.filter(Boolean) : [];
    const story = cleanText(hero.story, '');
    const lines = [
      `🟢 *${cleanText(hero.name, args.join(' '))}*`,
      roles.length ? `⚔️ Rol: ${roles.join(', ')}` : null,
      lanes.length ? `🧭 Líneas: ${lanes.join(', ')}` : null,
      specialties.length ? `✨ Especialidad: ${specialties.join(', ')}` : null,
      story ? `📖 ${story}` : null
    ].filter(Boolean);

    await replyWithImage(client, message, heroImage(record), lines.join('\n'));
  }
});
