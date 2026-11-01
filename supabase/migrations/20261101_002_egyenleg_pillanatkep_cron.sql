-- Egyenleg pillanatkép — havi ütemezés (pg_cron + pg_net)
-- Minden hónap 1-jén 05:00 UTC-kor (06:00 / 07:00 budapesti idő) hívja a
-- wallet-balance-snapshot Edge Functiont. A 2-i és 3-i futás tartalék: ha az 1-jei
-- hibázott, pótolja, különben a függvény nem csinál semmit (meglévő mentést nem ír felül).
--
-- FUTTATÁS ELŐTT cseréld ki a két placeholdert. A kitöltött változat NEM kerülhet a repóba!
--   <ANON_KEY>    — a projekt legacy anon kulcsa (a gateway JWT-ellenőrzéséhez)
--   <CRON_SECRET> — ugyanaz az érték, mint a WALLET_SNAPSHOT_CRON_SECRET Edge Function secret

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT vault.create_secret('<ANON_KEY>', 'wallet_snapshot_anon_key');
SELECT vault.create_secret('<CRON_SECRET>', 'wallet_snapshot_cron_secret');

SELECT cron.schedule(
  'wallet-balance-snapshot',
  '0 5 1,2,3 * *',
  $$
  SELECT net.http_post(
    url := 'https://eguhipjgnhbajbmnrskm.supabase.co/functions/v1/wallet-balance-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'wallet_snapshot_anon_key'),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'wallet_snapshot_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
