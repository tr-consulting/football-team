# Start 9 Studio

Mobilförst laguppställningsapp för 9 mot 9. Appen låter dig:

- lägga upp spelare med förnamn, efternamn, nummer och bild
- skapa matcher med datum, tid, motståndare och plats
- välja formation och bygga en start-9 med drag-and-drop och listval
- hantera avbytare och frånvarande
- exportera en färdig `1080x1920`-story med plan, spelarkort och namnlista

## Teknik

- `Next.js 16` med App Router
- `Tailwind CSS 4`
- `@dnd-kit/core` för drag-and-drop
- `html-to-image` för PNG-export
- `Supabase` för Auth, Storage och Postgres

## Inloggning och lagring

- om `.env.local` saknas kör appen i lokalt demoläge med `localStorage`
- om Supabase är konfigurerat använder appen magic-link via mail för ledarinloggning
- efter inloggning skapas eller hämtas ditt team automatiskt och spelare, matcher, uppställning, bänk och frånvarande synkas mot databasen
- spelarporträtt laddas upp till Supabase Storage-bucketen `player-images`

## Kom igång

```bash
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Supabase-koppling

1. Kopiera `.env.example` till `.env.local`
2. Fyll i:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://din-live-url.vercel.app
```

3. Kör SQL-filen i `supabase/schema.sql`
4. Säkerställ att Email OTP / magic link är aktiverat i Supabase Auth
5. Lägg till både live-URL och eventuell `http://localhost:3000` under Supabase Auth Redirect URLs

När detta är gjort kommer appen att be om inloggning, skapa ditt ledarteam under din `auth.uid()` och därefter spara allt mot Supabase i stället för enbart lokalt.

## Deploy till Vercel

När du är redo:

```bash
npm i -g vercel
vercel login
vercel
```

För produktion:

```bash
vercel --prod
```
