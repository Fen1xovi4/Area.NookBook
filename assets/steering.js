/* Блуждание и удержание в объёме — ядро движения обитателей новых миров.
   Вынесено из Fish.prototype.update аквариума (тот остаётся при своей копии:
   живой код не трогаем). Требует THREE.

   Обитатель (self) обязан иметь: pos, vel (Vector3), speed, phase.
   Ускорение копится в переданном векторе a — вызывающий добавляет к нему
   свои силы (стремление к цели, флаттер) до шага step(). */
(function () {
  'use strict';

  var _l = new THREE.Vector3();

  // Синусоидное блуждание — те же частоты, что у рыб: движение выглядит
  // живым, а не случайным дёрганьем.
  function wander(a, t, phase, k) {
    k = k || 1;
    a.x += Math.sin(t * 0.42 + phase) * 0.5 * k;
    a.y += Math.sin(t * 0.3 + phase * 1.6) * 0.22 * k;
    a.z += Math.cos(t * 0.37 + phase) * 0.5 * k;
  }

  // Отталкивание от границ объёма. lim: {hw, yTop, yBot} на текущей глубине,
  // zNear/zFar — стенки по глубине, margin — отступ начала разворота,
  // wall — сила.
  function confine(a, pos, lim, zNear, zFar, margin, wall) {
    if (pos.z > zNear - margin) a.z -= wall;
    if (pos.z < zFar + margin) a.z += wall;
    if (pos.x > lim.hw - margin) a.x -= wall;
    if (pos.x < -lim.hw + margin) a.x += wall;
    if (pos.y > lim.yTop - margin) a.y -= wall;
    if (pos.y < lim.yBot + margin) a.y += wall;
  }

  // Шаг интеграции: разгон по ускорению, потолок скорости, подталкивание
  // слишком медленных, перенос позиции. Возвращает текущую скорость.
  function step(self, a, dt) {
    self.vel.addScaledVector(a, dt * 2.0);
    var sp = self.vel.length();
    if (sp > self.speed) self.vel.multiplyScalar(self.speed / sp);
    if (sp < self.speed * 0.35) self.vel.multiplyScalar(1.05);
    self.pos.addScaledVector(self.vel, dt);
    return self.vel.length();
  }

  // Развернуть меш по ходу движения (нос модели — +Z).
  function face(mesh, pos, vel) {
    mesh.position.copy(pos);
    mesh.lookAt(_l.copy(pos).add(vel));
  }

  window.Steering = { wander: wander, confine: confine, step: step, face: face };
})();
