const roneApi = require('../services/roneApi');
const { createRoneCommand } = require('../utils/roneCommand');
const {
  recordsFrom,
  heroName,
  heroImage,
  percent,
  replyWithImage,
  unwrapRecord
} = require('../utils/roneFormatting');

module.exports = createRoneCommand({
  name: '!mlcounters',
  description: 'Muestra los héroes que mejor contrarrestan a otro héroe',
  usage: '!mlcounters <héroe> [rango]',
  execute: async (client, message, args) => {
    const ranks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];
    const lastArgument = roneApi.normalizeRank(args[args.length - 1]);
    const rank = ranks.includes(lastArgument) ? lastArgument : 'all';
    const identifier = ranks.includes(lastArgument) ? args.slice(0, -1).join(' ') : args.join(' ');
    if (!identifier) return message.reply('⚠️ Indica el nombre del héroe.');

    const [result, names] = await Promise.all([
      roneApi.getHeroCounters(identifier, rank),
      roneApi.getHeroNamesById()
    ]);
    const record = recordsFrom(result)[0];
    if (!record) return message.reply('No hay counters disponibles para ese héroe y rango.');

    const data = unwrapRecord(record);
    const counters = Array.isArray(data.sub_hero) ? data.sub_hero : [];
    if (!counters.length) return message.reply(`No hay counters registrados para ${heroName(record)}.`);

    const list = counters.slice(0, 5).map((counter, index) => {
      const name = names.get(String(counter.heroid)) || `Héroe #${counter.heroid}`;
      return `${index + 1}. *${name}* — WR ${percent(counter.hero_win_rate)} (cambio ${percent(counter.increase_win_rate)})`;
    }).join('\n');
    const caption = `🛑 *Counters de ${heroName(record)} · ${rank}*\n${list}`;

    await replyWithImage(client, message, heroImage(record), caption);
  }
});
