function createRoneCommand({
  name,
  description,
  usage,
  category = 'Mobile Legends',
  requiresArgs = true,
  execute
}) {
  return {
    name,
    description,
    category,
    async execute(client, message) {
      const args = message.body.trim().split(/\s+/).slice(1);

      if (requiresArgs && !args.length) {
        return message.reply(`⚠️ Uso: ${usage}`);
      }

      try {
        await execute(client, message, args);
      } catch (error) {
        console.error(`Error al ejecutar ${name} con Rone API:`, error.response?.data || error.message);
        await message.reply('⚠️ No pude consultar Rone API. Inténtalo de nuevo más tarde.');
      }
    }
  };
}

module.exports = { createRoneCommand };
