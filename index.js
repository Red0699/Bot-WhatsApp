const { loadEnvironment } = require('./config/env');

loadEnvironment();

const { createWhatsAppClient } = require('./config/whatsapp');
const registerEvents = require('./events');
const client = createWhatsAppClient();

registerEvents(client);

client.initialize().catch((error) => {
  console.error('❌ No se pudo iniciar el cliente de WhatsApp:', error);
  process.exitCode = 1;
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nℹ️ Cerrando el bot (${signal})...`);

  try {
    await client.destroy();
    console.log('✅ Cliente de WhatsApp cerrado correctamente.');
  } catch (error) {
    console.error('❌ Error al cerrar el cliente de WhatsApp:', error);
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));