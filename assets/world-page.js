/* Каркас страницы мира (сад, футбол): меню, доступ, «поделиться», опросы
   сервера и снимок-превью. Сцену страница строит сама и отдаёт сюда хуки.
   Аквариум (realistic-tank.html) живёт своей копией этого кода — он в проде,
   и его не трогаем.

   Требует: THREE, I18N, Modal, Tank, qr.js.

   WorldPage.boot({
     world: 'garden',            // мир страницы; виды фильтруются по манифесту
     counter: 'insects',         // ветка PLURALS для счётчика обитателей
     hooks: {
       init(),                          // построить сцену (после проверки meta)
       spawnPainted(item, info, tex, done),  // done(handle|null); info — вид из манифеста
       removePainted(handle),
       onSettings(s)                    // опционально: пришли настройки с сервера
     }
   })

   Наружу: WorldPage.wt, .wantShot, .attachShots, .tickShots, .pollPainted,
           .specs (вид → запись манифеста), .TV, .DEMO */
(function () {
  'use strict';

  var W = {};
  var opts, hooks;

  // ── перевод с оглядкой на мир ─────────────────────────────────────────────
  // Сначала «ключ.мир», нет перевода — базовый ключ (аквариумная формулировка
  // или нейтральная). Так новые миры добавляют только то, что звучит иначе.
  function wt(key, vars) {
    var k2 = key + '.' + opts.world;
    return I18N.t(k2) !== k2 ? I18N.t(k2, vars) : I18N.t(key, vars);
  }

  // ── разметка меню ─────────────────────────────────────────────────────────
  // Как в аквариуме, но без пунктов «покупная рыбка», «фон» и «покормить»:
  // новые миры рисуют окружение сами, а обитатели в них только раскрашенные.
  function menuHtml() {
    return [
      '<div class="menu" id="menu" hidden>',
      ' <div class="card" id="menu-card">',
      '  <button class="x" id="m-close" type="button" aria-label="✕">✕</button>',
      '  <div id="menu-main">',
      '   <h2><button class="rename" id="m-rename" type="button">',
      '     <span id="m-name"></span><span class="pen">✏️</span>',
      '   </button></h2>',
      '   <p class="who"><span id="m-count">…</span> · <button class="code" id="m-key" type="button"></button></p>',
      '   <button class="item main" id="m-capture" type="button">',
      '     <span class="ico">📷</span><span><b></b><i></i></span></button>',
      '   <button class="item" id="m-print" type="button">',
      '     <span class="ico">🖨️</span><span><b></b><i></i></span></button>',
      '   <button class="item" id="m-fish" type="button">',
      '     <span class="ico">🗑️</span><span><b></b><i></i></span></button>',
      '   <button class="item" id="m-share" type="button">',
      '     <span class="ico">📺</span><span><b></b><i></i></span></button>',
      '   <a class="item" id="m-home" href="/">',
      '     <span class="ico">🏠</span><span><b></b><i></i></span></a>',
      '   <div class="langrow"><span id="lang"></span></div>',
      '  </div>',
      '  <div id="menu-capture" hidden>',
      '   <button class="goback" id="m-capback" type="button"></button>',
      '   <iframe class="capframe" id="capframe"></iframe>',
      '  </div>',
      '  <div id="menu-print" hidden>',
      '   <button class="goback" id="m-printback" type="button"></button>',
      '   <iframe class="capframe" id="printframe"></iframe>',
      '  </div>',
      '  <div id="menu-fish" hidden>',
      '   <button class="goback" id="m-fishback" type="button"></button>',
      '   <iframe class="capframe" id="fishframe"></iframe>',
      '  </div>',
      '  <div id="menu-share" class="share" hidden>',
      '   <button class="goback" id="m-shareback" type="button"></button>',
      '   <h2 id="share-title"></h2>',
      '   <div class="qrwrap"><span class="qrbox" id="share-qr"></span><p class="qrhint" id="share-hint"></p></div>',
      '   <button class="item" id="m-copylink" type="button"><span class="ico">🔗</span><span><b></b><i></i></span></button>',
      '   <button class="item" id="m-sendlink" type="button" hidden><span class="ico">📨</span><span><b></b><i></i></span></button>',
      '   <button class="item" id="m-tvpin" type="button"><span class="ico">📟</span><span><b></b><i></i></span></button>',
      '   <div class="pinbox" id="pinbox" hidden><div class="pin" id="pin-digits"></div><p class="pinhint" id="pin-hint"></p></div>',
      '  </div>',
      ' </div>',
      '</div>',
      '<div class="taphint" id="taphint" hidden></div>'
    ].join('\n');
  }

  // Подписи собраны в одном месте: их же перерисовывает смена языка.
  function applyTexts() {
    var q = function (s) { return document.querySelector(s); };
    q('#m-close').title = I18N.t('menu.close');
    q('#m-rename').title = I18N.t('menu.rename.hint');
    q('#m-capture b').textContent = wt('menu.capture.title');
    q('#m-capture i').textContent = wt('menu.capture.sub');
    q('#m-print b').textContent = I18N.t('menu.print.title');
    q('#m-print i').textContent = wt('menu.print.sub');
    q('#m-fish b').textContent = wt('menu.fish.title');
    q('#m-fish i').textContent = wt(lockedNoPass() ? 'menu.fish.sub.pass' : 'menu.fish.sub');
    q('#m-share b').textContent = I18N.t('menu.share.title');
    q('#m-share i').textContent = I18N.t('menu.share.sub');
    q('#m-home b').textContent = I18N.t('menu.home.title');
    q('#m-home i').textContent = I18N.t('menu.home.sub');
    q('#m-capback').textContent = I18N.t('menu.back');
    q('#m-printback').textContent = I18N.t('menu.back');
    q('#m-fishback').textContent = I18N.t('menu.back');
    q('#m-shareback').textContent = I18N.t('menu.back');
    q('#share-title').textContent = I18N.t('menu.share.title');
    q('#share-hint').textContent = I18N.t('menu.share.hint');
    q('#m-copylink b').textContent = I18N.t('menu.share.copy');
    q('#m-copylink i').textContent = I18N.t('menu.share.copy.sub');
    q('#m-sendlink b').textContent = I18N.t('menu.share.send');
    q('#m-sendlink i').textContent = I18N.t('menu.share.send.sub');
    q('#m-tvpin b').textContent = I18N.t('menu.share.pin');
    q('#m-tvpin i').textContent = I18N.t('menu.share.pin.sub');
    q('#pin-hint').textContent = I18N.t('menu.share.pin.text');
    q('#taphint').textContent = I18N.t('menu.hint');
    renderKey();
    // Счётчик перерисовываем только когда он уже известен: setCount(0) до
    // первого опроса открывал бы меню как «пустому миру».
    if (count !== null) {
      document.getElementById('m-count').textContent =
        count ? I18N.plural(count, opts.counter) : wt('tank.nofish');
    }
  }

  function lockedNoPass() { return tankLocked && !Tank.pass(); }

  // ── меню: открытие, виды ──────────────────────────────────────────────────
  var menu, menuCard, tapHint;
  var HINT_KEY = 'aqua.menuSeen';
  var menuUsed = false;
  var count = null;
  var tankLocked = true;
  var tankName = '';

  function hintSeen() {
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; }
  }

  function views() {
    return ['menu-main', 'menu-capture', 'menu-print', 'menu-fish', 'menu-share']
      .map(function (id) { return document.getElementById(id); });
  }

  function showView(id, wide) {
    views().forEach(function (v) { v.hidden = v.id !== id; });
    menuCard.classList.toggle('wide', !!wide);
  }

  function showMenu() { menu.hidden = false; tapHint.hidden = true; }

  function hideMenu() {
    showView('menu-main', false);
    menu.hidden = true;
    if (!hintSeen()) tapHint.hidden = false;
  }

  function toggleMenu() {
    menuUsed = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* приватный режим */ }
    if (menu.hidden) showMenu(); else hideMenu();
  }

  function inModal(el) { return !!(el && el.closest && el.closest('.mdl-back')); }

  function frameUp(frame, url) {
    if (!frame.src) frame.src = url;
    return frame;
  }

  // ── ссылка, QR, пин ───────────────────────────────────────────────────────
  function tankLink() { return location.origin + Tank.url; }

  function copyLink(done) {
    var manual = function () {
      Modal.prompt({
        title: I18N.t('menu.link.title'), text: I18N.t('menu.link.text'),
        value: tankLink(), mono: true, confirmLabel: I18N.t('menu.link.ok')
      });
    };
    if (navigator.clipboard) navigator.clipboard.writeText(tankLink()).then(done, manual);
    else manual();
  }

  function drawQr(host, text) {
    if (host.firstChild) return;
    try {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      host.innerHTML = qr.createSvgTag(4, 0);
    } catch (e) { host.parentNode.style.display = 'none'; }
  }

  // ── имя, пароль ───────────────────────────────────────────────────────────
  function renderKey() {
    var b = document.getElementById('m-key');
    b.classList.toggle('warn', !tankLocked);
    b.textContent = I18N.t(tankLocked ? 'menu.pass' : 'menu.pass.set');
  }

  function applyName(name) {
    tankName = name;
    document.getElementById('m-name').textContent = name;
    document.title = name;
  }

  function sendName(name) {
    return Tank.send(Tank.api + '/meta', { method: 'PATCH', body: JSON.stringify({ name: name }) });
  }

  function savePass(value) {
    return Tank.send(Tank.api + '/password', { body: JSON.stringify({ password: value }) });
  }

  function askNewPass(titleKey) {
    return Modal.prompt({
      title: I18N.t(titleKey), text: I18N.t('menu.newpass.text'),
      value: '', placeholder: I18N.t('menu.newpass.ph'), maxLength: 60, mono: true,
      confirmLabel: I18N.t('menu.rename.ok')
    }).then(function (value) {
      if (value === null) return;
      value = value.trim();
      if (value.length < 4) {
        return Modal.alert({
          title: I18N.t('menu.newpass.short.title'), text: I18N.t('menu.newpass.short.text')
        });
      }
      var saved = function (r) {
        if (!r.ok) return Modal.alert({ title: I18N.t('menu.fail.title'), text: I18N.t('menu.fail.pass') });
        Tank.setPass(Tank.id, value);
        tankLocked = true;
        renderKey();
        return Modal.alert({
          title: I18N.t('menu.newpass.saved.title'), text: I18N.t('menu.newpass.saved.text'),
          fields: [{ label: I18N.t('menu.newpass.saved.field'), value: value }],
          okLabel: I18N.t('menu.newpass.saved.ok')
        });
      };
      return savePass(value).then(function (r) {
        if (r.status !== 401 && r.status !== 429) return saved(r);
        return Tank.askPass(Tank.id, {
          title: I18N.t('menu.oldpass.title'), text: I18N.t('menu.oldpass.text')
        }).then(function (got) {
          if (!got) return;
          return savePass(value).then(saved);
        });
      }, function () {
        Modal.alert({ title: I18N.t('menu.fail.title'), text: I18N.t('menu.fail.server') });
      });
    });
  }

  function showAccess() {
    return Modal.confirm({
      title: I18N.t('menu.access.title'), text: I18N.t('menu.access.text'),
      fields: [
        { label: wt('home.created.code'), value: Tank.id },
        { label: I18N.t('home.created.pass'), value: Tank.pass() || '—' }
      ],
      cancelLabel: I18N.t('menu.access.done'),
      confirmLabel: I18N.t('menu.access.change'),
      kind: 'go'
    }).then(function (change) {
      if (change) return askNewPass('menu.newpass.title');
    });
  }

  // ── счётчик обитателей ────────────────────────────────────────────────────
  var TV = /(^|[?&])tv(=|&|$)/.test(location.search);
  var DEMO = /(^|[?&])demo(=|&|$)/.test(location.search);

  function setCount(n) {
    var first = count === null;
    count = n;
    document.getElementById('m-count').textContent =
      n ? I18N.plural(n, opts.counter) : wt('tank.nofish');
    if (first && !n && !menuUsed && !TV) showMenu();
    else if (first && !hintSeen()) tapHint.hidden = false;
  }

  // ── обитатели: опрос сервера ──────────────────────────────────────────────
  // Манифест раскрасок — единственный список видов; берём только свой мир.
  var specs = {};
  var seen = {};       // id записи → handle сцены (null, пока грузится)

  function pollPainted() {
    fetch(Tank.api + '/fish').then(function (r) { return r.json(); }).then(function (list) {
      if (!Array.isArray(list)) return;
      setCount(list.length);
      var alive = {};
      list.forEach(function (item) { alive[item.id] = true; });

      Object.keys(seen).forEach(function (id) {
        if (alive[id]) return;
        if (seen[id]) hooks.removePainted(seen[id]);
        delete seen[id];
        wantShot(2);
      });

      list.forEach(function (item) {
        if (seen.hasOwnProperty(item.id)) return;
        var info = specs[item.kind];
        if (!info) {
          // Вид другого мира или неизвестный — молча пропускаем: записи
          // не наши, ломать из-за них сцену нельзя.
          return;
        }
        seen[item.id] = null;
        new THREE.TextureLoader().load(Tank.api + '/fish/' + item.id + '/texture.png', function (tex) {
          if (!seen.hasOwnProperty(item.id)) return;      // удалили, пока грузилась
          hooks.spawnPainted(item, info, tex, function (handle) {
            if (!handle) { delete seen[item.id]; return; }
            if (seen.hasOwnProperty(item.id)) { seen[item.id] = handle; wantShot(4); }
            else hooks.removePainted(handle);             // удалили, пока строился
          });
        });
      });
    }).catch(function () { /* сервер без API — просто пусто */ });
  }

  function initPainted() {
    fetch('/assets/coloring/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (m) {
        (m.fish || []).forEach(function (f) {
          if ((f.world || 'aquarium') === opts.world) specs[f.name] = f;
        });
      })
      .catch(function () { console.error('не загрузился манифест раскрасок'); })
      .then(function () {
        pollPainted();
        setInterval(pollPainted, 5000);
      });
  }

  function initSettings() {
    var poll = function () {
      fetch(Tank.api + '/settings').then(function (r) { return r.json(); })
        .then(function (s) { if (hooks.onSettings) hooks.onSettings(s); })
        .catch(function () { /* без сервера настроек нет */ });
    };
    poll();
    setInterval(poll, 3000);
  }

  // ── снимок-превью для карточки на главной ─────────────────────────────────
  var SHOT_W = 480, SHOT_H = 270, SHOT_GAP = 10;
  var shotWanted = 0, shotLast = -99, shotEver = false, shotCanvas = null;
  var sRenderer, sScene, sCamera, sClock;

  function attachShots(renderer, scene, camera, clock) {
    sRenderer = renderer; sScene = scene; sCamera = camera; sClock = clock;
  }

  function wantShot(delay) {
    var at = sClock ? sClock.elapsedTime + delay : delay;
    if (!shotWanted || at > shotWanted) shotWanted = at;
  }

  function takeShot(rerender, beacon) {
    if (!shotCanvas) {
      shotCanvas = document.createElement('canvas');
      shotCanvas.width = SHOT_W;
      shotCanvas.height = SHOT_H;
    }
    if (rerender) sRenderer.render(sScene, sCamera);
    var src = sRenderer.domElement;
    var scale = Math.max(SHOT_W / src.width, SHOT_H / src.height);
    var cw = Math.min(src.width, SHOT_W / scale);
    var ch = Math.min(src.height, SHOT_H / scale);
    shotCanvas.getContext('2d').drawImage(
      src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, 0, 0, SHOT_W, SHOT_H);
    var body = JSON.stringify({ image: shotCanvas.toDataURL('image/jpeg', 0.72) });
    shotEver = true;
    shotLast = sClock ? sClock.elapsedTime : 0;
    shotWanted = 0;
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(Tank.api + '/preview', new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(Tank.api + '/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body
    }).catch(function () { /* не критично */ });
  }

  // Звать в конце каждого кадра, после render.
  function tickShots(t) {
    if (shotWanted && t > shotWanted && t - shotLast > SHOT_GAP) takeShot(false, false);
  }

  // ── сборка ────────────────────────────────────────────────────────────────
  function boot(options) {
    opts = options;
    hooks = options.hooks;

    if (!Tank.id) {
      document.getElementById('loading').innerHTML =
        I18N.t('tank.nopick') + ' <a href="/" style="color:#58d6ff">' + I18N.t('tank.home') + '</a>';
      return;
    }

    document.body.insertAdjacentHTML('beforeend', menuHtml());
    menu = document.getElementById('menu');
    menuCard = document.getElementById('menu-card');
    tapHint = document.getElementById('taphint');
    I18N.mount(document.getElementById('lang'));

    document.getElementById('loading').textContent = wt('tank.loading');
    document.title = wt('tank.doctitle');

    // виды карточки
    document.getElementById('m-capture').onclick = function () {
      showView('menu-capture', false);
      var f = frameUp(document.getElementById('capframe'), Tank.url + '/capture?embed=1');
      if (f.dataset.up && f.contentWindow) f.contentWindow.postMessage({ aqua: 'reset' }, location.origin);
      f.dataset.up = '1';
    };
    document.getElementById('m-print').onclick = function () {
      showView('menu-print', true);
      frameUp(document.getElementById('printframe'), '/print.html?embed=1&world=' + opts.world);
    };
    document.getElementById('m-fish').onclick = function () {
      showView('menu-fish', true);
      frameUp(document.getElementById('fishframe'), Tank.url + '/admin?embed=1&only=fish');
    };
    document.getElementById('m-share').onclick = function () {
      showView('menu-share', false);
      drawQr(document.getElementById('share-qr'), tankLink());
      document.getElementById('pinbox').hidden = true;
      var pinBtn = document.getElementById('m-tvpin');
      pinBtn.hidden = false;
      pinBtn.querySelector('b').textContent = I18N.t('menu.share.pin');
    };
    ['m-capback', 'm-printback', 'm-fishback', 'm-shareback'].forEach(function (id) {
      document.getElementById(id).onclick = function () { showView('menu-main', false); };
    });
    document.getElementById('m-close').onclick = hideMenu;

    var pinBtn = document.getElementById('m-tvpin');
    pinBtn.onclick = function () {
      pinBtn.disabled = true;
      fetch(Tank.api + '/pin', { method: 'POST' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          document.getElementById('pin-digits').textContent = d.pin;
          document.getElementById('pinbox').hidden = false;
          pinBtn.hidden = true;
        })
        .catch(function () { pinBtn.querySelector('b').textContent = I18N.t('menu.share.pin.fail'); })
        .then(function () { pinBtn.disabled = false; });
    };

    var copyItem = document.getElementById('m-copylink');
    copyItem.onclick = function () {
      copyLink(function () {
        var b = copyItem.querySelector('b');
        b.textContent = I18N.t('menu.copied');
        setTimeout(function () { b.textContent = I18N.t('menu.share.copy'); }, 2000);
      });
    };
    var sendItem = document.getElementById('m-sendlink');
    if (navigator.share) {
      sendItem.hidden = false;
      sendItem.onclick = function () {
        navigator.share({ title: tankName, url: tankLink() })
          .catch(function () { /* передумали — не ошибка */ });
      };
    }

    document.getElementById('m-rename').onclick = function () {
      Modal.prompt({
        title: I18N.t('menu.rename.title'), text: I18N.t('menu.rename.text'),
        value: tankName, maxLength: 60, confirmLabel: I18N.t('menu.rename.ok')
      }).then(function (name) {
        if (name === null) return;
        name = name.trim();
        if (!name || name === tankName) return;
        var save = function (r) {
          if (r.ok) return r.json().then(function (m) { applyName(m.name); });
          if (r.status !== 401 && r.status !== 429) return;
          return Tank.askPass(Tank.id, { title: I18N.t('menu.pass.title') }).then(function (got) {
            if (!got) return;
            return sendName(name).then(function (r2) {
              if (r2.ok) return r2.json().then(function (m) { applyName(m.name); });
            });
          });
        };
        return sendName(name).then(save, function () {
          Modal.alert({ title: I18N.t('menu.rename.fail'), text: I18N.t('menu.fail.server') });
        });
      });
    };

    document.getElementById('m-key').onclick = function () {
      if (!tankLocked) return askNewPass('menu.newpass.first');
      if (Tank.pass()) return showAccess();
      Tank.askPass(Tank.id, { title: I18N.t('menu.pass.title') })
        .then(function (got) { if (got) showAccess(); });
    };

    document.addEventListener('click', function (e) {
      if (menuCard.contains(e.target) || inModal(e.target)) return;
      toggleMenu();
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !e.defaultPrevented && !menu.hidden) hideMenu();
    });

    addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.aqua === 'fish-added') { pollPainted(); wantShot(2); }
      if (e.data.aqua === 'height' && e.data.height > 80) {
        ['capframe', 'printframe', 'fishframe'].forEach(function (id) {
          var f = document.getElementById(id);
          if (e.source !== f.contentWindow) return;
          f.style.height = Math.min(e.data.height + 4, innerHeight * 0.78) + 'px';
        });
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'hidden') return;
      if (!sRenderer || !sScene) return;
      if (!shotWanted && shotEver) return;
      takeShot(true, true);
    });

    addEventListener('aqua:lang', applyTexts);
    applyTexts();

    var fail = function (html) {
      var l = document.getElementById('loading');
      if (l) { l.hidden = false; l.innerHTML = html; }
    };

    // Сначала убеждаемся, что пространство есть, — иначе чёрный экран и 404-ки.
    fetch(Tank.api + '/meta').then(function (r) {
      if (!r.ok) {
        Tank.forget(Tank.id);
        fail(wt('tank.notank') +
          '<br><a href="/" style="color:#58d6ff">' + I18N.t('tank.tolist') + '</a>');
        return;
      }
      return r.json().then(function (meta) {
        applyName(meta.name);
        tankLocked = !!meta.locked;
        applyTexts();
        try {
          hooks.init();
        } catch (err) {
          fail(I18N.t('tank.crash', { msg: String(err && err.message || err) }));
          return;
        }
        initPainted();
        initSettings();
      });
    }).catch(function () { fail(I18N.t('tank.noserver')); });
  }

  window.WorldPage = {
    boot: boot,
    wt: wt,
    wantShot: wantShot,
    attachShots: attachShots,
    tickShots: tickShots,
    pollPainted: pollPainted,
    specsOf: function () { return specs; },
    isTV: function () { return TV; },
    isDemo: function () { return DEMO; }
  };
})();
