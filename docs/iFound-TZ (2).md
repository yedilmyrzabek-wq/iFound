# iFound — техническое задание на MVP

*Версия 1.1 · 14 ноября 2026 · для разработчиков команды · добавлена свайп-колода (раздел 8.12)*
*Конкурс: Business Cup 2.0 · сдача 15 ноября, 12:00 (Астана)*

Документ описывает, **что** строим и **как именно** это должно работать. Продуктовая логика и питч — в `iFound-spec.md`. Если ТЗ и spec расходятся, верно ТЗ.

Интерфейс, тексты и письма — **только на английском**. Названия в коде — на английском. Пояснения в документе — на русском.

---

## 0. Жёсткие требования конкурса (pass/fail)

Нарушение любого пункта = заявка неполная или дисквалифицирована. Проверять перед каждой сдачей.

- [ ] **Только B2C.** Платит человек. Заведения **никогда** ничего не оплачивают — ни размещение, ни продвижение, ни лимиты.
- [ ] **Только веб.** Работает в браузере, мобильного приложения нет.
- [ ] **Без регистрации и входа.** Жюри проходит весь основной сценарий (найти план → присоединиться → создать свой) без аккаунта, пароля и подтверждения почты.
- [ ] **Продукт в проде** по публичной ссылке.
- [ ] **Публичный GitHub-репозиторий**, без запросов доступа.
- [ ] **Ядро настоящее**, ничего не захардкожено. Жюри читает код.
- [ ] Пичдек до 10 слайдов в PDF (вне этого ТЗ).

---

## 1. Продукт за минуту

**iFound** — веб-сервис, где любой может предложить встречу в конкретном месте и в конкретное время (настолки в кафе, пробежка в парке, футбол на поле). **План состоится только если наберётся минимальное число людей.** Пока порог не набран — ничего не происходит. Набрался — всем приходит письмо «It's on». Не набрался за 2 часа до начала — план тихо отменяется, все получают уведомление.

Человек жмёт «I'm in» без риска прийти в пустоту. Это ядро продукта и главная механика для жюри.

**Рынок:** США, взрослые 25–45. **Города MVP:** 5, основной — Остин.

---

## 2. Решения, зафиксированные с командой

| # | Вопрос | Решение |
|---|---|---|
| 1 | Рынок | Только США. Астаны в продукте нет |
| 2–3 | Города | 5 городов, Остин основной (см. раздел 5) |
| 4 | Кто создаёт планы | И пользователи, и заведения |
| 5 | Скидки заведений | Не в MVP, вторая очередь |
| 6 | Активности | Фиксированный список + «Other» со своим текстом |
| 7 | Порог | От 3 до 12, по умолчанию 6 |
| 8 | Не набралось | Автоотмена за 2 часа до начала, всем письмо |
| 9 | Выход из плана | Можно; после подтверждения статус назад не откатывается |
| 10 | Вход после подтверждения | Можно, до максимума мест |
| 11 | Уведомления | Email в MVP; SMS — вторая очередь (раздел 24) |
| 12 | Что видно об участниках | Имя и фото |
| 13 | Координация участников | Не делаем. Чатов нет |
| 14 | Антиспам | Лимиты на создание, кнопка жалобы |
| 15 | Возраст | 18+, бары не засеваем |
| 16 | Оплата | Stripe, тестовый режим |
| 17 | Что платное | Создавать больше 1 плана в месяц; видеть участников до вступления |
| 18 | Домен | Покупаем |
| 19 | Инфраструктура | Есть. Стек — раздел 10 |
| 20 | ИИ | Нужен, во второй очереди (раздел 24). В MVP закладываем точку подключения |
| 21 | Владелец репозитория | Не решено (раздел 25) |
| 22 | Название | iFound |
| 23 | Язык | Только английский |

---

## 3. Объём работ

### MVP — обязательно
1. Обзорная карта США с 5 городами и числом открытых планов.
2. Страница города: карта заведений + список планов, фильтры по дню и активности.
3. Страница плана со счётчиком «X of N», прогрессом и статусом.
4. Присоединение без регистрации: имя, email, фото (по желанию), чекбокс 18+.
5. Выход из плана — со страницы и по ссылке из письма.
6. Создание плана пользователем: активность, место, время, порог.
7. Создание плана от имени заведения с подтверждением по почте (не блокирует публикацию).
8. Логика порога: атомарное подтверждение, автоотмена, завершение.
9. Письма: присоединился, план подтверждён, план отменён, подтверждение заведения, ссылки на управление.
10. Файл `.ics` для календаря.
11. Правила видимости участников и пейволл.
12. Stripe Checkout, подписка iFound+ $8/мес, тестовый режим.
13. Лимиты, жалобы, простая админка.
14. Лист ожидания для других городов.
15. Страница «Мои планы».
16. Страницы Terms, Privacy, Safety.
17. Адаптивная вёрстка, мобильные — приоритет (жюри будет открывать по QR с телефонов).
18. Свайп-колода планов (раздел 8.12) — делается после того, как заработало ядро.

### Желательно, если останется время
- OG-картинка для каждого плана (превью при шеринге в LinkedIn и Threads).
- Ссылка «Add to Google Calendar».
- Stripe Billing Portal для отмены подписки.

### Не делаем
Чаты, профили, отзывы, рейтинги, лента, подписки на людей, поиск по людям, рекомендации, push-уведомления, мобильное приложение, вход через соцсети, мультиязычность.

---

## 4. Роли и идентификация без регистрации

### Токен браузера
При первом заходе `middleware.ts` выдаёт cookie `ifound_uid` — случайный UUID v4.

- `httpOnly`, `secure`, `sameSite=lax`, срок 400 дней.
- **Важно:** при первом запросе cookie ещё нет во входящем запросе, и серверный компонент её не увидит. В middleware кладите токен **и в ответ, и в заголовки запроса** (`NextResponse.next({ request: { headers } })`), иначе первый рендер будет без токена.
- По токену сервер определяет «мои» планы, участие, хозяина, лимиты и подписку.
- `localStorage` для идентификации не используем.

Если человек очистил cookie, он не теряет участие: в каждом письме есть подписанная ссылка на управление.

### Роли

| Роль | Как определяется | Что может |
|---|---|---|
| Гость | Любой с токеном | Смотреть, присоединяться, создавать (в пределах лимита) |
| Участник | Есть активная запись в `participants` с его токеном | Видеть участников плана, выйти, скачать `.ics` |
| Хозяин | `events.host_token` совпадает | Всё, что участник, плюс отменить план. Выйти не может — только отменить |
| Заведение | Подписанная ссылка из письма + подтверждённая заявка | Создавать планы от имени заведения, видеть число записавшихся, отменять свои планы |
| Подписчик | Токен привязан к активной подписке | Без лимита на создание; видит участников до вступления |
| Админ | Cookie, выданная после визита `/admin?key=ADMIN_SECRET` | Модерация, демо-планы, статистика, обход лимитов |

---

## 5. Города и заведения

### Города

| slug | Название | Часовой пояс (IANA) | Центр (lat, lng) | Заведений |
|---|---|---|---|---|
| `austin` | Austin, TX | `America/Chicago` | 30.2672, −97.7431 | ~30 |
| `new-york` | New York, NY | `America/New_York` | 40.7128, −74.0060 | 10–15 |
| `chicago` | Chicago, IL | `America/Chicago` | 41.8781, −87.6298 | 10–15 |
| `denver` | Denver, CO | `America/Denver` | 39.7392, −104.9903 | 10–15 |
| `seattle` | Seattle, WA | `America/Los_Angeles` | 47.6062, −122.3321 | 10–15 |

Остин засеваем глубже всего — на нём демо. Остальные четыре предложены мной; замена — правкой одной строки в сиде (раздел 25).

### Источник заведений — OpenStreetMap

Скрипт `scripts/seed-venues.ts` **запускается один раз разработчиком**, результат коммитится в `data/venues/<city>.json`. В рантайме к Overpass не обращаемся.

Запрос к Overpass API на каждый город:

```
[out:json][timeout:90];
(
  node["amenity"="cafe"]["name"](around:4000,{LAT},{LNG});
  node["shop"="games"]["name"](around:8000,{LAT},{LNG});
  node["amenity"="cinema"]["name"](around:8000,{LAT},{LNG});
  node["amenity"="library"]["name"](around:6000,{LAT},{LNG});
  node["amenity"="community_centre"]["name"](around:6000,{LAT},{LNG});
  way["leisure"="park"]["name"](around:6000,{LAT},{LNG});
  way["leisure"="pitch"]["sport"="soccer"](around:10000,{LAT},{LNG});
);
out center tags;
```

Обработка:
- Для `way` берём координаты из `center`.
- Отбрасываем объекты без имени (у футбольных полей имени может не быть — подставляем `"Soccer field, <имя парка или улицы>"`, а безымянные без адреса отбрасываем).
- Адрес собираем из `addr:housenumber`, `addr:street`, если есть.
- Бары, пабы и ночные клубы в запрос не входят — так и оставить (требование 18+ без алкоголя в засеве).
- `osm_ref` = `node/<id>` или `way/<id>`, уникален.
- Дальше **третий участник команды вручную** отбирает нужное количество: узнаваемые места, разумный разброс по центру, баланс категорий.

### Категории заведений и связь с активностями

| Категория | Подсказываем для активностей |
|---|---|
| `cafe` | board_games, coffee |
| `game_store` | board_games |
| `park` | run, walk, soccer |
| `pitch` | soccer |
| `cinema` | movie |
| `library`, `community_centre` | board_games, other |

Подсказка — это сортировка на шаге выбора места, а не запрет. Выбрать можно любое заведение.

### Своё место
Если подходящего заведения нет — «Somewhere else»: человек ставит точку на карте и пишет название места (2–60 символов). Геокодинг не делаем.

### Атрибуция
- Данные OpenStreetMap распространяются под лицензией ODbL — на карте и в футере обязательна строка **«© OpenStreetMap contributors»**.
- **Не используйте публичный `tile.openstreetmap.org` для прода** — его политика использования не рассчитана на приложения. Возьмите провайдера тайлов с бесплатным тарифом (MapTiler, Stadia Maps, Carto). URL шаблона и атрибуция — в переменных окружения.

---

## 6. Главная механика: жизненный цикл плана

### Параметры плана

| Поле | Правило |
|---|---|
| `min_people` | Порог, 3–12, по умолчанию 6. **Хозяин-человек считается первым участником** |
| `max_people` | От `min_people` до 20. По умолчанию `min(2 × min_people, 20)` |
| `starts_at` | Не раньше чем через 3 часа и не позже чем через 30 дней от момента создания |
| `duration_minutes` | 60, 90, 120 или 180; по умолчанию 120 |
| Дедлайн набора | `starts_at − 2 часа` |

Почему «не раньше чем через 3 часа»: при меньшем запасе дедлайн набора наступит почти сразу, и план отменится, не успев собрать людей.

Для плана от заведения хозяин участником **не считается**, счётчик стартует с 0.

### Статусы

```
                 набрали min_people
   ┌─────────┐ ─────────────────────▶ ┌───────────┐  время окончания  ┌───────────┐
   │ filling │                        │ confirmed │ ────────────────▶ │ completed │
   └─────────┘                        └───────────┘                   └───────────┘
        │  дедлайн набора / хозяин отменил     │ хозяин отменил
        ▼                                      ▼
   ┌───────────┐ ◀─────────────────────────────┘
   │ cancelled │
   └───────────┘
```

### Правила переходов

| Ситуация | Результат |
|---|---|
| Присоединение, статус `filling`, после него счётчик ≥ `min_people` | Статус → `confirmed`, всем участникам письмо «It's on» — **ровно один раз** |
| Присоединение, статус `filling`, счётчик < `min_people` | Счётчик +1, письмо только присоединившемуся |
| Присоединение, статус `confirmed`, есть места | Счётчик +1, письмо присоединившемуся «It's on, you're in» |
| Присоединение, мест нет | Отказ `full` |
| Присоединение после дедлайна набора при `filling` | Отказ `closed` |
| Присоединение после `starts_at` | Отказ `closed` |
| Повторное присоединение тем же токеном **или тем же email** | Отказ `already_joined` |
| Выход участника при `filling` | Счётчик −1 |
| Выход участника при `confirmed` | Счётчик −1, **статус остаётся `confirmed`** |
| Выход хозяина | Запрещён, `host_must_cancel` — хозяин может только отменить |
| Хозяин отменил | `cancelled`, причина `host`, всем письмо |
| Наступил дедлайн набора, статус `filling` | `cancelled`, причина `unfilled`, всем письмо |
| Прошло `starts_at + duration`, статус `confirmed` | `completed` |
| Набралось 3 жалобы от разных токенов | `hidden = true`, план пропадает из списков |

Уникальность по email (без учёта регистра) нужна, чтобы порог нельзя было набрать одним человеком, очищающим cookie.

### Конкурентность — критично

Подтверждение должно происходить **атомарно**. Два одновременных присоединения на последнее место не должны дать два подтверждения, двойную рассылку или превышение максимума.

Решение: вся логика в функциях Postgres с блокировкой строки плана `SELECT … FOR UPDATE` (раздел 11). Порядок блокировок везде одинаковый: сначала план, потом участник. Письма о подтверждении шлёт только тот запрос, который получил `just_confirmed = true`, плюс идемпотентность через `email_log`.

Дополнительная страховка: при чтении плана сервер вычисляет **фактический статус** — если `filling` и дедлайн набора прошёл, показываем как отменённый, даже если крон ещё не отработал.

### Часовые пояса — самая вероятная ошибка

**Жюри откроет продукт в Астане (UTC+5), а планы — в США.** Если время показывается в часовом поясе браузера, план на 19:00 в Остине покажется как 6:00 утра следующего дня. Это убьёт демо.

Правила:
1. В базе `starts_at` хранится как `timestamptz` (UTC).
2. **Показываем всегда во времени города**, с подписью пояса: `Thu, Nov 20 · 7:00 PM CT`.
3. Если пояс браузера отличается — дополнительная строка мелким шрифтом: `That's 6:00 AM Fri in your time`. Рендерить только на клиенте.
4. **Форма создания трактует введённое время как время города**, а не браузера. Подпись у поля: `Central Time (Austin)`.
5. Фильтры «Today», «Tomorrow», «This weekend» считаются в поясе города.
6. Используйте Luxon (или аналог с IANA-поясами). Голый `new Date()` для этой логики запрещён.
7. Серверный и клиентский рендер времени должны использовать один и тот же форматтер с явным поясом, иначе будут ошибки гидратации.

---

## 7. Видимость данных и платные возможности

### Кто что видит

| Данные | Гость | Участник или хозяин этого плана | Подписчик iFound+ | Заведение (по ссылке управления) |
|---|---|---|---|---|
| Активность, место, время, описание | да | да | да | да |
| Счётчик «X of N» и прогресс | да | да | да | да |
| Имя и фото хозяина-человека | да | да | да | да |
| Имена и фото остальных участников | **нет** — серые кружки с замком | да | да | нет, только число |
| Email любого участника | никогда | никогда | никогда | никогда |

Гостям **фото и имена участников вообще не передаются** с сервера — не прячем на клиенте, а не отдаём. Фото лежат в приватном хранилище, сервер выдаёт подписанные ссылки только тем, кому положено (раздел 13).

### Бесплатно и платно

| | Free | iFound+ — $8/мес |
|---|---|---|
| Смотреть и присоединяться | без ограничений | без ограничений |
| Создавать планы от себя | 1 за 30 дней | без месячного лимита (общий лимит 3 в сутки) |
| Видеть участников до вступления | нет | да |
| Планы от имени заведения | **всегда бесплатно**, месячный лимит не применяется | — |

**Почему заведения освобождены от лимита:** если заведение упрётся в лимит и ему придётся платить, это B2B-выручка — прямое нарушение правил конкурса.

Месячный лимит считается по токену **и** по email хозяина, чтобы его нельзя было обойти очисткой cookie.

---

## 8. Экраны

Все тексты ниже — финальные, английские. Ключевые строки собраны в разделе 9.

### 8.1. `/` — главная

**Задача:** за 5 секунд объяснить механику и привести в город.

- Шапка: логотип iFound, переключатель городов, `My plans`, `iFound+`.
- Заголовок: **Plans that only happen when enough people are in.**
- Подзаголовок: *Pick a plan near you and tap I'm in. If enough people join, it's on. If not, it's quietly called off — nobody shows up alone.*
- **Карта США** (Leaflet, центр ≈ 39.5, −98.35, масштаб ≈ 4) с маркерами 5 городов. На каждом маркере — число открытых планов. Клик → `/c/<city>`.
- Под картой — чипы городов (на мобильных карта мелкая, чипы основные).
- Блок «Happening in Austin» — 3–6 ближайших планов карточками.
- Блок «How it works» — три шага: *Pick a plan · Tap I'm in · It's on when it fills*.
- Кнопки `Swipe plans in Austin` (ведёт в свайп-колоду, раздел 8.12) и `Start a plan`.
- Блок листа ожидания: *Not in these cities yet? Tell us where you are.* — email + город.
- Футер.

### 8.2. `/c/[city]` — город

- Заголовок: `Austin, TX` и подпись `Times shown in Central Time`.
- Десктоп: список слева, карта справа, отдельная вкладка `Swipe`. Мобильные: переключатель `Swipe · List · Map`, по умолчанию **`Swipe`** (раздел 8.12).
- Фильтры:
  - день: `Today` · `Tomorrow` · `This weekend` · `All upcoming` (по умолчанию `All upcoming`), в поясе города;
  - активности: чипы, мультивыбор.
- Список: только `filling` и `confirmed`, не скрытые, по возрастанию времени. Отменённые и прошедшие доступны только по прямой ссылке.
- Карточка плана: эмодзи активности, название, место, `Thu 7:00 PM · in 5 h`, счётчик `4 of 6 · needs 2 more` с полосой прогресса, бейдж статуса (`Filling` / `It's on` / `Full`), бейдж `Hosted by Dicey Cafe ✓` для подтверждённых заведений, бейдж `Demo` для демо-планов.
- Карта: маркеры всех заведений города. Заведения с открытыми планами — выделенный маркер с числом планов. Клик по заведению → попап: список его планов + `Start a plan here` (ведёт на `/new?venue=<id>`).
- Пустое состояние: *No plans in Austin yet. Start one — it only happens if people join.* + кнопка.
- Список обновляется раз в 30 секунд.

### 8.3. `/e/[code]` — план

**Это главный экран демо.**

- Хлебные крошки: город.
- Название, эмодзи активности, бейдж статуса, бейдж `Demo` при необходимости.
- **Когда:** `Thursday, Nov 20 · 7:00–9:00 PM CT`, относительное время `in 2 days`, и строка «в вашем времени», если пояс браузера другой.
- **Где:** название и адрес, мини-карта, ссылка `Open in Google Maps` (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`).
- **Хозяин:** `Hosted by Alex` с аватаром или `Hosted by Dicey Cafe ✓`.
- **Блок счётчика — крупно:**
  - `filling`: **`4 of 6 are in — needs 2 more`** + полоса + пояснение *If it doesn't reach 6 by Thu 5:00 PM CT, it's called off and everyone's notified.*
  - `confirmed`: **`It's on! 6 people are going`** + *Room for 4 more*.
  - `full`: **`It's on — full`**.
- **Участники:**
  - видимы — аватары и имена;
  - не видимы — N серых кружков с замком и строка *See who's going — join the plan or get iFound+*.
- **Действия по состоянию:**

| Состояние для зрителя | Что показываем |
|---|---|
| Не участник, есть места, приём открыт | Кнопка **`I'm in`** → форма присоединения |
| Участник | `You're in ✓` · `Can't make it` · `Add to calendar` (при `confirmed`) · `Share` |
| Хозяин | `You're hosting` · `Cancel plan` (с подтверждением) · `Share` |
| Мест нет | Неактивная кнопка `Full` |
| `filling`, дедлайн прошёл | Баннер *Didn't fill — called off* |
| `cancelled` хозяином | Баннер *The host called this off* |
| `completed` | Баннер *This plan already happened* |

- **Форма присоединения** (раскрывается на месте или модально):
  - `First name` — обязательно;
  - `Email` — обязательно, подпись *We'll only email you about this plan*;
  - `Photo` — по желанию, подпись *Add a photo so people recognize you*;
  - `[ ] I'm 18 or older` — обязательно;
  - кнопка `Count me in`.
- **Момент подтверждения:** если ответ сервера `just_confirmed = true`, показываем праздничное состояние: **You made it happen — it's on!** Это кульминация демо на сцене.
- Счётчик опрашивается каждые 8 секунд, пока страница открыта. На сцене жюри увидит, как число растёт на всех телефонах одновременно.
- Внизу мелко: `Report`.

### 8.4. `/new` — создать план

Один экран, блоки сверху вниз. С параметром `?venue=<id>` место предвыбрано.

1. **Город** — предвыбран из контекста.
2. **What** — плитки активностей (раздел 9). `Other` раскрывает поле на 40 символов.
3. **Where** — карта города + поиск по названию среди засеянных заведений (фильтр на клиенте). Подходящие под активность заведения выше. Кнопка `Somewhere else` → поставить точку и написать название.
4. **When** — дата и время с шагом 15 минут **в поясе города** (подпись `Central Time (Austin)`), длительность. Ошибки: *Pick a time at least 3 hours from now* / *Pick a date within the next 30 days*.
5. **How many** — степпер 3–12, по умолчанию 6, подпись *It only happens if at least 6 people are in — including you*. Под `More options` — максимум мест.
6. **Title** — по желанию. Пусто → генерируем `Board games at Dicey Cafe`. **Description** — по желанию, до 280 символов.
7. **You** — имя, email, фото по желанию, чекбокс 18+.
8. **Post as this venue** — переключатель, доступен только если выбрано засеянное заведение. Раскрывает поле рабочего email и подпись *We'll email you a link to verify. Your plan goes live right away.*
9. Кнопка **`Start plan`**.

После создания → `/e/<code>` с подсказкой *Share it — it needs 5 more people* и кнопками копирования и нативного шеринга.

Если исчерпан бесплатный лимит (и это не план от заведения) — модалка: *Free includes 1 plan a month. Get iFound+ for unlimited plans — $8/month.* Кнопки `Get iFound+` и `Not now`.

### 8.5. `/me` — мои планы

- Вкладки `Going` · `Hosting` · `Past`.
- Карточки со статусом и действиями (выйти, отменить).
- Статус подписки: `iFound+ active until Dec 14` или ссылка `Restore iFound+`.
- Пояснение: *Your plans are saved in this browser. Switched browsers? Use the links in your emails.*

### 8.6. Подписка

- `/plus` — сравнение Free и iFound+, кнопка `Get iFound+` → Stripe Checkout. При тестовом ключе — заметный баннер: **Test mode — use card 4242 4242 4242 4242. No real charges.** Ссылка `Already a member? Restore`.
- `/plus/success?session_id=…` — сервер проверяет сессию и привязывает токен браузера к подписке. Текст: *You're in iFound+.*
- `/plus/restore` — форма email → письмо со ссылкой → `/plus/restore/[token]` привязывает текущий браузер.

### 8.7. `/l/[token]` — выход по ссылке из письма

Страница с вопросом *Leave "Board games at Dicey Cafe"?* и кнопкой `Leave`.

**Выход только по нажатию кнопки (POST), не по открытию ссылки.** Почтовые сканеры безопасности открывают ссылки из писем автоматически — GET-ссылка выписала бы людей из планов без их ведома.

### 8.8. Заведение

- `/v/verify/[token]` — *Confirm you represent Dicey Cafe* + кнопка `Confirm`. После нажатия заявка подтверждена, на планах появляется бейдж `✓`.
- `/v/manage/[token]` — планы заведения со счётчиками (только число людей, без имён), отмена, ссылка `Start a plan as Dicey Cafe`.

Пока заявка не подтверждена, план показывается как обычный план от человека, без бейджа заведения.

### 8.9. `/admin`

Вход: `/admin?key=<ADMIN_SECRET>` выставляет admin-cookie.

- **Жалобы:** очередь, действия «скрыть план», «скрыть фото», «отклонить жалобу».
- **Планы:** поиск, скрыть, пометить как демо.
- **Создать демо-план** от имени команды (без лимитов, флаг `is_demo`).
- **Статистика:** планы, присоединения, подтверждённые планы, лист ожидания по городам, подписки, конверсии воронки.

### 8.10. Служебные страницы

- `/terms` — условия: 18+, мы не проверяем личность, отвечаете за себя сами.
- `/privacy` — храним имя, email, фото; email не показываем никому; удаление по запросу на почту поддержки.
- `/safety` — *Meet in public places. We don't verify identities. Tell a friend where you're going. Report anything that feels off.*

### 8.11. Общее

- Mobile-first. Ширина от 360 px.
- Футер: Terms · Privacy · Safety · © OpenStreetMap contributors.
- Переключатель городов в шапке на всех страницах.

### 8.12. Свайп-колода — `/c/[city]/swipe`

**Задача:** выбирать, куда пойти, как в игре. Свайп вправо — `I'm in`, влево — пропустить. На мобильных это главный экран города.

**Где живёт:**
- на мобильных страница города открывается переключателем `Swipe · List · Map`, по умолчанию `Swipe`;
- на десктопе по умолчанию `List`, вкладка `Swipe` доступна;
- на главной кнопка `Swipe plans in Austin`.

**Какие планы попадают в колоду:**
- статус `filling` или `confirmed`, есть свободные места, приём открыт (до дедлайна набора и до начала), план не скрыт;
- зритель в нём ещё не участвует и не является хозяином;
- зритель его раньше не пропускал (пропущенные хранятся в localStorage под ключом `ifound_skipped_<city>`, не больше 500 id);
- фильтр дня `Today · Tomorrow · This week` в поясе города, по умолчанию `This week`.

**Порядок:**
1. `filling` — по возрастанию `min_people − participant_count` (кому меньше всех не хватает — первым), при равенстве по `starts_at`.
2. `confirmed` со свободными местами — по `starts_at`.

Смысл: свайп вправо по плану, которому не хватает одного человека, сразу делает его состоявшимся. Так подтверждается больше планов, и пользователь чаще видит самый приятный момент продукта.

Параметр `?first=<code>` ставит указанный план первым — для демо на сцене. Если план не подходит под правила выше (уже участвуешь, нет мест, приём закрыт), параметр молча игнорируется.

**Карточка:**
- крупный эмодзи активности, название, место;
- `Thu 7:00 PM CT · in 5 h`;
- счётчик и полоса прогресса;
- хозяин — имя и аватар;
- бейджи: `1 away from happening!` (не хватает одного), `It's on`, `Hosted by … ✓`, `Demo`;
- **участники на карточке не показываются** — правила видимости раздела 7 не меняются;
- тап по карточке открывает `/e/[code]`.

**Управление:**

| Действие | Жест | Кнопка | Клавиша |
|---|---|---|---|
| Присоединиться | свайп вправо | ✓ `I'm in` | → |
| Пропустить | свайп влево | ✕ `Skip` | ← |
| Подробнее | тап | — | Enter |

Кнопки обязательны: жест знают не все, а на десктопе свайпа нет.

Жест засчитывается, если карточку протащили больше чем на 30% ширины или отпустили с заметной скоростью. Иначе она возвращается на место. Во время перетаскивания карточка наклоняется, поверх появляется зелёная надпись `IN` или серая `SKIP`.

**Первое присоединение и сохранённый профиль:**
- Если у браузера ещё нет сохранённого профиля, свайп вправо открывает снизу короткую форму: имя, email, фото по желанию, `I'm 18 or older`. Отправка формы — присоединение. Закрыли форму — карточка возвращается.
- После первого успешного присоединения или создания плана через форму сервер запоминает имя, email и фото для этого токена в таблице `guest_profiles`. Согласие 18+ уже дано в этой форме.
- Дальше свайп вправо присоединяет **в одно касание**.
- Это **не аккаунт**: нет пароля и входа, данные привязаны к cookie этого браузера. Правило «без регистрации» не нарушается.
- Ссылка `Not you? Clear` в форме и на `/me` удаляет профиль — на случай общего компьютера.
- Обычная форма присоединения на странице плана тоже подставляет сохранённые данные.

**Ответы сервера:**

| Результат | Что видит человек |
|---|---|
| `joined`, план ещё набирается | Карточка улетает, тост `You're in — Undo` на 5 секунд |
| `joined` + `justConfirmed` | Полноэкранное `You made it happen — it's on!`, **без Undo** |
| `full` / `closed` | Карточка убирается, тост `This one just filled up` / `Joining closed` |
| `already_joined` | Карточка убирается молча |
| `rate_limited` | Карточка возвращается, тост `Slow down a bit` |
| Ошибка сети или 5xx | Карточка возвращается, тост `Couldn't join — try again` |

Анимацию запускаем сразу, но окончательно убираем карточку только после ответа сервера.

**Undo** вызывает выход из плана. Письмо «You're in», если уже ушло, не отзывается — это допустимо. Undo не показываем, если присоединение подтвердило план: письма «It's on» уже ушли всем, выйти можно со страницы плана.

**Конец колоды:** `That's everything in Austin this week.` + `Start a plan` + `Show skipped` (очищает пропущенные) + переключатель города. Если колода пуста с самого начала — то же состояние.

**Техника:**
- Жесты — framer-motion: `drag="x"`, решение в `onDragEnd` по смещению и скорости.
- В DOM одновременно не больше 3 карточек. Следующая порция подгружается, когда осталось 2.
- `touch-action: pan-y` на карточке, чтобы вертикальная прокрутка страницы не ломалась.
- `prefers-reduced-motion` — без наклона и полёта, просто смена карточки.
- Колода по центру, ширина не больше 420 px.

**API:**
- `GET /api/deck?city=&day=&first=&cursor=` — упорядоченные карточки порциями по 10, без планов, где зритель участвует или хозяин. Пропущенные фильтрует клиент.
- `POST /api/events/:code/join` дополнительно принимает `{ "useSavedProfile": true }`: сервер берёт имя, email и фото из `guest_profiles`. Профиля нет — `400 profile_required`, клиент открывает форму.
- `GET /api/me` возвращает и собственный профиль гостя. Свой email владельцу показывать можно — запрет раздела 7 касается чужих.
- `DELETE /api/me/profile` — `Not you? Clear`.

**Миграция `003_guest_profiles.sql`:**

```sql
create table guest_profiles (
  user_token    uuid primary key,
  display_name  text not null check (char_length(display_name) between 1 and 30),
  email         text not null,
  photo_path    text,
  updated_at    timestamptz not null default now()
);
alter table guest_profiles enable row level security;
```

Профиль обновляется (upsert) после каждого успешного присоединения или создания плана через форму.

**Готово, когда:**
- на телефоне в Остине можно свайпнуть вправо три плана подряд: первый — с формой, два следующих — в одно касание;
- план, которому не хватало одного человека, подтверждается свайпом, появляется праздничный экран;
- пропущенная карточка не возвращается после перезагрузки страницы;
- на десктопе работают кнопки и стрелки клавиатуры.

---

## 9. Тексты интерфейса

### Активности

| Код | Подпись | Эмодзи |
|---|---|---|
| `board_games` | Board games | 🎲 |
| `coffee` | Coffee | ☕ |
| `run` | Run | 🏃 |
| `soccer` | **Soccer** | ⚽ |
| `movie` | Movie | 🎬 |
| `walk` | Walk | 🚶 |
| `other` | Other | ✨ |

**В США «football» — это американский футбол.** Наш футбол везде называется **Soccer**.

### Ключевые строки

| Где | Текст |
|---|---|
| Счётчик, набор | `4 of 6 are in — needs 2 more` |
| Счётчик, кратко | `4 of 6 · needs 2 more` |
| Подтверждён | `It's on! 6 people are going` |
| Бейдж статусов | `Filling` · `It's on` · `Full` · `Called off` · `Happened` |
| Главная кнопка | `I'm in` |
| После вступления | `You're in ✓` |
| Выйти | `Can't make it` |
| Отправить форму | `Count me in` |
| Отмена хозяином | `Cancel plan` |
| Не набралось | `Didn't fill — called off` |
| Пейволл участников | `See who's going — join the plan or get iFound+` |
| Пустой город | `No plans in Austin yet. Start one — it only happens if people join.` |
| Чекбокс | `I'm 18 or older` |
| Жалоба | `Report` |
| Свайп, надписи поверх карточки | `IN` · `SKIP` |
| Почти набран | `1 away from happening!` |
| Конец колоды | `That's everything in Austin this week.` |

Формат дат — американский, 12-часовой: `Thu, Nov 20 · 7:00 PM CT`.

---

## 10. Архитектура и стек

```
Браузер (Next.js, React)
   │  только HTTPS к своему же домену
   ▼
Next.js на Vercel ─ route handlers /api/*, server components, middleware (cookie)
   │            │              │              │
   ▼            ▼              ▼              ▼
Supabase     Supabase        Resend         Stripe
Postgres     Storage         (письма)       (Checkout, webhooks)
(+ функции)  (приватные фото)
   ▲
   │  каждые 10 минут
Крон → GET /api/cron/sweep
```

| Слой | Выбор | Примечание |
|---|---|---|
| Фреймворк | Next.js 15, App Router, TypeScript | |
| Стили | Tailwind CSS (+ shadcn/ui по желанию) | |
| Карта | Leaflet + react-leaflet | Только на клиенте, см. ниже |
| Тайлы | MapTiler / Stadia / Carto | URL и атрибуция в env |
| БД | Supabase Postgres | Миграции в `supabase/migrations` |
| Файлы | Supabase Storage, приватный бакет `avatars` | |
| Почта | Resend | |
| Оплата | Stripe, тестовый режим | |
| Валидация | zod | И на клиенте, и на сервере |
| Время | Luxon | IANA-пояса |
| Опрос данных | SWR | `refreshInterval` |
| Жесты свайпа | framer-motion | Свайп-колода, раздел 8.12 |
| Короткие коды | nanoid | 8 символов, `a-z0-9` |
| Аналитика | Vercel Analytics или PostHog | |
| Тесты | Vitest | |
| Хостинг | Vercel | |

### Принципы

1. **Вся работа с базой — только на сервере**, ключом `service_role`. Клиенту ключи Supabase не отдаём вообще. Так не нужно писать сложные RLS-политики, а данные участников не утекут через клиентский SDK. RLS на всех таблицах включить без публичных политик — как страховку.
2. **Вся логика порога — в функциях Postgres** (раздел 11), а не в TypeScript. Только так конкурентность безопасна.
3. **Leaflet — только на клиенте:** `dynamic(() => import('./Map'), { ssr: false })`. Leaflet обращается к `window` и падает при серверном рендере.
4. **Стандартные иконки маркеров Leaflet в сборке Next.js теряют пути к картинкам.** Используйте `L.divIcon` с эмодзи или CSS-маркерами.
5. Все POST-запросы проверяют заголовок `Origin` на совпадение с доменом сайта (защита от CSRF вместе с `sameSite=lax`).

### Структура репозитория

```
app/
  page.tsx                          # главная с картой США
  c/[city]/page.tsx                 # город
  c/[city]/swipe/page.tsx           # свайп-колода
  e/[code]/page.tsx                 # план
  e/[code]/opengraph-image.tsx      # желательно
  new/page.tsx
  me/page.tsx
  plus/page.tsx
  plus/success/page.tsx
  plus/restore/page.tsx
  plus/restore/[token]/page.tsx
  l/[token]/page.tsx                # выход по ссылке
  v/verify/[token]/page.tsx
  v/manage/[token]/page.tsx
  admin/page.tsx
  terms/ privacy/ safety/
  api/…                             # раздел 12
components/
  map/UsMap.client.tsx  map/CityMap.client.tsx  map/PlacePicker.client.tsx
  EventCard.tsx  Counter.tsx  JoinForm.tsx  ActivityPicker.tsx  Avatar.tsx  SwipeDeck.tsx  …
lib/
  db.ts            # серверный клиент Supabase
  tz.ts            # всё про часовые пояса
  status.ts        # фактический статус при чтении
  entitlement.ts   # кто что видит, подписка
  limits.ts        # лимиты
  sign.ts          # подписанные ссылки
  email/           # шаблоны и отправка
  stripe.ts
  validation.ts    # zod-схемы
  ai/              # точка подключения ИИ (вторая очередь)
middleware.ts
supabase/migrations/
scripts/seed-venues.ts
data/venues/*.json
tests/
README.md
```

---

## 11. База данных

### Миграция `001_init.sql`

```sql
create extension if not exists pgcrypto;

create type activity_type as enum ('board_games','coffee','run','soccer','movie','walk','other');
create type event_status  as enum ('filling','confirmed','cancelled','completed');

-- Города
create table cities (
  slug          text primary key,
  name          text not null,
  timezone      text not null,
  center_lat    double precision not null,
  center_lng    double precision not null,
  default_zoom  int  not null default 13,
  sort_order    int  not null default 0
);

-- Заведения
create table venues (
  id          uuid primary key default gen_random_uuid(),
  city_slug   text not null references cities(slug),
  name        text not null,
  address     text,
  category    text not null check (category in
                ('cafe','game_store','park','pitch','cinema','library','community_centre')),
  lat         double precision not null,
  lng         double precision not null,
  osm_ref     text unique,
  created_at  timestamptz not null default now()
);
create index venues_city_idx on venues(city_slug);

-- Заявки заведений
create table venue_claims (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references venues(id) on delete cascade,
  email        text not null,
  claim_token  uuid not null,
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index venue_claims_venue_idx on venue_claims(venue_id);

-- Планы
create table events (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  city_slug          text not null references cities(slug),
  venue_id           uuid references venues(id),
  place_name         text,
  place_lat          double precision,
  place_lng          double precision,
  activity           activity_type not null,
  activity_other     text,
  title              text not null,
  description        text,
  starts_at          timestamptz not null,
  duration_minutes   int not null default 120 check (duration_minutes in (60,90,120,180)),
  min_people         int not null check (min_people between 3 and 12),
  max_people         int not null,
  status             event_status not null default 'filling',
  participant_count  int not null default 0 check (participant_count >= 0),
  confirmed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text check (cancel_reason in ('unfilled','host','moderation')),
  host_token         uuid not null,
  host_email         text not null,
  venue_claim_id     uuid references venue_claims(id),
  is_demo            boolean not null default false,
  hidden             boolean not null default false,
  created_ip         inet,
  created_at         timestamptz not null default now(),
  check (max_people between min_people and 20),
  check (venue_id is not null
         or (place_name is not null and place_lat is not null and place_lng is not null)),
  check ((activity = 'other') = (activity_other is not null))
);
create index events_city_start_idx   on events(city_slug, starts_at) where not hidden;
create index events_status_start_idx on events(status, starts_at);
create index events_host_idx         on events(host_token);

-- Участники
create table participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  user_token    uuid not null,
  display_name  text not null check (char_length(display_name) between 1 and 30),
  email         text not null,
  photo_path    text,
  photo_hidden  boolean not null default false,
  is_host       boolean not null default false,
  joined_at     timestamptz not null default now(),
  left_at       timestamptz,
  created_ip    inet
);
create unique index participants_active_token on participants(event_id, user_token)   where left_at is null;
create unique index participants_active_email on participants(event_id, lower(email)) where left_at is null;
create index participants_token_idx on participants(user_token);

-- Подписки
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  status                  text not null,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index subscriptions_email_idx on subscriptions(lower(email));

create table subscription_tokens (
  user_token       uuid primary key,
  subscription_id  uuid not null references subscriptions(id) on delete cascade,
  linked_at        timestamptz not null default now()
);

-- Жалобы
create table reports (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  reporter_token  uuid not null,
  reason          text not null check (reason in ('spam','inappropriate','unsafe','fake','other')),
  details         text check (char_length(details) <= 500),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create unique index reports_once_event  on reports(event_id, reporter_token)       where participant_id is null;
create unique index reports_once_person on reports(participant_id, reporter_token) where participant_id is not null;

-- Журнал писем: идемпотентность
create table email_log (
  id           uuid primary key default gen_random_uuid(),
  dedupe_key   text not null unique,   -- например 'confirmed:<event_id>:<participant_id>'
  to_email     text not null,
  status       text not null default 'pending',  -- pending | sent | failed
  provider_id  text,
  created_at   timestamptz not null default now()
);

-- Лимиты
create table rate_hits (
  id      bigserial primary key,
  bucket  text not null,   -- 'create:token:<uuid>', 'join:ip:<ip>' и т.д.
  at      timestamptz not null default now()
);
create index rate_hits_bucket_at on rate_hits(bucket, at);

-- Лист ожидания
create table waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  city        text not null,
  created_at  timestamptz not null default now()
);
create unique index waitlist_once on waitlist(lower(email), lower(city));

-- Страховка: RLS включён, публичных политик нет — доступ только через service_role
alter table cities              enable row level security;
alter table venues              enable row level security;
alter table venue_claims        enable row level security;
alter table events              enable row level security;
alter table participants        enable row level security;
alter table subscriptions       enable row level security;
alter table subscription_tokens enable row level security;
alter table reports             enable row level security;
alter table email_log           enable row level security;
alter table rate_hits           enable row level security;
alter table waitlist            enable row level security;
```

### Миграция `002_functions.sql` — ядро

Имена выходных колонок начинаются с `r_` намеренно: если назвать их `status` или `participant_count`, PL/pgSQL выдаст ошибку неоднозначности с колонками таблицы.

```sql
-- Создание плана. Хозяин-человек сразу становится первым участником.
create or replace function create_event(
  p_code text, p_city text, p_venue_id uuid,
  p_place_name text, p_place_lat double precision, p_place_lng double precision,
  p_activity activity_type, p_activity_other text,
  p_title text, p_description text,
  p_starts_at timestamptz, p_duration int, p_min int, p_max int,
  p_host_token uuid, p_host_name text, p_host_email text, p_host_photo text,
  p_venue_claim_id uuid, p_is_demo boolean, p_ip inet
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  if p_starts_at < now() + interval '3 hours'
     or p_starts_at > now() + interval '30 days' then
    raise exception 'starts_at_out_of_range';
  end if;

  insert into events (code, city_slug, venue_id, place_name, place_lat, place_lng,
                      activity, activity_other, title, description,
                      starts_at, duration_minutes, min_people, max_people,
                      host_token, host_email, venue_claim_id, is_demo, created_ip,
                      participant_count)
  values (p_code, p_city, p_venue_id, p_place_name, p_place_lat, p_place_lng,
          p_activity, p_activity_other, p_title, p_description,
          p_starts_at, p_duration, p_min, p_max,
          p_host_token, p_host_email, p_venue_claim_id, p_is_demo, p_ip,
          case when p_venue_claim_id is null then 1 else 0 end)
  returning id into v_id;

  if p_venue_claim_id is null then
    insert into participants (event_id, user_token, display_name, email, photo_path, is_host, created_ip)
    values (v_id, p_host_token, p_host_name, p_host_email, p_host_photo, true, p_ip);
  end if;

  return v_id;
end $$;


-- Присоединение. Атомарно подтверждает план при наборе порога.
create or replace function join_event(
  p_event_id uuid, p_user_token uuid, p_name text, p_email text, p_photo_path text, p_ip inet
) returns table (r_result text, r_status event_status, r_count int,
                 r_participant_id uuid, r_just_confirmed boolean)
language plpgsql as $$
declare
  v_ev          events%rowtype;
  v_pid         uuid;
  v_new_count   int;
  v_new_status  event_status;
begin
  select * into v_ev from events where id = p_event_id for update;

  if not found or v_ev.hidden then
    return query select 'not_found'::text, null::event_status, 0, null::uuid, false;
    return;
  end if;

  if v_ev.status in ('cancelled','completed')
     or now() >= v_ev.starts_at
     or (v_ev.status = 'filling' and now() >= v_ev.starts_at - interval '2 hours') then
    return query select 'closed'::text, v_ev.status, v_ev.participant_count, null::uuid, false;
    return;
  end if;

  if exists (select 1 from participants p
             where p.event_id = p_event_id and p.left_at is null
               and (p.user_token = p_user_token or lower(p.email) = lower(p_email))) then
    return query select 'already_joined'::text, v_ev.status, v_ev.participant_count, null::uuid, false;
    return;
  end if;

  if v_ev.participant_count >= v_ev.max_people then
    return query select 'full'::text, v_ev.status, v_ev.participant_count, null::uuid, false;
    return;
  end if;

  insert into participants (event_id, user_token, display_name, email, photo_path, created_ip)
  values (p_event_id, p_user_token, p_name, p_email, p_photo_path, p_ip)
  returning id into v_pid;

  v_new_count  := v_ev.participant_count + 1;
  v_new_status := case
                    when v_ev.status = 'filling' and v_new_count >= v_ev.min_people
                      then 'confirmed'::event_status
                    else v_ev.status
                  end;

  update events
     set participant_count = v_new_count,
         status            = v_new_status,
         confirmed_at      = case
                               when v_ev.status = 'filling' and v_new_status = 'confirmed' then now()
                               else confirmed_at
                             end
   where id = p_event_id;

  return query select 'joined'::text, v_new_status, v_new_count, v_pid,
                      (v_ev.status = 'filling' and v_new_status = 'confirmed');
end $$;


-- Выход. Статус подтверждённого плана не откатывается.
-- Порядок блокировок: сначала план, потом участник — как в join_event.
create or replace function leave_event(p_participant_id uuid)
returns table (r_result text, r_status event_status, r_count int)
language plpgsql as $$
declare
  v_event_id  uuid;
  v_ev        events%rowtype;
  v_p         participants%rowtype;
begin
  select event_id into v_event_id from participants where id = p_participant_id;
  if not found then
    return query select 'not_joined'::text, null::event_status, 0;
    return;
  end if;

  select * into v_ev from events       where id = v_event_id       for update;
  select * into v_p  from participants where id = p_participant_id for update;

  if v_p.left_at is not null then
    return query select 'not_joined'::text, v_ev.status, v_ev.participant_count;
    return;
  end if;

  if v_p.is_host then
    return query select 'host_must_cancel'::text, v_ev.status, v_ev.participant_count;
    return;
  end if;

  if v_ev.status in ('cancelled','completed') or now() >= v_ev.starts_at then
    return query select 'closed'::text, v_ev.status, v_ev.participant_count;
    return;
  end if;

  update participants set left_at = now() where id = p_participant_id;
  update events set participant_count = participant_count - 1 where id = v_event_id;

  return query select 'left'::text, v_ev.status, v_ev.participant_count - 1;
end $$;


-- Отмена хозяином, заведением или модерацией. Авторизация — в API.
create or replace function cancel_event(p_event_id uuid, p_reason text)
returns text
language plpgsql as $$
declare
  v_ev events%rowtype;
begin
  select * into v_ev from events where id = p_event_id for update;
  if not found then return 'not_found'; end if;
  if v_ev.status in ('cancelled','completed') then return 'closed'; end if;

  update events
     set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason
   where id = p_event_id;
  return 'cancelled';
end $$;


-- Плановая уборка: автоотмена ненабранных и завершение прошедших.
create or replace function sweep_events()
returns table (r_event_id uuid, r_action text)
language plpgsql as $$
begin
  return query
  with c as (
    update events
       set status = 'cancelled', cancelled_at = now(), cancel_reason = 'unfilled'
     where status = 'filling' and now() >= starts_at - interval '2 hours'
    returning id
  )
  select id, 'cancelled_unfilled'::text from c;

  return query
  with d as (
    update events
       set status = 'completed'
     where status = 'confirmed'
       and now() >= starts_at + make_interval(mins => duration_minutes)
    returning id
  )
  select id, 'completed'::text from d;

  delete from rate_hits where at < now() - interval '2 days';
end $$;
```

Почему это корректно при гонках: `join_event` держит блокировку строки плана до конца транзакции. Параллельный `join_event` ждёт и видит уже обновлённый счётчик. `sweep_events` на той же строке тоже ждёт и перепроверяет условие на новой версии строки — если план успел подтвердиться, он его не отменит.

Миграция `003_guest_profiles.sql` для свайп-колоды — в разделе 8.12.

---

## 12. API

Все эндпоинты — route handlers в `app/api`. Ответы JSON. Ошибки — `{ "error": "<code>", "message": "<human text>" }`.

| Метод и путь | Назначение | Кто может | Лимит |
|---|---|---|---|
| `GET /api/cities` | Города с числом открытых планов | все | — |
| `GET /api/cities/:slug/venues` | Заведения города | все | — |
| `GET /api/events?city=&day=&activity=` | Список планов города | все | — |
| `GET /api/deck?city=&day=&first=&cursor=` | Свайп-колода, порциями по 10 (раздел 8.12) | все | — |
| `GET /api/events/:code` | План с учётом видимости | все | — |
| `POST /api/events` | Создать план | все | раздел 16 |
| `POST /api/events/:code/join` | Присоединиться | все | раздел 16 |
| `POST /api/events/:code/leave` | Выйти по cookie | участник | — |
| `POST /api/leave` | Выйти по подписанной ссылке | владелец ссылки | — |
| `POST /api/events/:code/cancel` | Отменить | хозяин, заведение, админ | — |
| `GET /api/events/:code/ics` | Файл календаря | участник | — |
| `POST /api/uploads/avatar` | Загрузить фото, вернуть `photo_path` | все | 20 в час на токен |
| `GET /api/me` | Мои планы, подписка и свой сохранённый профиль | все | — |
| `DELETE /api/me/profile` | Забыть сохранённые имя, email и фото | все | — |
| `POST /api/reports` | Жалоба | все | 20 в сутки на токен |
| `POST /api/waitlist` | Лист ожидания | все | 10 в сутки на токен |
| `POST /api/venue/verify` | Подтвердить заявку заведения | владелец ссылки | — |
| `GET /api/venue/manage?token=` | Планы заведения | владелец ссылки | — |
| `POST /api/billing/checkout` | Создать Stripe Checkout | все | — |
| `POST /api/billing/webhook` | Вебхук Stripe | Stripe | подпись |
| `GET /api/billing/success?session_id=` | Привязать токен после оплаты | все | — |
| `POST /api/billing/restore` | Письмо для восстановления подписки | все | 5 в час на токен |
| `POST /api/billing/restore/confirm` | Привязать браузер по ссылке | владелец ссылки | — |
| `GET /api/cron/sweep` | Плановая уборка | заголовок `Authorization: Bearer <CRON_SECRET>` | — |

### `POST /api/events`

Тело:
```json
{
  "city": "austin",
  "venueId": "uuid или null",
  "place": { "name": "Zilker Park — near the lawn", "lat": 30.2669, "lng": -97.7729 },
  "activity": "board_games",
  "activityOther": null,
  "title": "",
  "description": "Bring your favorite game!",
  "startsAtLocal": "2026-11-20T19:00",
  "durationMinutes": 120,
  "minPeople": 6,
  "maxPeople": 12,
  "host": { "name": "Alex", "email": "alex@example.com", "photoPath": null, "is18": true },
  "asVenue": { "enabled": false, "email": null }
}
```

Обработка:
1. Проверить `Origin`, распарсить zod-схемой.
2. **`startsAtLocal` перевести в UTC в поясе города**, а не сервера и не браузера.
3. Пустой `title` → `"<Activity label> at <venue or place name>"`.
4. Проверить лимиты (раздел 16). Если исчерпан бесплатный месячный лимит и это не план от заведения → `402 { error: "upgrade_required" }`.
5. Если `asVenue.enabled` — создать `venue_claims` (или найти существующую подтверждённую по этому заведению и email) и отправить письмо подтверждения. Публикацию не блокировать.
6. Вызвать `create_event`, записать `rate_hits`, отправить хозяину письмо со ссылкой на план.
7. Ответ `201 { code, url }`.

Ошибки: `invalid_input`, `starts_at_out_of_range`, `rate_limited`, `upgrade_required`.

### `POST /api/events/:code/join`

Тело: `{ "name": "Sam", "email": "sam@example.com", "photoPath": null, "is18": true }`

Или `{ "useSavedProfile": true }` — данные берутся из `guest_profiles` (раздел 8.12). Профиля нет — `400 profile_required`.

Обработка:
1. Проверить `Origin`, zod, `is18 === true`, лимиты.
2. Вызвать `join_event`.
3. По `r_result`:
   - `joined` → письмо присоединившемуся; если `r_just_confirmed` — письмо «It's on» всем активным участникам (с идемпотентностью через `email_log`);
   - `already_joined` → `409`;
   - `full` → `409`;
   - `closed` → `410`;
   - `not_found` → `404`.
4. Ответ: `{ result, status, count, minPeople, maxPeople, justConfirmed }`.

### Вебхук Stripe

- `export const runtime = 'nodejs'`.
- Тело читать как текст: `const body = await req.text()` — подпись проверяется по сырому телу, `req.json()` её сломает.
- `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`.
- Обрабатываем:
  - `checkout.session.completed` → upsert `subscriptions` по email, привязать `client_reference_id` (токен) в `subscription_tokens`;
  - `customer.subscription.updated` → обновить `status` и `current_period_end`;
  - `customer.subscription.deleted` → `status = 'canceled'`.

---

## 13. Фото

1. Пользователь выбирает файл (до 5 МБ, `image/jpeg`, `image/png`, `image/webp`).
2. **На клиенте** обрезаем по центру в квадрат и уменьшаем до 256×256, кодируем в WebP. Если браузер не смог декодировать (например, HEIC в некоторых браузерах) — сообщение *Please use a JPG or PNG photo*.
3. `POST /api/uploads/avatar` (multipart). Сервер проверяет тип и размер (≤ 300 КБ после сжатия), кладёт в приватный бакет `avatars` по пути `<uuid>.webp`, возвращает `photo_path`.
4. `photo_path` передаётся в запросе на присоединение или создание.
5. Показ: сервер генерирует **подписанные ссылки на 1 час** только для тех, кому положено видеть (раздел 7).
6. Нет фото → кружок с инициалами на цветном фоне (цвет из хэша имени).
7. Две жалобы на участника от разных токенов → `photo_hidden = true`, показываем инициалы.

---

## 14. Письма

Отправитель `iFound <plans@<домен>>`. Все письма короткие, в каждом — ссылка на план.

| Ключ | Когда | Тема | Получатели |
|---|---|---|---|
| `host_created` | План создан | `Your plan is live — share it to fill it` | хозяин |
| `joined_filling` | Присоединился, план набирается | `You're in — 4 of 6 so far` | присоединившийся |
| `confirmed` | План подтвердился | `It's on! Board games at Dicey Cafe, Thu 7 PM` | все активные участники |
| `joined_confirmed` | Присоединился к подтверждённому | `You're in — it's on!` | присоединившийся |
| `cancelled_unfilled` | Не набралось к дедлайну | `Didn't fill — called off` | все активные участники |
| `cancelled_host` | Хозяин отменил | `The host called off this plan` | все активные участники |
| `venue_verify` | Заявка заведения | `Confirm you represent Dicey Cafe` | email заведения |
| `subscription_restore` | Восстановление подписки | `Restore iFound+ on this device` | email подписки |

В письмах участникам — подписанная ссылка `Can't make it?` на `/l/<token>`. В письме `confirmed` — вложение `.ics`.

**Идемпотентность:** перед отправкой вставляем строку в `email_log` с `dedupe_key` вида `confirmed:<event_id>:<participant_id>` через `ON CONFLICT DO NOTHING`. Вставилась — отправляем и ставим `status = 'sent'`. Не вставилась — письмо уже было.

**Домен для почты:** письма должны уходить с вашего домена, подтверждённого в Resend (записи SPF и DKIM). Проверьте настройки: без подтверждённого домена Resend, как правило, разрешает отправку только на адрес владельца аккаунта — жюри писем не получит. DNS может обновляться не мгновенно, поэтому домен покупать и подключать первым делом.

### `.ics`
- `DTSTART` и `DTEND` — в UTC с суффиксом `Z`.
- `SUMMARY` — название плана, `LOCATION` — место и адрес, `DESCRIPTION` — ссылка на план.
- `UID` — `<event_id>@<домен>`.

---

## 15. Оплата: Stripe

- Продукт `iFound+`, цена **$8/месяц**, создать в **тестовом** режиме, ID цены → `STRIPE_PRICE_ID`.
- Checkout Session:
  - `mode: 'subscription'`;
  - `line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }]`;
  - `client_reference_id` и `metadata.user_token` — токен браузера;
  - `customer_email` — подставить, если email известен;
  - `success_url: <SITE>/plus/success?session_id={CHECKOUT_SESSION_ID}`;
  - `cancel_url: <SITE>/plus`.
- На странице успеха **сразу** проверяем сессию на сервере и привязываем токен — не ждём вебхука. Вебхук делает то же самое идемпотентно.
- **Права подписчика:** токен есть в `subscription_tokens`, подписка в статусе `active` или `trialing` и `current_period_end` в будущем.
- В интерфейсе цена указана честно, без скрытого автопродления пробного периода. Строка *Cancel anytime*.
- **Живые ключи Stripe в проде не используются.** Тестовый баннер с картой `4242 4242 4242 4242` показывается, пока ключ начинается с `sk_test_`.

---

## 16. Лимиты, безопасность, модерация

### Лимиты

| Действие | По токену | По IP |
|---|---|---|
| Создать план | 3 в сутки | 20 в сутки |
| Создать план бесплатно | 1 за 30 дней (также по email хозяина) | — |
| Присоединиться | 30 в час | 60 в час |
| Загрузить фото | 20 в час | — |
| Жалоба | 20 в сутки | — |

**Лимиты по IP намеренно мягкие:** на хакатоне все судьи и участники сидят в одной университетской сети за одним внешним IP. Жёсткий лимит по IP заблокирует демо прямо на сцене. Основная защита — лимиты по токену.

Админ-cookie снимает все лимиты.

Реализация: перед действием `count(*)` в `rate_hits` по ключу за окно; после успеха — вставка. Отдельный сервис не нужен.

### Модерация
- Простой фильтр нецензурных слов на `title`, `description`, `display_name`, `place_name`, `activity_other` → `invalid_input`.
- Жалобы: 3 от разных токенов на план → `hidden = true`; 2 на участника → фото скрыто.
- Всё остальное — вручную в `/admin`.

### Безопасность
- Email участников **никогда** не уходит на клиент.
- Подписанные ссылки: `base64url(JSON { t, id, exp })` + `.` + `base64url(HMAC-SHA256)` на `APP_SIGNING_SECRET`. Сроки: выход — до конца плана; заведение — 30 дней; восстановление подписки — 1 час.
- Все мутации — только POST; GET ничего не меняет.
- Проверка `Origin` на всех POST, кроме вебхука Stripe.
- Секреты только в переменных окружения.

---

## 17. Плановые задачи

`GET /api/cron/sweep` с заголовком `Authorization: Bearer <CRON_SECRET>`:
1. Вызывает `sweep_events()`.
2. По каждому `cancelled_unfilled` рассылает `cancelled_unfilled` активным участникам (идемпотентно).

Частота — каждые 10 минут. **Проверьте, разрешает ли ваш тариф Vercel такую частоту крона.** Если нет — внешний пингер (например, cron-job.org) на этот же адрес с секретом, или `pg_cron` в Supabase с вызовом эндпоинта.

Даже если крон опоздает, интерфейс показывает правильный статус за счёт вычисления фактического статуса при чтении (раздел 6).

---

## 18. Аналитика

Цифры для питча берём **только из реальных событий**.

События воронки:
`landing_view`, `city_view`, `event_view`, `join_click`, `join_success`, `event_confirmed`, `create_start`, `create_success`, `paywall_shown`, `checkout_start`, `checkout_success`, `waitlist_submit`, `share_click`, `swipe_view`, `swipe_right`, `swipe_left`, `swipe_undo`, `deck_end`.

На `/admin` — сводка: создано планов, присоединений, подтверждённых планов, доля подтверждённых, подписок, лист ожидания по городам.

---

## 19. Демо-данные и сценарий демо

### Правила

| Что | Можно? |
|---|---|
| Заведения из OpenStreetMap | Да — это реальные публичные места |
| Планы, созданные командой через продукт | Да, с флагом `is_demo` и бейджем `Demo` |
| Планы от реальных пользователей после рассылок | Да, без бейджа |
| **Фиктивные участники в базе** | **Нет** |

Почему без фиктивных участников: питч держится на том, что продукт настоящий, а жюри читает репозиторий и может спросить про цифры. Нарисованная толпа на счётчиках подрывает главный аргумент. Счётчик демо-плана начинается с хозяина.

### Сценарий на сцене

1. Заранее создать в Остине демо-план с **порогом 3** на завтра.
2. На сцене показать QR-код на свайп-колоду, где этот план стоит первым: `/c/austin/swipe?first=<code>`.
3. Хозяин уже внутри (1 из 3). Двое судей открывают по QR и свайпают первую карточку вправо (или жмут `I'm in`).
4. На втором присоединении план подтверждается: у всех на экранах (опрос раз в 8 секунд) счётчик переходит в **It's on!**, у последнего присоединившегося — праздничный экран.
5. Показать пришедшее письмо «It's on» с `.ics`.

Запасной вариант на случай сбоя сети — заранее записанное видео экрана того же сценария.

---

## 20. Переменные окружения

```
NEXT_PUBLIC_SITE_URL=https://<домен>

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_AVATARS_BUCKET=avatars

RESEND_API_KEY=
EMAIL_FROM="iFound <plans@<домен>>"

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

APP_SIGNING_SECRET=        # длинная случайная строка
CRON_SECRET=
ADMIN_SECRET=

NEXT_PUBLIC_MAP_TILES_URL=
NEXT_PUBLIC_MAP_ATTRIBUTION=

FEATURE_SMS=false          # вторая очередь
FEATURE_AI=false           # вторая очередь
```

Ключей Supabase с префиксом `NEXT_PUBLIC_` нет — клиент к базе не ходит.

---

## 21. Репозиторий, README, тесты

### README обязательно содержит
1. Что это — один абзац и ссылка на прод.
2. **Как проверить жюри:** открыть Остин → открыть план → `I'm in` → создать свой план → тестовая карта `4242 4242 4242 4242` для iFound+.
3. **Где ядро:** ссылка на `supabase/migrations/002_functions.sql` и на тесты логики порога.
4. Стек и схема архитектуры.
5. Локальный запуск и переменные окружения.
6. Источники данных и атрибуция OpenStreetMap.
7. Честные ограничения: email не подтверждается, SMS и скидки — во второй очереди.

### Обязательные тесты (Vitest, на тестовой базе Supabase)

| # | Проверка |
|---|---|
| 1 | Присоединение до порога → `confirmed`, `just_confirmed = true` ровно один раз |
| 2 | **10 параллельных присоединений** к плану с порогом 6 и максимумом 10 → счётчик 10, статус `confirmed`, `just_confirmed = true` ровно у одного запроса |
| 3 | Присоединение сверх максимума → `full` |
| 4 | Повтор тем же токеном и тем же email в другом регистре → `already_joined` |
| 5 | Выход из подтверждённого плана → счётчик −1, статус `confirmed` сохраняется |
| 6 | Хозяин не может выйти → `host_must_cancel` |
| 7 | Присоединение после дедлайна набора при `filling` → `closed` |
| 8 | `sweep_events` отменяет ненабранный план и завершает прошедший подтверждённый |
| 9 | Часовые пояса: ввод `19:00` для Остина хранится как `01:00Z` следующего дня; фильтр «Today» для Остина корректен при сервере в UTC |
| 10 | Второй собственный план за 30 дней без подписки → `upgrade_required`; план от заведения → без ограничения |

Тест №2 — главный сигнал жюри, которое читает код. Упомяните его в README.

---

## 22. Порядок работ

**Д1** — фронтенд и ядро интерфейса. **Д2** — данные, бэкенд, прод. **Б** — третий участник команды.

| Этап | Д1 | Д2 | Б | Готово, когда |
|---|---|---|---|---|
| **M0. Фундамент** | Каркас Next.js, вёрстка шапки и футера, карта Остина рендерится | Публичный репозиторий, деплой пустой страницы в прод, покупка домена, домен в Vercel и Resend, проект Supabase, миграция `001` | Покупка домена вместе с Д2, тексты Terms/Privacy/Safety | Открывается `https://<домен>` |
| **M1. Данные** | Страница города: список и карта заведений | Скрипт сида, сид 5 городов в базу | Отбор заведений по городам | В Остине видно ~30 реальных мест |
| **M2. Ядро** | `/new`, `/e/[code]`, счётчик, форма присоединения | Функции `002`, API создания и присоединения, тесты 1–7 | Проверка сценариев руками в двух браузерах | Два браузера подтверждают план |
| **M3. Письма и жизненный цикл** | `/me`, выход, отмена, опрос счётчика, шеринг | Письма, `.ics`, крон, выход по ссылке, тест 8 | Проверка писем на разных почтах | Письмо «It's on» приходит всем |
| **M4. Фото и деньги** | Загрузка фото, пейволл, `/plus` | Хранилище, подписанные ссылки, видимость, Stripe, вебхук, тест 10 | Тексты пейволла | Тестовая оплата открывает участников |
| **M5. Безопасность и полировка** | Свайп-колода, главная с картой США, лист ожидания, мобильная вёрстка, OG-картинки | Заведения, жалобы, лимиты, админка, `guest_profiles` и `/api/deck`, тест 9 | Рассылки со ссылками на планы, лист ожидания | Чек-лист раздела 23 зелёный |
| **M6. Заморозка** | Финальный прогон | README, демо-план для сцены | Дека, видео | Сдано |

---

## 23. Критерии приёмки

Прогнать в **режиме инкогнито**, с телефона и с ноутбука, из Астаны.

- [ ] Главная открывается, карта США показывает 5 городов с числами.
- [ ] Остин: видно реальные заведения, планы, фильтры работают.
- [ ] **Время везде в поясе города с подписью**, строка «в вашем времени» показывает время Астаны.
- [ ] Присоединение без аккаунта: имя, email, 18+ → `You're in ✓`.
- [ ] Набор порога в двух браузерах → `It's on!` у обоих, письма пришли всем, `.ics` открывается в календаре.
- [ ] Выход со страницы и по ссылке из письма работает.
- [ ] Создание плана без аккаунта, время введено как время Остина.
- [ ] Свайп-колода на телефоне: первый свайп вправо — с формой, следующие — в одно касание; план, которому не хватало одного, подтверждается свайпом; Undo работает; на десктопе работают кнопки и стрелки.
- [ ] Второй собственный план → пейволл; тестовая оплата → лимит снят, участники видны до вступления.
- [ ] План от заведения: публикуется сразу, после подтверждения по ссылке появляется `✓`, лимит не применяется.
- [ ] Гостю не приходят с сервера имена и фото участников (проверить вкладку Network).
- [ ] Email участников не встречается ни в одном ответе API.
- [ ] Жалобы скрывают план и фото по порогам.
- [ ] Нигде в основном сценарии нет требования создать аккаунт.
- [ ] Репозиторий публичный, README по разделу 21, тесты проходят.
- [ ] Атрибуция OpenStreetMap видна на карте и в футере.
- [ ] Stripe в тестовом режиме, баннер на месте.

---

## 24. Вторая очередь

### SMS
- Twilio, флаг `FEATURE_SMS`, поле телефона в формате E.164 (проверка через libphonenumber).
- **За сутки не запустить:** для массовой отправки SMS на американские номера нужна регистрация отправителя (10DLC или верификация toll-free номера), и она, как правило, занимает дни. Поэтому в MVP только email.

### ИИ — точка подключения уже заложена
Модуль `lib/ai/`, только на сервере, за флагом `FEATURE_AI`. **Сбой ИИ никогда не ломает основной сценарий.**

Кандидаты по убыванию ценности:
1. **«Plan it for me»** — человек пишет *«something chill Thursday evening»*, ИИ предлагает активность, заведение из засеянных и время и заполняет форму. Самое эффектное на демо.
2. **Модерация** текста и фото при создании и присоединении. Для продукта без регистрации это самый весомый аргумент безопасности.
3. Автоназвания и описания планов.

### Скидки заведений
Исходная идея: заведение прикладывает к своему плану скидку в непиковые часы, она открывается подписчикам iFound+. Модель данных расширяется полем `deal_text` в `events` и флагом видимости по подписке. Заведения по-прежнему ничего не платят.

### Запуск новых городов
По данным листа ожидания.

---

## 25. Открытые вопросы

1. **Пять — это города?** Я понял ответ «пока что 5» как пять городов с Остином основным. Если имелось в виду пять заведений — поправьте, тогда только Остин.
2. **Остальные четыре города:** предложил Нью-Йорк, Чикаго, Денвер, Сиэтл. Меняется одной строкой в сиде.
3. **Фото обязательно или по желанию?** Сделал по желанию: обязательное фото снижает число присоединений, и судья на сцене может не захотеть фотографироваться.
4. **Имя и фото хозяина видны всем**, остальные участники — только по правилам раздела 7. Подтвердите.
5. **Максимум по умолчанию** = 2 × порог, не больше 20. Подтвердите.
6. **Чей репозиторий** — организация или личный аккаунт.
7. **Домен** — какое имя.
8. **Какую функцию ИИ** берём первой во второй очереди.
