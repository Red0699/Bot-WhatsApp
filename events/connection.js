const qrcode = require('qrcode-terminal');

module.exports = (client) => {
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
};
