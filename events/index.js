const registerConnectionEvents = require('./connection');
const registerGroupJoinEvent = require('./groupJoin');
const registerGroupLeaveEvent = require('./groupLeave');
const registerMessageEvent = require('./messages');
const registerReadyEvent = require('./ready');

function registerEvents(client) {
  registerConnectionEvents(client);
  registerReadyEvent(client);
  registerMessageEvent(client);
  registerGroupJoinEvent(client);
  registerGroupLeaveEvent(client);
}

module.exports = registerEvents;
