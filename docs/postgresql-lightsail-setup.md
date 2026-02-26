# PostgreSQL telepítése és konfigurálása Ubuntu AWS Lightsail szerveren

Ez az útmutató arra készült, hogy fejlesztésben maradhasson SQLite, productionben pedig PostgreSQL-t használj.

## 1) PostgreSQL telepítése

```bash
sudo apt update &&
sudo apt install -y postgresql postgresql-contrib &&
sudo systemctl enable postgresql &&
sudo systemctl start postgresql &&
sudo systemctl status postgresql &&
```

## 2) Adatbázis és felhasználó létrehozása

Példa: adatbázis neve `polipmarket`, user neve `polip_user`.

```bash
sudo -u postgres psql
```

A psql shellben:

```sql
CREATE DATABASE polipmarket;
CREATE USER polip_user WITH ENCRYPTED PASSWORD 'EROS_JELSZO';
GRANT ALL PRIVILEGES ON DATABASE polipmarket TO polip_user;
ALTER USER polip_user CREATEDB;
-- legyen a schema tulajdonosa a polip_user (egyszerű és tiszta)
ALTER SCHEMA public OWNER TO polip_user;

-- biztos, ami biztos: alap jogok
GRANT USAGE, CREATE ON SCHEMA public TO polip_user;

-- ha már vannak táblák, ezekre is jog (opcionális)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO polip_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO polip_user;

-- és hogy az újonnan létrejövőkre is automatikusan meglegyen (opcionális, hasznos)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO polip_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO polip_user;

\q
```

## 3) Hálózati elérés beállítása

Alapértelmezetten a PostgreSQL csak lokálról fogad kapcsolatot. Ha ugyanazon a szerveren fut a Next.js app, ez teljesen jó és biztonságosabb.

- `listen_addresses` maradhat `localhost`
- `pg_hba.conf`-ban legyen `scram-sha-256` vagy `md5` jelszavas helyi hitelesítés

Fájlok helye Ubuntu alatt tipikusan:

- `/etc/postgresql/<verzio>/main/postgresql.conf`
- `/etc/postgresql/<verzio>/main/pg_hba.conf`

Újraindítás módosítás után:

```bash
sudo systemctl restart postgresql
```

## 4) Tűzfal (ha szükséges)

Ha **távoli** gépről csatlakozol PostgreSQL-re, nyisd a 5432-es portot korlátozott IP-re. Ha az alkalmazás ugyanazon a szerveren fut, **ne nyisd ki**.

```bash
sudo ufw status
# opcionális, csak akkor ha tényleg kell remote DB access:
# sudo ufw allow from <SAJAT_IP>/32 to any port 5432 proto tcp
```

## 5) App környezeti változó beállítása

A jelenlegi:

```env
DATABASE_URL="file:./dev.db"
```

Productionben PostgreSQL URL kell, például:

```env
DATABASE_URL="postgresql://polip_user:EROS_JELSZO@127.0.0.1:5432/polipmarket?schema=public"
```

## 6) Prisma beállítás

Ha productionben PostgreSQL-t használsz, a `prisma/schema.prisma` fájlban a datasource provider legyen:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Majd migráció és kliens generálás:

```bash
npx prisma migrate deploy
npx prisma generate
```

> Megjegyzés: a Prisma datasource provider egy sémán belül nem váltható futásidőben SQLite és PostgreSQL között. Gyakori megoldás külön schema fájl dev/prod környezetre, vagy egységesen PostgreSQL használata minden környezetben.

## 7) Gyors connectivity teszt

```bash
psql "postgresql://polip_user:EROS_JELSZO@127.0.0.1:5432/polipmarket" -c "SELECT version();"
```

## 8) Javasolt minimum hardening

- Erős, egyedi DB jelszó
- Rendszeres mentés (`pg_dump` vagy managed backup)
- A DB port ne legyen publikus, ha nem muszáj
- Alkalmazás oldalon külön, minimális jogosultságú DB user
