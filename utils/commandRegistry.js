const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, '..', 'commands');
const commandsByName = new Map();
let loaded = false;

function loadCommands() {
  if (loaded) return;

  const files = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'))
    .sort();

  for (const file of files) {
    const command = require(path.join(commandsPath, file));

    if (!command.name || typeof command.execute !== 'function') {
      throw new Error(`El archivo ${file} debe exportar name y execute().`);
    }

    if (commandsByName.has(command.name)) {
      throw new Error(`El comando ${command.name} está definido más de una vez.`);
    }

    commandsByName.set(command.name, command);
  }

  loaded = true;
}

function getCommand(name) {
  loadCommands();
  return commandsByName.get(name);
}

function getCommands() {
  loadCommands();
  return [...commandsByName.values()];
}

module.exports = { getCommand, getCommands };
