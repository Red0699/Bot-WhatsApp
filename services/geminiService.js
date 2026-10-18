const axios = require('axios');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
const MAX_ATTEMPTS = 3;

async function getGeminiResponse(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Falta configurar GOOGLE_API_KEY en el archivo .env.');
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await axios.post(API_URL, {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        }
      });

      const candidates = response.data.candidates;
      return candidates?.[0]?.content?.parts?.[0]?.text || '🤖 No recibí respuesta del modelo.';
    } catch (error) {
      const status = error.response?.status;
      const isTransient = status === 429 || status >= 500;

      if (!isTransient || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** (attempt - 1))));
    }
  }
}

module.exports = {
  getGeminiResponse
};
