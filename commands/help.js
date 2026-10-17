const { getCommands } = require('../utils/commandRegistry');
const text = require('../utils/whatsappText');

module.exports = {
  name: '!help',
  description: 'Muestra todos los comandos disponibles del bot.',
  category: 'Utilidades',
  async execute(client, message) {
    const categories = new Map();
    const emojis = {
      'Juegos': '🎮',
      'Comandos para jugar': '🎲',
      'Interacción': '💬',
      'Utilidades': '🛠️',
      'Servicios': '✨',
      'Otros': '📦'
    };

    for (const command of getCommands()) {
      const category = command.category || 'Otros';
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(command);
    }

    const sections = [...categories.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([category, commands]) => {
        const lines = commands
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          .map(command => `• *${command.name}* — ${command.description || 'Sin descripción'}`);

        return `*${emojis[category] || emojis.Otros} ${category}*\n${lines.join('\n')}`;
      });

    const helpMessage = [
      text.title('Menú de comandos'),
      ...sections,
      text.hint('Escribe un comando tal como aparece para usarlo.')
    ].join('\n\n');

    await message.reply(helpMessage);
  }
};
