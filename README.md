# ქართველები (ertad)

ქართველთა აპლიკაცია: იპოვე დახმარება, სპეციალისტი ან სამუშაო. Expo (iOS, Android, ვებ) + Supabase.

## გაშვება

```bash
npm install
cp .env.example .env   # ჩაწერე Supabase URL და anon key
npx expo start         # w = ბრაუზერი, QR = Expo Go
```

## სტრუქტურა

- `app/` ეკრანები (Expo Router), `app/(tabs)/` ქვედა 4 ჩანართი
- `src/theme/` ფერები, `src/i18n/ka.ts` ყველა ქართული ტექსტი
- `src/lib/supabase.ts` Supabase კლიენტი
- `src/components/` საერთო კომპონენტები

`.env` არასოდეს მიდის git-ში. `service_role` გასაღები აპში არასოდეს ჩაიწერება.
