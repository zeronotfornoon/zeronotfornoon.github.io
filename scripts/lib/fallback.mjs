import fs from 'fs';
import path from 'path';

export function writeFallbackJs(filePath, globalName, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    'window.' + globalName + ' = ' + JSON.stringify(data) + ';\n',
    'utf8'
  );
}

export function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}
