/* Нормализация ориентации .gltf: оборачивает сцену узлом с поворотом вокруг Y.
 * После неё модель смотрит носом в +Z (спина +Y) и в model-sources.json ей
 * ставится frame: "identity" — эвристики осей больше не нужны.
 *
 *   node tools/normalize-gltf.js <файл.gltf> <градусы-вокруг-Y>
 *
 * Работает и со скелетными моделями: кости лежат внутри обёртки и
 * поворачиваются вместе со всей сценой. Проверить результат — в смотровой
 * /tools/model-view.html (нос должен смотреть в +Z, синяя ось).
 */
'use strict';

const fs = require('fs');

const [file, degArg] = process.argv.slice(2);
const deg = Number(degArg);
if (!file || !isFinite(deg)) {
  console.error('нужно: node tools/normalize-gltf.js <файл.gltf> <градусы-вокруг-Y>');
  process.exit(1);
}

const g = JSON.parse(fs.readFileSync(file, 'utf8'));
const scene = g.scenes[g.scene || 0];
const half = (deg * Math.PI / 180) / 2;

g.nodes = g.nodes || [];
g.nodes.push({
  name: 'normalize-y' + deg,
  rotation: [0, +Math.sin(half).toFixed(9), 0, +Math.cos(half).toFixed(9)],
  children: scene.nodes.slice()
});
scene.nodes = [g.nodes.length - 1];

fs.writeFileSync(file, JSON.stringify(g), 'utf8');
console.log(file + ': сцена повёрнута на ' + deg + '° вокруг Y');
