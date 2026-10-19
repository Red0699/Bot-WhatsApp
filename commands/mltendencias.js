const roneApi = require('../services/roneApi');
const { createRoneCommand } = require('../utils/roneCommand');
const {
  recordsFrom,
  heroName,
  heroImage,
  percent,
  replyWithImage,
  unwrapRecord,
  rankName
} = require('../utils/roneFormatting');

module.exports = createRoneCommand({
  name: '!mltendencias',
  description: 'Consulta la tendencia reciente del win rate de un héroe',
  usage: '!mltendencias <héroe> [rango]',
  execute: async (client, message, args) => {
    const ranks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
    const lastArgument = roneApi.normalizeRank(args[args.length - 1]);
    const rank = ranks.includes(lastArgument) ? lastArgument : 'all';
    const identifier = ranks.includes(lastArgument) ? args.slice(0, -1).join(' ') : args.join(' ');
    if (!identifier) return message.reply('⚠️ Indica el nombre del héroe.');

    const [result, hero] = await Promise.all([
      roneApi.getHeroTrends(identifier, rank),
      roneApi.getHero(identifier)
    ]);
    const trends = recordsFrom(result);
    if (!trends.length) return message.reply('No hay tendencias recientes para ese héroe y rango.');

    const list = trends.slice(0, 5).map((record, index) => {
      const data = unwrapRecord(record);
      return `${index + 1}. Win rate: ${percent(data.win_rate)}`;
    }).join('\n');
    const caption = `📈 *Tendencia de ${heroName(hero)} · ${rankName(rank)}*\n${list}`;

    await replyWithImage(client, message, heroImage(hero), caption);
  }
});
