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

## გაშვებამდე (ჩეკლისტი)

- [ ] რეალური SMS: Twilio Verify ან მსგავსი SMS provider (Supabase → Authentication → Phone)
- [ ] Supabase-ში გამორთვა: **Anonymous sign-ins** და **Email** provider (სატესტო შესვლისთვის იყო ჩართული)
- [ ] Supabase Pro გეგმა (Free გეგმაზე პროექტი 7 დღის უმოქმედობაზე "იძინებს")
- [ ] კონფიდენციალურობის პოლიტიკა და წესები (ქართულად), იურიდიული კონსულტაცია
- [ ] `rls_auto_enable()` ფუნქციაზე EXECUTE-ის ჩამორთმევა (advisor გაფრთხილება)
- [ ] სატესტო შესვლის ღილაკი ავტომატურად იკარგება production build-ში (`__DEV__`), მაგრამ შეამოწმე
