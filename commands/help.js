const fs = require('fs');
const path = require('path');

module.exports = {
  name: '!help',
  description: 'Muestra todos los comandos disponibles del bot.',
  category: 'Utilidades',
  async execute(client, message) {
    const commandFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.js') && file !== 'help.js');

    const categorias = {};

    for (const file of commandFiles) {
      const command = require(`./${file}`);
      const categoria = command.category || 'Otros';
      if (!categorias[categoria]) categorias[categoria] = [];
      categorias[categoria].push(command);
    }

    let helpMessage = '📋 *Comandos disponibles:*\n\n';

    const emojis = {
      'Juegos': '🎮',
      'Comandos para jugar': '🎲',
      'Interacción': '💬',
      'Utilidades': '🛠️',
      'Servicios': '🗝️',
      'Otros': '📦'
    };

    for (const categoria in categorias) {
      helpMessage += `*${emojis[categoria] || ''} ${categoria}:*\n`;
      for (const cmd of categorias[categoria]) {
        helpMessage += `• ${cmd.name} – ${cmd.description || 'Sin descripción'}\n`;
      }
      helpMessage += '\n';
    }

    await message.reply(helpMessage.trim());
  }
};
