/* Нормализация ориентации .gltf: оборачивает сцену узлом с поворотом вокруг
 * одной из осей. После неё модель смотрит носом в +Z (спина +Y) и в
 * model-sources.json ей ставится frame: "identity" — эвристики осей больше
 * не нужны.
 *
 *   node tools/normalize-gltf.js <файл.gltf> <градусы> [x|y|z]
 *
 * Ось по умолчанию — Y (как раньше). Вертикальные модели (ракета носом в +Y)
 * кладутся поворотом +90 вокруг X. Работает и со скелетными моделями: кости
 * лежат внутри обёртки и поворачиваются вместе со всей сценой. Проверить
 * результат — в смотровой /tools/model-view.html (нос должен смотреть в +Z,
 * синяя ось).
 */
'use strict';

const fs = require('fs');

const [file, degArg, axisArg] = process.argv.slice(2);
const deg = Number(degArg);
const axis = (axisArg || 'y').toLowerCase();
if (!file || !isFinite(deg) || !'xyz'.includes(axis)) {
  console.error('нужно: node tools/normalize-gltf.js <файл.gltf> <градусы> [x|y|z]');
  process.exit(1);
}

const g = JSON.parse(fs.readFileSync(file, 'utf8'));
const scene = g.scenes[g.scene || 0];
const half = (deg * Math.PI / 180) / 2;
const s = +Math.sin(half).toFixed(9), c = +Math.cos(half).toFixed(9);
const rotation = { x: [s, 0, 0, c], y: [0, s, 0, c], z: [0, 0, s, c] }[axis];

g.nodes = g.nodes || [];
g.nodes.push({
  name: 'normalize-' + axis + deg,
  rotation: rotation,
  children: scene.nodes.slice()
});
scene.nodes = [g.nodes.length - 1];

fs.writeFileSync(file, JSON.stringify(g), 'utf8');
console.log(file + ': сцена повёрнута на ' + deg + '° вокруг ' + axis.toUpperCase());
