const roneApi = require('../../services/roneApi');
const { createRoneCommand } = require('../../utils/roneCommand');
const {
  recordsFrom,
  heroName,
  heroImage,
  percent,
  replyWithImage,
  unwrapRecord
} = require('../../utils/roneFormatting');

module.exports = createRoneCommand({
  name: '!mlcompat',
  description: 'Muestra los héroes con mejor sinergia para jugar junto a otro',
  usage: '!mlcompat <héroe> [rango]',
  execute: async (client, message, args) => {
    const ranks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
    const lastArgument = roneApi.normalizeRank(args[args.length - 1]);
    const rank = ranks.includes(lastArgument) ? lastArgument : 'all';
    const identifier = ranks.includes(lastArgument) ? args.slice(0, -1).join(' ') : args.join(' ');
    if (!identifier) return message.reply('⚠️ Indica el nombre del héroe.');

    const [result, names] = await Promise.all([
      roneApi.getHeroCompatibility(identifier, rank),
      roneApi.getHeroNamesById()
    ]);
    const record = recordsFrom(result)[0];
    if (!record) return message.reply('No hay datos de compatibilidad para ese héroe y rango.');

    const data = unwrapRecord(record);
    const teammates = Array.isArray(data.sub_hero) ? data.sub_hero : [];
    if (!teammates.length) return message.reply(`No hay sinergias registradas para ${heroName(record)}.`);

    const list = teammates.slice(0, 5).map((teammate, index) => {
      const name = names.get(String(teammate.heroid)) || `Héroe #${teammate.heroid}`;
      return `${index + 1}. *${name}* — WR ${percent(teammate.hero_win_rate)} (sinergia ${percent(teammate.increase_win_rate)})`;
    }).join('\n');
    const caption = `🤝 *Mejores aliados de ${heroName(record)} · ${rank}*\n${list}`;

    await replyWithImage(client, message, heroImage(record), caption);
  }
});
