const path = require('path');
const dotenv = require('dotenv');

function loadEnvironment() {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

module.exports = { loadEnvironment };
