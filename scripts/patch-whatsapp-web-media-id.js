const fs = require('node:fs');
const path = require('node:path');

const utilsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'whatsapp-web.js',
  'src',
  'util',
  'Injected',
  'Utils.js'
);
const anchor = "        // Bot's won't reply if canonicalUrl is set (linking)\n";
const fix = '        delete message.__x_id;\n\n';

function patchMediaMessageId(filePath = utilsPath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const patchedAnchor = fix + anchor;

  if (source.includes(patchedAnchor)) return false;

  const anchorCount = source.split(anchor).length - 1;
  if (anchorCount !== 1) {
    throw new Error(
      `No se pudo aplicar la corrección de whatsapp-web.js: se esperaba una instancia del punto de inserción y se encontraron ${anchorCount}.`
    );
  }

  fs.writeFileSync(filePath, source.replace(anchor, patchedAnchor));
  return true;
}

if (require.main === module) {
  if (patchMediaMessageId()) {
    console.log('Se aplicó la corrección para el envío de imágenes de whatsapp-web.js.');
  } else {
    console.log('La corrección para el envío de imágenes de whatsapp-web.js ya estaba aplicada.');
  }
}

module.exports = { patchMediaMessageId };
