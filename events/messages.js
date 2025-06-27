const fs = require('fs');

module.exports = (client) => {
  client.on('message', async (message) => {
    const command = message.body.split(' ')[0].toLowerCase();

    // Cargar comandos desde /commands
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const cmd = require(`../commands/${file}`);
      if (command === cmd.name) {
        cmd.execute(client, message);
      }
    }
  });
};
