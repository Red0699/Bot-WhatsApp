const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '.wwebjs_auth')
  })
});

client.on('qr', (qr) => {
  console.log('📱 Escanea este código QR desde WhatsApp > Dispositivos vinculados:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Sesión de WhatsApp autenticada; esperando a que termine de cargar...');
});

client.on('loading_screen', (percent, message) => {
  console.log(`⏳ Cargando WhatsApp: ${percent}%${message ? ` - ${message}` : ''}`);
});

client.on('auth_failure', (message) => {
  console.error('❌ Falló la autenticación de WhatsApp:', message);
});

client.on('change_state', (state) => {
  console.log('ℹ️ Estado del cliente de WhatsApp:', state);
});

client.on('disconnected', (reason) => {
  console.error('⚠️ WhatsApp se desconectó:', reason);
});

// Cargar eventos dinámicamente desde /events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  event(client);
}

client.initialize().catch((error) => {
  console.error('❌ No se pudo iniciar el cliente de WhatsApp:', error);
  process.exitCode = 1;
});