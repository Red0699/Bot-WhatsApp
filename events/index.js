const registerConnectionEvents = require('./connection');
const registerGroupJoinEvent = require('./groupJoin');
const registerMessageEvent = require('./messages');
const registerReadyEvent = require('./ready');

function registerEvents(client) {
  registerConnectionEvents(client);
  registerReadyEvent(client);
  registerMessageEvent(client);
  registerGroupJoinEvent(client);
}

module.exports = registerEvents;
