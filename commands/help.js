const fs = require('fs');
const path = require('path');

module.exports = {
  name: '!help',
  description: 'Muestra todos los comandos disponibles del bot.',
  async execute(client, message) {
    const commandFiles = fs.readdirSync(path.join(__dirname))
      .filter(file => file.endsWith('.js') && file !== 'help.js');

    let helpMessage = '📋 *Lista de comandos disponibles:*\n\n';

    for (const file of commandFiles) {
      const command = require(`./${file}`);
      helpMessage += `• ${command.name} – ${command.description || 'Sin descripción'}\n`;
    }

    await message.reply(helpMessage);
  }
};
