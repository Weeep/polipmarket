# Tesztelési stratégia a Polipmarket projekthez

Ez a dokumentum egy **fokozatosan bevezethető** tesztelési tervet ad, hogy a projekt a lehető legnagyobb üzleti kockázatot fedje le a legkisebb kezdeti költséggel.

## 1) Javasolt tesztpiramis

1. **Domain/unit tesztek (sok, gyors)**
   - Cél: üzleti szabályok és számítások ellenőrzése.
   - Fókusz: tiszta függvények, domainek és application use-case-ek.
2. **Integrációs tesztek (közepes mennyiség)**
   - Cél: repository + adatbázis + use-case együttműködés.
   - Fókusz: Prisma + SQLite teszt DB, route handler-ek.
3. **E2E tesztek (kevés, kritikus user flow-k)**
   - Cél: teljes user journey validálása böngészőből.
   - Fókusz: bejelentkezés, piac létrehozás, order leadás, feloldás/lezárás.

## 2) Eszközök (ajánlott stack)

- **Vitest**: unit + integrációs tesztek futtatására (gyors, TS-barát).
- **@testing-library/react**: React komponensek viselkedés alapú tesztelésére.
- **MSW (Mock Service Worker)**: kliens oldali API mockoláshoz.
- **Playwright**: E2E tesztekre kritikus útvonalakhoz.

> Ha minimális kezdést szeretnél: első körben elég a Vitest + Playwright.

## 3) Mit érdemes elsőként tesztelni (prioritási sorrend)

### P0 – Legnagyobb üzleti kockázat

1. **Árazási és quote logika**
   - `src/modules/order/domain/ammQuote.ts`
   - `src/modules/order/application/quoteOrder.ts`
   - `src/modules/order/application/quoteSell.ts`
   - Tesztesetek:
     - normál buy/sell idézés;
     - szélső input (nagyon kis/nagy mennyiség);
     - invalid inputok (negatív, 0, NaN);
     - kerekítési és precision edge case-ek.

2. **Order elhelyezés és matching**
   - `src/modules/order/application/placeOrder.ts`
   - `src/modules/order/application/matchOrders.ts`
   - `src/modules/order/application/cancelOrder.ts`
   - Tesztesetek:
     - részleges és teljes teljesülés;
     - párhuzamos / versenyhelyzet-szerű állapotok;
     - ugyanazon order kétszeri cancel tiltása;
     - wallet/pozíció konzisztencia tranzakció után.

3. **Market lifecycle**
   - `src/modules/market/application/closeMarket.ts`
   - `src/modules/market/application/cancelMarket.ts`
   - `src/modules/market/application/resolveMarket.ts`
   - Tesztesetek:
     - csak jogosult user végezhet lifecycle műveleteket;
     - lezárt marketre ne lehessen új order;
     - resolve után pozíciók és egyenlegek helyesek.

### P1 – Fontos stabilitás

4. **Auth + impersonation flow**
   - `src/modules/user/application/startImpersonation.ts`
   - `src/modules/user/application/stopImpersonation.ts`
   - `src/modules/auth/application/ensureAdmin.ts`
   - Tesztesetek:
     - csak admin impersonálhat;
     - stop után visszaáll az eredeti user;
     - tiltott endpointok 401/403 választ adnak.

5. **API route contract tesztek**
   - `src/app/api/**/route.ts`
   - Tesztesetek:
     - input validáció hibakódok;
     - happy path JSON contract;
     - hibaágak (nem létező market/event/order).

### P2 – UI regresszió és smoke

6. **Komponens tesztek**
   - `src/components/*.tsx`
   - fókusz: `EventCard`, `MarketCard`, `EventMarketGroup`, `Header`
   - Tesztesetek:
     - helyes adatkijelzés;
     - gombok tiltás/engedélyezés állapotai;
     - alapvető interakciók callback-hívásai.

7. **E2E smoke tesztek**
   - kritikus flow-k:
     - login → events listázás;
     - market megnyitás → quote lekérés;
     - order leadás → pozíció megjelenik;
     - admin resolve/cancel flow.

## 4) Mappa- és névkonvenció javaslat

- Unit teszt: `src/**/__tests__/*.test.ts`
- React teszt: `src/**/__tests__/*.test.tsx`
- Integráció: `tests/integration/**/*.test.ts`
- E2E: `tests/e2e/**/*.spec.ts`

Példa:

- `src/modules/order/domain/__tests__/ammQuote.test.ts`
- `tests/integration/orders/placeOrder.test.ts`
- `tests/e2e/order-flow.spec.ts`

## 5) Bevezetési terv (2 sprint)

### Sprint 1

- Teszt runner beállítása (Vitest), alap npm script-ek.
- P0 témákból legalább:
  - `ammQuote` unit tesztek;
  - `placeOrder` + `matchOrders` integrációs tesztek teszt DB-vel.
- 1 db Playwright smoke (login + events oldal).

### Sprint 2

- Market lifecycle integrációs tesztek.
- Auth/impersonation tesztek.
- +2-3 E2E kritikus flow.
- CI pipeline: `lint + test + e2e(smoke)`.

## 6) Minőségi kapuk (ajánlás)

- Pull request merge feltétel:
  - minden unit/integrációs teszt zöld;
  - legalább 1 smoke E2E zöld.
- Kezdeti coverage cél:
  - globális: 50%;
  - P0 modulok: 80% statement + branch.

## 7) Gyakorlati tippek

- A domain logikát tartsátok minél inkább I/O-mentesen (könnyebb unit tesztelni).
- Repository réteget integrációban teszteljétek (valós SQLite/Prisma), ne túlmockolva.
- E2E-ben kevés, de stabil teszt legyen; ne minden edge case-et ott fedjetek.
- Hibáknál állandó JSON hibaformátumot érdemes rögzíteni, hogy az API contract tesztek egyszerűek legyenek.

---

## Rövid, azonnal induló backlog (konkrét)

1. Vitest telepítés és `test`, `test:watch`, `test:coverage` script.
2. `ammQuote.test.ts` (10-15 eset).
3. `placeOrder.integration.test.ts` (happy + edge).
4. `resolveMarket.integration.test.ts`.
5. `order-flow.spec.ts` Playwright smoke.

Ezzel már az első körben a legkockázatosabb pénzügyi/üzleti logikákra lesz automatizált védőháló.
