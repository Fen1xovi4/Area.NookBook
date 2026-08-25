# Area.NookBook — Paper Aquarium

Форк [paper-aquarium](https://github.com/MrMoT9I/paper-aquarium) (MIT, лицензия сохранена в LICENSE).
Интерактивная детская игра: раскрашенный бумажный лист фотографируется и персонаж
оживает в 3D-сцене. Node.js 18+ без зависимостей + Three.js, один Docker-контейнер.

## Миры

Три типа пространства, мир выбирается на главной при создании и записывается в
`meta.json` (`world: aquarium|garden|football`; нет поля = аквариум — все старые):

- **aquarium** — `demos/realistic-tank.html` (живой прод-код, трогаем минимально);
- **garden** — `demos/garden.html`: насекомые летают над лугом, листы — вид сверху;
- **football** — `demos/football.html`: игроки бегают, мяч, рандомные голы, табло;
  команда (red/blue) выбирается на съёмке; второй способ создать игрока — фото
  лица в овальной рамке (`face: true` в записи, форма рисуется канвасом).

`pageFor()` в server.js читает meta и отдаёт страницу мира. Новые страницы
собраны на общих модулях: `assets/world-page.js` (меню/опросы/превью),
`assets/world-page.css`, `assets/steering.js` (движение), `assets/painted-uv.js`
(планарная UV по рамке листа: side/top/front — та же таблица осей, что в
`tools/silhouettes.html`; разойдутся — рисунок ляжет на модель боком).
Виды фильтруются по полю `world` в `assets/coloring/manifest.json` — он
по-прежнему единственный список видов (print.html: `?world=`, capture.html
узнаёт мир из meta и не пускает листы чужого мира).

Модели рыб: купленный пак CGTrader «Coral Reef Fish Collection» (28 рифовых рыб,
Royalty Free — на своём сервере можно, редистрибутить файлы нельзя) + shark/mantaray/dolphin
(CC0 Quaternius) + barramundi (CC0 Khronos, без листа — на него ссылается живая рыбка
в аквариуме 2gsj8dgr3h, не удалять). Итого 32 вида, 15 с листами раскрасок. См. `CREDITS.md`.
Исходный архив купленного пака: `../models-src.zip` (держать ВНЕ assets/ — всё в assets/
раздаётся сайтом, а платный пак публиковать нельзя).

## Продакшн

- **Домен:** https://area.nookbook.pl (DNS уже настроен → 157.173.97.19)
- **SSH:** `ssh deploy@157.173.97.19` (ключевая авторизация, без пароля; uid 1000)
- **Путь на сервере:** `/srv/apps/area-nookbook`
- **Контейнер:** `aqua` (compose: `docker-compose.prod.yml`), наружу порты НЕ открывает —
  только `expose: 8000` во внутренней docker-сети
- **Reverse proxy:** Traefik v3 (`/srv/proxy/`, контейнер `traefik`), внешняя docker-сеть `web`,
  certresolver называется **`le`** (не `letsencrypt` — в апстримном compose было иначе, уже поправлено)

### ⚠️ Чужие проекты на VPS — не трогать

На сервере живут независимые проекты: `/srv/apps/CryptoBotWeb`, `/srv/apps/CalcAdmin`,
`/srv/apps/MSAwebService` и сам Traefik в `/srv/proxy/`. К ним не прикасаемся:
не редактируем файлы, не перезапускаем контейнеры, не меняем сети и не открываем
порты 80/443/8000+ наружу. Любая наша работа — только внутри `/srv/apps/area-nookbook`.
Папка `C:\Users\Asdmin\Desktop\VsCodeProjects\@CLOUDE\CryptoBotWeb` локально — только чтение
(источник справки о VPS).

## Деплой

Git-remote: https://github.com/Fen1xovi4/Area.NookBook (origin). В репозитории
НЕТ моделей (`assets/models/**` в .gitignore, из истории вычищены filter-repo:
платный пак перезаливать нельзя, бесплатные решили тоже не публиковать) —
поэтому деплой НЕ через git: свежий клон неиграбелен, модели живут только
локально и на сервере. Заливаем tar-ом по SSH из корня проекта:

```bash
tar czf - --exclude=.git --exclude=data --exclude=server.log --exclude=.env . \
  | ssh deploy@157.173.97.19 'tar xzf - -C /srv/apps/area-nookbook'
ssh deploy@157.173.97.19 'cd /srv/apps/area-nookbook \
  && cp -r assets/models/pack/* pack/ \
  && docker compose -f docker-compose.prod.yml up -d --build'
```

Нюансы:
- Compose монтирует `./pack:/app/assets/models/pack:ro` — рабочая копия пака на сервере
  лежит в `/srv/apps/area-nookbook/pack/`, поэтому после изменения моделей нужен `cp -r` выше.
  Это касается ТОЛЬКО аквариумного пака: модели садов и футбола лежат в
  `assets/models/garden|football/`, едут с tar-ом и в `pack/` их копировать не нужно.
- `--exclude=data` обязателен: в `data/` на сервере живые детские аквариумы, затирать нельзя.
  Бэкапить её — простым архивом этой папки.
- `.env` на сервере: `DOMAIN=area.nookbook.pl` (+ лимиты AQUA_*). `--exclude=.env`
  в tar обязателен — иначе локальный `.env` затрёт серверный.
- Проверка после деплоя: `curl -s https://area.nookbook.pl/api/pack` — должно вернуть 32 вида;
  `docker ps --filter name=aqua` — статус healthy.

## Пайплайн моделей (если добавляем/меняем виды)

1. GLB (CC0/CC-BY, poly.pizza / Sketchfab / Khronos) → `npx gltf-pipeline -i x.glb -o <папка>/<name>.gltf --separate`.
   Аквариумные рыбы — в `assets/models/pack/<name>/`; виды других миров — в
   `assets/models/garden/` или `assets/models/football/` (НЕ в pack: на проде
   pack затенён read-only bind-mount-ом, см. «Деплой»).
2. Ориентация: если модель не «нос → +Z, спина → +Y», повернуть
   `node tools/normalize-gltf.js <файл.gltf> <градусы-вокруг-Y>` и в данных вида
   поставить `frame: 'identity'` (пропуск эвристики осей — обязателен для
   бабочек и гуманоидов, у них габаритный разбор врёт). Проверка ориентации —
   смотровая `/tools/model-view.html?url=…` (4 ракурса с осями).
3. Добавить вид: рыбы пака — в `assets/models/pack/pack.json`; ВСЕ виды с
   листами — в `SPECIES` в `tools/make-coloring.js` И в `tools/model-sources.json`
   (его читает silhouettes.html). Поля: `world`, `projection` (side/top/front),
   `model`, `frame`, `lengthAxis: 'y'` для гуманоидов (len = рост).

   ┌ ТОЛЬКО ДОБАВЛЯТЬ В КОНЕЦ SPECIES. Вставка/перестановка/удаление сдвигает ┐
   │ коды угловых меток последующих видов — все напечатанные листы умирают.   │
   └ Страхует tools/codes.lock.json: при сдвиге генератор откажется работать. ┘

4. Локально `PORT=8300 node server.js`, затем снять контуры headless-браузером
   (скрипт-образец: puppeteer-core + Edge, открывает `/tools/silhouettes.html`,
   ждёт `window.SIL_DONE`, сохраняет `window.SIL` → `tools/contours.json`,
   `window.SIL_INNER` → `tools/inner-fins.json`)
5. `node tools/make-coloring.js` — перегенерирует SVG-листы и `assets/coloring/manifest.json`.
   После — `git diff`: старые SVG обязаны остаться байт-в-байт.
6. Прогнать `/tools/test-capture.html` тем же способом (`window.TEST_RESULT`) — должно быть 0 провалов
7. Атрибуцию новых моделей — в `CREDITS.md`.

`tools/silhouettes.html`: модели без скелета (goldfish, barramundi) ориентируются
габаритным эвристиком (`boundsFrame`), как в `assets/fish-glb.js`; виды с
`frame: 'identity'` не ориентируются вовсе; проекция листа (side/top/front)
задаётся в `tools/model-sources.json` — та же таблица осей, что в
`assets/painted-uv.js`.
