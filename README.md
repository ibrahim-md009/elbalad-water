# الموقع الأساسي لحجز تعبئة المياه (للزبائن)

React + Vite + Firebase — يعمل على **نفس مشروع Firebase** (`water-retention`) الذي تستخدمه لوحة التحكم، بنفس الـ Collections والـ Transactions.

## التشغيل

```bash
npm install
npm run dev        # تطوير
npm run build      # بناء للنشر (dist)
```

## إعداد لمرة واحدة

1. **Firebase Console → Storage → Get started** (فعّل التخزين إن لم يكن مفعّلًا).
2. انشر قواعد Storage (وقواعد Firestore تبقى كما هي في مجلد الـ Dashboard، فهي تدعم الموقع أصلًا):
   ```bash
   firebase use water-retention
   firebase deploy --only storage
   ```
3. تأكد أن قواعد Firestore الموجودة في `water-dashboard/firestore.rules` منشورة (`firebase deploy --only firestore:rules` من مجلد الـ Dashboard).

## وصل الدفع (WebP)

1. الزبون يختار JPG / PNG / WEBP.
2. `src/lib/image.js` يفك الترميز ويصغّر (أطول ضلع 1600px) ويشفّر WebP بجودة 0.8 عبر Canvas، ويتأكد من توقيع الملف (`RIFF….WEBP`) وليس الامتداد.
3. إن لم يدعم المتصفح تشفير WebP عبر Canvas (Safari القديم) يُستخدم مشفّر WASM (`@jsquash/webp`) تلقائيًا.
4. يظهر Preview للنسخة الناتجة، وتُرفع نسخة WebP فقط إلى Firebase Storage (`receipts/*.webp`, `contentType: image/webp`).
5. رابط التنزيل يُحفظ في `reservations.receiptUrl` ويظهر في الـ Dashboard عبر `ReceiptViewer` الموجود دون أي تعديل.
6. إن فشل التحويل أو الرفع لا يُنشأ أي Reservation.

## Collections المستخدمة

| Collection | الاستخدام في الموقع |
|---|---|
| `availability` | قراءة لحظية (`availableMinutes > 0`) + خصم الدقائق داخل Transaction |
| `reservations` | إنشاء طلب `pending` فقط (لا قراءة ولا تعديل) |
| `paymentMethods` | قراءة لحظية للمفعّلة فقط |
| `settings/general` | `minutesPerCup` و`pricePerCup` |
