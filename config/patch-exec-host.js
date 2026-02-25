const fs = require('fs');
const path = require('path');

const oldCode = 'if (!elevatedRequested && requestedHost && requestedHost !== configuredHost) throw new Error(`exec host not allowed (requested ${renderExecHostLabel(requestedHost)}; configure tools.exec.host=${renderExecHostLabel(configuredHost)} to allow).`);';
const newCode = 'if (!elevatedRequested && requestedHost && requestedHost !== configuredHost) { host = configuredHost; }';

function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, callback);
    else if (e.isFile() && e.name.endsWith('.js')) callback(full);
  }
}

let patched = 0;
walkDir('/app/dist', (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  if (src.includes(oldCode)) {
    fs.writeFileSync(filePath, src.replace(oldCode, newCode), 'utf8');
    patched++;
  }
});
console.log(patched ? 'Patched: exec host check now falls back to configuredHost (' + patched + ' file(s))' : 'Patch target not found (already patched or different version)');
