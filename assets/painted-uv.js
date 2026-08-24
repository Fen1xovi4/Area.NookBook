/* Планарная UV-развёртка по рамке листа-раскраски — общая для всех сцен
   и превью съёмки. Рисунок ребёнка кадрируется с листа этой же рамкой
   (assets/capture.js), поэтому пары осей здесь и в tools/silhouettes.html
   обязаны совпадать: разойдутся — и рисунок ляжет на модель боком.
   Требует THREE. */
(function () {
  'use strict';

  // Оси листа в координатах нормализованной модели (нос → +Z, спина → +Y):
  //   side  — профиль рыбы:      горизонталь листа = z, вертикаль = y
  //   top   — насекомое сверху:  горизонталь = x (размах), вертикаль = z (голова вверх)
  //   front — футболист анфас:   горизонталь = x, вертикаль = y
  var AXES = { side: ['z', 'y'], top: ['x', 'z'], front: ['x', 'y'] };

  // target — либо Object3D (меши обходятся по миру, геометрия клонируется,
  // чтобы не портить общий шаблон), либо готовая BufferGeometry (позиции
  // уже в финальных координатах — так отдаёт FishGLB.bake).
  function applyPlanar(target, projection) {
    var ax = AXES[projection] || AXES.side;
    var a0 = ax[0], a1 = ax[1];
    var v = new THREE.Vector3();

    var items = [];
    if (target.isBufferGeometry) {
      items.push({ geo: target, mesh: null });
    } else {
      target.updateMatrixWorld(true);
      target.traverse(function (o) {
        if (o.isMesh) items.push({ geo: o.geometry = o.geometry.clone(), mesh: o });
      });
    }

    var min0 = Infinity, max0 = -Infinity, min1 = Infinity, max1 = -Infinity;
    items.forEach(function (it) {
      var p = it.geo.attributes.position;
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        if (it.mesh) v.applyMatrix4(it.mesh.matrixWorld);
        if (v[a0] < min0) min0 = v[a0];
        if (v[a0] > max0) max0 = v[a0];
        if (v[a1] < min1) min1 = v[a1];
        if (v[a1] > max1) max1 = v[a1];
      }
    });
    var span0 = Math.max(max0 - min0, 1e-6), span1 = Math.max(max1 - min1, 1e-6);

    items.forEach(function (it) {
      var p = it.geo.attributes.position;
      var uv = new Float32Array(p.count * 2);
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        if (it.mesh) v.applyMatrix4(it.mesh.matrixWorld);
        uv[i * 2] = (v[a0] - min0) / span0;
        uv[i * 2 + 1] = (v[a1] - min1) / span1;
      }
      it.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    });
  }

  window.PaintedUV = { AXES: AXES, applyPlanar: applyPlanar };
})();
