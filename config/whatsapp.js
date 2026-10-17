const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

function createWhatsAppClient() {
  return new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '..', '.wwebjs_auth')
    })
  });
}

module.exports = { createWhatsAppClient };
