const { getGeminiResponse } = require('../services/geminiService');

module.exports = {
  name: '!gemini',
  description: 'Envía un mensaje a Google Gemini y devuelve la respuesta',
  async execute(client, message) {
    const body = message.body.trim();
    const args = body.split(' ').slice(1);
    const prompt = args.join(' ');

    if (!prompt) {
      return message.reply('❗ Por favor, escribe algo. Ejemplo: !gemini ¿Qué es el calentamiento global?');
    }

    try {
      const response = await getGeminiResponse(prompt);
      await message.reply(response);
    } catch (error) {
      console.error('Error al consultar Gemini:', error.message);
      await message.reply('⚠️ Ocurrió un error al consultar Google Gemini.');
    }
  }
};
