# Achievement rendszer terv

Ez a terv a jelenlegi `polipmarket` architektúrához igazodik (Next.js + Prisma + SQLite), és lefedi:

- importálható achievement definíciókat JSON-ből,
- achievement jutalmat (wallet balance növelés),
- automatikus ellenőrzést eseményeknél (első login, fogadások, nyertes fogadások),
- popup értesítést a UI tetején,
- számozott achievementeket nagy sorszám-közökkel (100, 200, 300, ...),
- bővíthető szabályrendszert (`code` / azonosító alapján).

## 1) Alapelv: 3 réteg különválasztása

1. **Definíció** (mit lehet megszerezni):
   - importált statikus achievement metadata (`number`, `code`, `title`, `reward`, stb.).
2. **Kiértékelés** (elérte-e):
   - backend szabályok, amelyek user statisztikák alapján megmondják, teljesült-e.
3. **Jóváírás és értesítés** (mi történik eléréskor):
   - DB-ben egyszeri unlock,
   - wallet növelés tranzakcióban,
   - kliens oldali popup.

Így később könnyű új achievementet felvenni anélkül, hogy a teljes rendszert át kellene írni.

## 2) Javasolt adatmodell (Prisma)

Új modellek:

- `AchievementDefinition`
  - `id` (cuid)
  - `number` (Int, unique) → pl. `100`, `200`, `300`
  - `code` (String, unique) → pl. `first_login`, `bet_10_events`, `win_5_bets`
  - `title`, `description`
  - `reward` (Int)
  - `category` (pl. `LOGIN`, `BET`, `WIN`)
  - `targetValue` (Int?) → pl. 10, 20, 50
  - `isActive` (Boolean)
  - `createdAt`, `updatedAt`

- `UserAchievement`
  - `id` (cuid)
  - `userId`
  - `achievementId`
  - `unlockedAt`
  - `rewardGranted` (Int)
  - unique kulcs: `(userId, achievementId)`

- (opcionális, de erősen ajánlott) `WalletLedger`
  - `id`, `userId`, `amount`, `reason`, `referenceType`, `referenceId`, `createdAt`
  - itt rögzíted az achievement jóváírásokat audit célra.

> Fontos: a wallet növelés és `UserAchievement` beszúrás egy **tranzakcióban** történjen, hogy ne lehessen duplán jóváírni.

## 3) JSON import formátum

Példa `scripts/examples/achievements-import.sample.json`:

```json
[
  {
    "number": 100,
    "code": "first_login",
    "title": "Első belépés",
    "description": "Sikeresen bejelentkeztél először.",
    "reward": 100,
    "category": "LOGIN",
    "targetValue": 1,
    "isActive": true
  },
  {
    "number": 200,
    "code": "bet_10_events",
    "title": "10 eseményre fogadás",
    "description": "Fogadj legalább 10 különböző eseményre.",
    "reward": 300,
    "category": "BET",
    "targetValue": 10,
    "isActive": true
  },
  {
    "number": 300,
    "code": "bet_20_events",
    "title": "20 eseményre fogadás",
    "description": "Fogadj legalább 20 különböző eseményre.",
    "reward": 500,
    "category": "BET",
    "targetValue": 20,
    "isActive": true
  }
]
```

Import script (`scripts/import-achievements.mjs`) működése:

- JSON beolvasás,
- validáció (`number`, `code` egyedi; `reward >= 0`),
- upsert `code` alapján,
- opcionálisan `--deactivate-missing` flag.

## 4) Kiértékelési stratégia (`code` alapú checker)

A `code` alapján fut egy checker registry, pl.:

- `first_login` → true, ha a user első sikeres sessionjénél hívódik.
- `bet_X_events` → számold a user egyedi eventjeit, amelyekre fogadott (`Order` + `Market` + `eventId`).
- `win_X_bets` → számold a user nyertes pozíció-zárásait vagy resolved nyertes ordereket (döntsetek egyértelmű definíciót).

Szerkezet:

- `src/modules/achievement/application/checkers.ts`
  - `const checkers: Record<string, CheckerFn>`
- `src/modules/achievement/application/evaluateAchievementsForUser.ts`
  - lekéri az aktív achievementeket `number` szerint rendezve,
  - kihagyja a már unlockoltakat,
  - checker futtatás,
  - ha teljesült: unlock + reward.

### Optimalizálás a "ha ez false, a következő se kell" igényre

Ahol lánc van (10, 20, 50...), tarts `category` + `targetValue` mezőket.

Algoritmus:

1. Csoportosíts `category` szerint.
2. Növekvő `targetValue` sorrendben menj végig.
3. Ha egy target nem teljesül (pl. 20), a nagyobb targeteket (50, 100, ...) nem kell ellenőrizni ugyanabban a körben.

Így a `bet_20_events` false esetén nem fut tovább a `bet_50_events`.

## 5) Triggerpontok (mikor fusson az ellenőrzés)

Minimum javaslat:

1. **Login után**: `first_login` + esetleges backlog check.
2. **Sikeres fogadás után** (`placeOrder` flow végén): bet típusú achievementek.
3. **Piac lezárás/feloldás után** (amikor nyerés eldől): win típusú achievementek.

Technikailag:

- ahol már most is domain application layer van (`placeOrder`, `resolveMarket`), ott hívd meg:
  - `evaluateAchievementsForUser(userId, trigger)`

Ne UI-ból döntsd el az unlockot, mindig backend oldali forrás legyen az igazság.

## 6) Popup UX + balance frissítés

Javaslat:

- új endpoint: `GET /api/achievements/unread` (user frissen unlockolt achievementjei)
- új endpoint: `POST /api/achievements/:id/ack` (popup OK megnyomás)

Kliens oldalon:

1. Globális provider pollol vagy trigger után lekérdezi az unread listát.
2. Queue-ban egyesével mutat modalt/popupot a képernyő tetején.
3. `OK` gomb → ack API.
4. Sikeres ack után `refreshMe()` a `MeContext`-ből, hogy a balance azonnal frissüljön.

Megjegyzés: maga a reward jóváírás már unlockkor megtörténik backendben; az `ack` csak UI állapot.

## 7) Oldal / navigáció (placeholder "Sikerek")

A mostani menüpont `/#sikerek` hash-re mutat. Célszerű:

- külön oldal: `/achievements`, vagy
- valódi szekció a főoldalon `id="sikerek"`-kel.

Jobb UX miatt praktikus a külön oldal (`/achievements`), ahol:

- összes achievement listázása,
- locked/unlocked állapot,
- progress bar (pl. 7/10 esemény),
- jutalom összege.

## 8) Implementációs lépések (rövid backlog)

1. Prisma migration: új achievement + user achievement (és opcionális ledger) táblák.
2. DTO + repository réteg létrehozása (`modules/achievement/...`).
3. JSON import script (`scripts/import-achievements.mjs`) + sample JSON.
4. Checker registry + evaluate service implementálása.
5. Triggerek bekötése (`login`, `placeOrder`, `resolveMarket`).
6. API endpointok (`/api/achievements`, `/api/achievements/unread`, `ack`).
7. Frontend achievement oldal + menüpont átvezetése hash-ről route-ra.
8. Popup komponens + queue + `refreshMe()` integráció.
9. Tesztek:
   - unit: checker logika,
   - integration: egyszeri unlock / dupla trigger ne duplázzon,
   - e2e: popup megjelenés + balance update.

## 9) Fontos edge case-ek

- **Idempotencia**: ugyanaz az achievement ne adjon többször pénzt.
- **Versenyhelyzet**: párhuzamos trigger esetén is egyszeri unlock (DB unique + transaction).
- **Visszamenőleges unlock**: ha új achievementet beraksz, lehessen batchben újraértékelni a user bázist.
- **Definíció változás**: reward módosítás csak új unlockokra hasson, korábbiaknál maradjon `rewardGranted`.

---

Ha ezt a struktúrát követed, akkor a `code`-os azonosítós logikád (pl. `bet10event`) jól kezelhető marad, és a számozásos beszúrás (`200`, `250`, `300`) is természetesen támogatott.
