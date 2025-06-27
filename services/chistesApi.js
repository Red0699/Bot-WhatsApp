const axios = require('axios');

async function getChiste() {
  const response = await axios.get('https://api.chucknorris.io/jokes/random');
  return response.data.value;
}

module.exports = { getChiste };