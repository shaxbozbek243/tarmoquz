# FIKRA v25 — Avtomatik YouTube Shorts

## Ishga tushirish
1. `index.html` faylini Cloudflare Workers saytingizga joylang.
2. Supabase loyihasi: `zzucygzvoritdasjrfoh`. Server funksiyasi `fikra-youtube-shorts` allaqachon deploy qilingan.
3. Google Cloud'dagi **YouTube Data API v3** uchun API key kerak. Kalitni sayt HTML, GitHub va brauzerga kiritmang.
4. Supabase Dashboard > Edge Functions > Secrets bo'limida `YOUTUBE_API_KEY` nomli secret yarating va API key ni uning qiymati sifatida saqlang.
5. FIKRA > Shorts bo'limiga kirganingizda ro'yxat avtomatik yangilanadi.

## Cheklovlar
- API kalitisiz avtomatik qidiruv ishlamaydi; FIKRA foydalanuvchilari havola bilan ulashgan Shorts qoladi.
- API barcha YouTube Shortsni bera olmaydi. `#shorts` bo'yicha eng yangi, joylashtirishga ruxsat berilgan va 180 soniyagacha bo'lgan videolar tanlanadi; bu haqiqiy Shorts ekaniga 100% kafolat yo'q.
- Kesh 6 soat. Bir so'rovdan keyin yozuvlarni serverda qayta-qayta qidirmaslik uchun 10 daqiqalik refresh-lock mavjud.
- Video fayllari FIKRA yoki Supabase Storage'ga yuklanmaydi: YouTube'ning rasmiy pleeri ishlatiladi.
- FIKRA ichida qo'shilgan Shorts limiti kuniga 5 ta, referal va Coin/Boost tizimi o'zgarmaydi.
- Admin panel `773649664s@gmail.com` tasdiqlangan hisobiga bog'langan.
