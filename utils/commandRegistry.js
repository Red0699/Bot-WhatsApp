const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, '..', 'commands');
const commandsByName = new Map();
let loaded = false;

function getCommandFiles(directory = commandsPath) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return getCommandFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
    })
    .sort();
}

function loadCommands() {
  if (loaded) return;

  const files = getCommandFiles();

  for (const file of files) {
    const command = require(file);

    if (!command.name || typeof command.execute !== 'function') {
      throw new Error(`El archivo ${path.relative(commandsPath, file)} debe exportar name y execute().`);
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
