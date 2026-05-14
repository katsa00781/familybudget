# AI Workflow Rules

## Approach

A projektet inkrementálisan, spec-vezérelt munkafolyamattal
építjük. A `context/` fájlok definiálják mit kell építeni,
hogyan kell építeni, és mi az aktuális haladás állapota.
Mindig ezek alapján implementálj — ne találj ki viselkedést
a semmiből. Ha új szabályt kell MVM Paks bérszámfejtési
logikához hozzáadni, azt a `progress-tracker.md` Open
Questions szekciójában rögzítsd. Ha Supabase sémát kell
változtatni, új migrációs fájlt kell létrehozni dátum-
prefixszel — a meglévők nem szerkeszthetők.

## Scoping Rules

- Work on one feature unit at a time
- Prefer small, verifiable increments over large
  speculative changes
- Do not combine unrelated system boundaries in a
  single implementation step

## When to Split Work

Split an implementation step if it combines:

- UI komponens változtatás és adatbázis séma változtatás
  egyszerre (pl. új bérkalkulátor mező + új oszlop a
  `salary_calculations` táblában)
- Két független domain érintése egyszerre (pl. bevásárlás
  logika és bérszámfejtési koefficiensek ugyanabban a
  commitban)
- Olyan viselkedés, amely nincs egyértelműen definiálva
  a context fájlokban (pl. távolléti díj edge case-ek,
  Wallet CSV duplikáció kezelés)

If a change cannot be verified end to end quickly,
the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the
  context files
- If a requirement is ambiguous, resolve it in the
  relevant context file before implementing
- If a requirement is missing, add it as an open question
  in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- `src/components/ui/*` — shadcn/ui CLI által generált
  primitívek; soha ne szerkeszd kézzel
- `supabase/migrations/*` — meglévő SQL migrációs fájlok;
  csak új fájlt lehet létrehozni, meglévőt nem módosítani
- `lib/utils/supabase/client.ts` és
  `src/lib/utils/supabase/server.ts` — Supabase kliens
  factory fájlok; az import útvonalak és a factory
  implementáció ne változzon

## Keeping Docs in Sync

Update the relevant context file whenever implementation
changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant defined in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `npm run build` passes
