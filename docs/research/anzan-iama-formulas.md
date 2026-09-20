# anzan.iama.kz — misol generatsiyasining to'liq tahlili

**Sana:** 2026-09-20 · **Manba:** https://anzan.iama.kz (Флеш-Анзан)
**Usul:** klient kodi (`js/main.js`) o'qildi + server endpointlaridan **~16 000 ta real misol** yig'ilib
(121 ta mavzu × razryad × ryad kombinatsiyasi, har biriga 40 ta namuna) teskari muhandislik qilindi.

> Maqsad: shu saytning mavzu/formula mantiqini bizning `src/domain/practice/` generatoriga ko'chirish.

---

## 1. Sayt arxitekturasi

Statik HTML + jQuery, generatsiya **serverda** (PHP). 4 ta endpoint, hammasi `POST`:

| Endpoint | Parametrlar | Qaytaradi |
|---|---|---|
| `get_list.php` | `razryad` (1/2/3) | shu razryad uchun `<option>` mavzular ro'yxati |
| `get_ryad.php` | `tema`, `razryad` | shu mavzuda ruxsat etilgan **qatorlar soni** (ryad) tugmalari |
| `get_inrow.php` | `tema`, `razryad` | (klientda chaqiriladi, ryad bilan bir xil konteynerga yoziladi) |
| `get_now.php` | `tema`, `ryad`, `razryad` | **bitta misol**: `["2","1","3"]` — oxirgi element = javob |

Ya'ni misol JSON massiv: `[a1, a2, ..., aN, answer]`, `answer = Σ ai`. Hamma 16 000 namunada
yig'indi 100% to'g'ri chiqdi. Ruxsat etilmagan (tema, razryad, ryad) juftligi uchun server `[""]` qaytaradi.

### Klient sozlamalari (index.html + main.js)

| Sozlama | Qiymatlar | Izoh |
|---|---|---|
| Режим игры | `1` Одиночный, `2` В классе | klassda javob so'ralmaydi, oxirida hamma misol jadvalda ko'rsatiladi |
| Разряд чисел | 1Д / 2Д / 3Д | **qo'shiluvchilarning** xona soni (javob kattaroq bo'lishi mumkin) |
| Периодичность | 100…1500 ms (0.1–1.5 s) | bitta raqam ko'rinish intervali |
| Тема | 121 ta | quyidagi katalog |
| Количество рядов | mavzuga qarab 2…15 | qo'shiluvchilar soni |
| Количество примеров подряд | 1…10 | ketma-ket misollar |
| Интервал между примерами | 1…7 s | misollar orasidagi pauza |

### Klient mexanikasi (`main.js`) — e'tiborga loyiq nuqtalar

- **Oldindan yuklash:** `Get_Primer()` misolni 2 sekundlik "На старт / Внимание / Марш!"
  countdown paytida oladi, shuning uchun ko'rsatishda kechikish bo'lmaydi.
- **Takrorlanishga qarshi:** oxirgi **5 ta** misol `historyArr` da string sifatida saqlanadi;
  bir xili tushsa qayta so'raladi (`Get_Primer()` rekursiyasi).
- **Bo'sh kadr:** `Go()` da ko'rsatiladigan indeks `data[i-2]`, `i` esa 1 dan boshlanadi →
  birinchi tick'da `undefined` chiqadi, ya'ni **har bir raqamdan oldin bo'sh oraliq** bo'ladi.
  Interval = butun tsikl (bo'sh + raqam) — bizdagi `numberTiming` bilan bir xil g'oya.
- **Natija bahosi:** `proc = round(good*100/pod)` → <20 "Очень плохо", <40 "Плохо",
  <60 "Не плохо", <80 "Хорошо", aks holda "Отлично".
- **Klaviatura:** `Enter` — boshlash / tekshirish / davom etish, `Esc` — to'xtatish.
- Xato javobda butun misol qatorma-qator va to'g'ri javob ko'rsatiladi.

---

## 2. Abakus (soroban) modeli — formulalar tasnifi

Har bir xona (rod) raqami `d = 5·u + l`, `u ∈ {0,1}`, `l ∈ 0…4`.
Bitta `±x` (1…9) amal shu xonaga tushadi va 4 turdan biriga kiradi:

| Tur | Nomi (RU / UZ) | Shart (qo'shishda `d + x`) |
|---|---|---|
| `direct` | Прямое / **formulasiz** | `u+ux ≤ 1` va `l+lx ≤ 4` — donalar yetadi |
| `small5` | Младшие товарищи / **kichik do'st** | `d+x ≤ 9`, lekin donalar yetmaydi → `+5−(5−x)` |
| `big10` | Старшие товарищи / **katta do'st** | `d+x ≥ 10` → `+10−(10−x)`, keyingi xonaga ko'chirish; `10−x` to'g'ridan-to'g'ri ayriladi |
| `mix` | Микс формулы / **aralash** | ko'chirish bor, lekin `10−x` ni ayirish uchun yana 5-to'ldiruvchi kerak (masalan `+6` bo'lganda `−4` uchun `−5+1`) |

Ayirishda hammasi nosimmetrik. **Bu bizning `src/domain/practice/soroban.ts` dagi
`classifyMove` bilan aynan bir xil model** (`formulasiz / kichik / katta / miks`) — tekshirildi,
tasnif natijalari mos tushdi.

Ko'p xonali qo'shiluvchi xonama-xona (birlikdan boshlab) qayta ishlanadi; ko'chirish
yuqori xonada yana o'z turiga ega bo'ladi — shu yerdan "переход через 50 / 100" mavzulari kelib chiqadi.

---

## 3. Umumiy invariantlar (16 000 namunada 100 % bajarilgan)

1. `answer = Σ terms` — har doim.
2. **Oraliq yig'indi hech qachon manfiy bo'lmaydi** (`neg = 0`, barcha mavzularda).
3. Qo'shiluvchilar razryadga mos: 1Д → `1…9`, 2Д → `10…99`, 3Д → `100…999` (ishorali).
4. `0` qo'shiluvchi faqat juda sodda 1Д mavzularda (T1, T2, T4) uchraydi — ehtimol chetki holat.
5. **Oraliq yig'indi chegarasi mavzu darajasiga bog'liq:**
   - faqat `direct`/`small5` mavzular (T1–T27): 1Д da `0…9`, 2Д da `0…99` — ya'ni **ko'chirish yo'q**;
   - `big10` kirgan mavzular (T28+): 1Д da `0…~50`, 2Д da `0…99`;
   - "через 100" mavzularida (T85+) oraliq yig'indi `100…300` gacha chiqadi.
6. Mavzu **maqsadli formulasi** kamida bir marta uchraydi; qolgan qadamlar — o'sha mavzuga qadar
   o'rganilgan yengilroq formulalar. Uzun ketma-ketliklarda (ryad ≥ 8–10) maqsad **100 %**
   uchraydi; qisqa ketma-ketliklarda (ryad 4–5) ba'zan aynan shu raqam emas, lekin **o'sha oila**
   (`small5` / `big10` / `mix`) 100 % uchraydi. Ya'ni server "pool + qayta urinish" prinsipi bilan
   ishlaydi, qattiq kafolat emas — bizdagi `draftProblem` + `requiredHits` bilan bir xil yondashuv.

---

## 4. Mavzu oilalari va ularning aniq qoidasi

### 4.1 Прямое (T1–T18) — formulasiz
Faqat `direct` qadamlar, oraliq yig'indi xona ichida qoladi (1Д: 0…9; 2Д: 0…99).
Qo'shiluvchilar to'plami sarlavha bilan cheklanadi:

| Mavzu | Ruxsat etilgan qadamlar | Oraliq |
|---|---|---|
| T1 `+1…4` | `+1…+4` (ba'zan `0`) | 0…9, aslida 0…4 |
| T2 `−1…4` | `−1…−4` | 0…4 |
| T3 `±1…4` | `±1…±4` | 0…4 |
| T4 `+5` | `+5` va `±1…3` | 0…9 |
| T5 `−5` | `−5` va `±1…4`; birinchi son `5…9` | 0…9 |
| T6 `±5` | `±5`, `±1…4` | 0…9 |
| T7…T12 `±6 / ±7` | maqsad `±6` yoki `±7` + yengilroqlari | 0…9 |
| T13 `±8, ±9` | `±8`, `±9` + oldingilari | 0…9 |
| T14–T18 `2Д, 2…6 qator` | ikki xonali, har ikkala xonada `direct` | 0…99 |

### 4.2 Младшие товарищи (T19–T27) — kichik do'st (5-to'ldiruvchi)
Maqsad: `small5` turidagi **aynan `±N`** qadam (`N` sarlavhada).
Misol `Младшие товарищи +4` → `u0 +4 small5` namunalarning 97–100 % ida bor.
Qolgan qadamlar `direct` yoki oldin o'rganilgan kichik do'stlar (`+4` mavzusida faqat `±4`;
`+3` mavzusida `±4, ±3` va h.k. — kumulyativ).
Oraliq yig'indi **0…9** (1Д), ko'chirish yo'q. T27 — xuddi shu, lekin ikki xonali (`0…99`),
har ikkala xonada `small5` ishlatiladi.

### 4.3 Старшие товарищи (T28–T50) — katta do'st (10-to'ldiruvchi)
Maqsad: `big10` turidagi `±N` qadam.
- **1Д:** `+9` mavzusida `u0 +9 big10` 100 %; qolganlari `direct`/`small5`.
  Oraliq yig'indi endi 9 dan oshadi (`0…~50`), chunki ko'chirish o'nliklar xonasini uyg'otadi.
- **2Д:** qo'shiluvchi **birliklar xonasi = N** bo'ladi (`+9` → `19, 29, 39, 49, 59, 69`),
  o'nliklar xonasi esa `direct`/`small5`. Ya'ni "katta do'st birlikda + oddiy amal o'nlikda".
- **3Д:** shu naqsh yuzlik xonasigacha ko'chadi.
- T50 `Старшие товарищи (−), сводный` — barcha `−1…−9` katta do'stlarining birlashmasi.

### 4.4 Микс формулы (T37–T40, T51–T55) — aralash formula
Maqsad: `mix` turidagi `±N`. 1Д da `+6…+9` va `−6…−9` uchun, 2Д/3Д da esa
birliklar xonasida `mix`, yuqori xonalarda `direct/small5/big10`.
T55 `Микс формулы (−), сводный` — barcha manfiy mikslar birlashmasi.

### 4.5 Переход через 50 (T56–T84)
**Aniq qoida (namunalarda tasdiqlandi):** ketma-ketlikda shunday qadam bo'ladiki,
- birliklar xonasidagi amal aynan **`±N`** (sarlavhadagi raqam), `big10` turida
  (yoki `(МФ)` variantlarida `mix` turida) → o'nliklarga ko'chirish beradi;
- shu ko'chirish natijasida son **50 chegarasidan o'tadi** (o'nliklar xonasida 5-dona ishlatiladi).

Tekshiruv: T56 `+9` da 50 dan o'tuvchi qadamning birliklar operandi 53 martadan `+9`;
T60 `+5` da `+5`; T64 `+1` da `+1`; T70 `−9` da `−9`; T74 `−5` da `−5`; T78 `−1` da `−1`.
50 dan o'tish namunalarning **100 %** ida bor.
- T69 `(+)` / T83 `(−)` / T84 `сводный` — barcha `N` larning birlashmasi.
- Oraliq yig'indi `0…99` (yuzlikka chiqmaydi).

### 4.6 Переход через 100 (T85–T121)
**Aniq qoida:** 100 chegarasidan o'tuvchi qadamda ikki bosqichli ko'chirish bo'ladi:
```
(xona 0: ±N, big10)  →  (xona 1: ±M, big10 yoki mix)  →  yuzlikka ko'chirish
```
`N` — sarlavhadagi raqam. Masalan T89 `Переход через 100 (+5)` da eng ko'p uchraydigan
naqsh `((0,+5,big10),(1,+2,big10))`; T103 `(−9)` da `((0,−9,big10),(1,−6,mix))` va h.k.
`(МФ)` variantlarida birliklar xonasi `mix`: T98 `(+6 МФ)` → `((0,+6,mix),(1,+7,big10))`.
100 dan o'tish namunalarning **100 %** ida bor; oraliq yig'indi `100…~300` gacha chiqadi.
- T94–T97, T112–T115 — ikki-uch raqamning guruhlangan variantlari (`+9/+8`, `+7/+6/+5`, …).
- T102 `(+)`, T120 `(−)`, T121 `(+/−) свободный` — birlashgan variantlar (faqat 3Д).

### 4.7 Ryad (qatorlar soni) mavzuga bog'liq
- Sodda prямое: 2–5;
- Младшие/Старшие товарищи: 3–10 (ba'zan 15);
- Переход через 50/100: asosan 5 (ba'zan 6–10).

Bu tasodifiy emas: murakkab formulani 2 qatorda ko'rsatib bo'lmaydi (kamida "tayyorlov" qadami kerak),
shuning uchun minimal ryad mavzu murakkabligi bilan o'sadi.

---

## 5. Generatsiya algoritmi (qayta tiklangan model)

Namunalarning statistikasi quyidagi algoritm bilan to'liq mos keladi:

```
generate(tema, razryad, ryad):
  pool      = ALLOWED_MOVES[tema]        # maqsad formulasi + undan oldingilari (kumulyativ)
  target    = TARGET[tema]               # (kind, ±N) yoki (kind, ±N, crossing: 50|100)
  bounds    = BOUNDS[tema, razryad]      # oraliq yig'indi chegarasi

  repeat until target bajarildi (yoki urinishlar tugadi):
     total   = random birinchi son (razryadga mos, target uchun qulay bo'lishi mumkin)
     terms   = [total]
     while len(terms) < ryad:
        valid    = { x ∈ pool : 0 ≤ total+x ≤ bounds.max }
        matching = { x ∈ valid : classify(total, x) == target }
        x = random(matching yoki bo'sh bo'lsa valid)
        terms.push(x); total += x
  return terms + [total]
```

Muhim jihatlar:
- `matching` bo'sh bo'lsa ham misol buziladigan emas — shunchaki yengilroq qadam olinadi,
  va butun misol qayta urinishga beriladi (shu sababli qisqa ryadlarda maqsad 100 % emas).
- Birinchi son maqsadni "tayyorlaydi": masalan `−5` mavzusida birinchi son har doim `5…9`.
- Oxirgi 5 ta misol klientda eslab qolinadi — bizda ham shu foydali.

---

## 6. Loyihaga ko'chirish (bajarildi)

Bu bo'lim **bajarildi** (2026-09-20). Loyihadagi holat:

| Fayl | Nima qo'shildi |
|---|---|
| `src/domain/practice/soroban.ts` | `describeMove(total, value)` — harakatni xonama-xona o'qiydi: har bir xona uchun `direct / small5 / big10 / mix`, birliklar xonasidagi amal va yig'indi qaysi chegaradan (50 yoki 100) o'tgani |
| `src/domain/practice/topics.ts` | **109 ta mavzu katalogi** (saytning 121 mavzusi ekvivalenti), guruhlar, pool va chegaralar; `matchesTopic`, `allowedByTopic`, `topicMaxTotal` |
| `src/domain/practice/problem.ts` | mavzu bo'yicha generatsiya: nomzod qadamlarni `describeMove` bilan saralaydi, maqsadni bir qadam oldindan ko'radi (lookahead), yetarli "urish" bo'lmasa misolni qayta chizadi |
| `src/domain/practice/config.ts` | `topicId?: string`; normalizatsiya mavzuning bo'limi, xona soni va minimal qator soniga moslaydi |
| `src/features/practice/PracticeConfigFields.tsx` | yagona «Mavzu» tanlagichi: birinchi guruh «Aralash (butun bo'lim)» — 4 ta bo'lim, keyin mavzular guruhlari. Eski 4 ta bo'lim chipi olib tashlandi (bir xil narsani ikki joyda belgilar edi) |
| `src/domain/practice/topics.test.ts` | har bir mavzu uchun test: 12 misoldan kamida 9 tasida maqsad formula bor, oraliq yig'indi chegarada, javob = yig'indi |

Mavzu = `{ amounts, technique, crossing? }` uchligi:

| TopicId | technique | amount | crossing | Mos anzan mavzusi |
|---|---|---|---|---|
| `togri+1-4` | direct | +1…+4 | — | T1 |
| `kichik+4` | small5 | +4 | — | T19 |
| `katta-9` | big10 | −9 | — | T41 |
| `miks+6` | mix | +6 | — | T37 |
| `o50+9` | big10 | +9 | 50 | T56 |
| `o100-6mf` | mix | −6 | 100 | T116 |

Chegaralar (`topicMaxTotal`):

| Mavzu turi | digitCount | oraliq yig'indi max |
|---|---|---|
| direct / small5 | 1 | 9 |
| direct / small5 | 2–3 | 99 / 999 |
| big10 / mix | 1 | 99 |
| big10 / mix | 2–3 | 99 / 999 |
| crossing 100 | 2–3 | 300 / 3000 |

**Farq:** «50 dan o'tish» mavzulari faqat 2 xonali sonlar uchun qo'shildi. Saytda ular 3 xonalida
ham bor, lekin u yerda o'tish goh 50 dan, goh 500 dan bo'ladi (namunalarda 20–90 % orasida
sochilgan) — ya'ni mashq bir xil narsani o'rgatmaydi; shuning uchun aniq holat qoldirildi.

Namunalar (generatordan, `seed = 42`):

```
Kichik do'st +4    1D | 3 +4 -4 +4 -4 = 3      | 2 +4 -5 +4 -4 = 1
Katta do'st +9     1D | 6 +9 -2 +9 +9 = 31     | 2 +9 +9 +2 +9 = 31
Miks formula +6    1D | 5 +6 -3 +6 +4 = 18     | 1 +6 +6 +5 +6 = 24
50 dan o'tish +9   2D | 10 +28 +29 -28 +29 = 68| 44 -30 +59 -25 +49 = 97
100 dan o'tish +9  2D | 31 +79 +46 +49 +76 = 281
100 dan o'tish −6 (miks) 2D | 34 +69 -36 +84 -66 = 85
```

---

## 7. To'liq mavzular katalogi (121 ta)

`Razryad` — qaysi xona sozlamalarida mavjud; `Qatorlar` — ruxsat etilgan ryad qiymatlari;
`Namuna` — serverdan olingan haqiqiy misol.

| # | Mavzu (RU) | Razryad | Qatorlar (ryad) | Namuna |
|---|-----------|---------|-----------------|--------|
| 1 | Прямое сложение. Однозначные +1...4 | 1 | 1Д:2,3 | `2 1 = 3` |
| 2 | Прямое вычитание. Однозначные -1…4 | 1 | 1Д:2,3 | `4 -4 = 0` |
| 3 | Прямое сложение и вычитание. Однозначные, +/- 1...4 | 1 | 1Д:3,4,5 | `2 1 1 = 4` |
| 4 | Прямое сложение. Однозначные, +5 | 1 | 1Д:3,4 | `1 5 1 = 7` |
| 5 | Прямое вычитание. Однозначные, -5 | 1 | 1Д:3,4 | `6 2 -5 = 3` |
| 6 | Прямое сложение и вычитание. Однозначные, +/- 5 | 1 | 1Д:3,4,5 | `2 1 5 = 8` |
| 7 | Прямое сложение. Однозначные, +6 | 1 | 1Д:3,4 | `4 -1 6 = 9` |
| 8 | Прямое вычитание. Однозначные, -6 | 1 | 1Д:3,4 | `5 4 -6 = 3` |
| 9 | Прямое сложение и вычитание. Однозначные, +/- 6 | 1 | 1Д:3,4,5 | `2 6 -3 = 5` |
| 10 | Прямое сложение. Однозначные, +7 | 1 | 1Д:3,4 | `7 -6 7 = 8` |
| 11 | Прямое вычитание. Однозначные, -7 | 1 | 1Д:3,4 | `9 -7 6 = 8` |
| 12 | Прямое сложение и вычитание. Однозначные, +/- 7 | 1 | 1Д:3,4,5 | `7 -5 7 = 9` |
| 13 | Прямое сложение и вычитание. Однозначные, +/- 8 и 9 | 1 | 1Д:3,4,5 | `3 -2 8 = 9` |
| 14 | Прямое +/-, 2Д2Р | 2 | 2Д:2 | `35 13 = 48` |
| 15 | Прямое +/-, 2Д3Р | 2 | 2Д:3 | `96 -25 17 = 88` |
| 16 | Прямое +/-, 2Д4Р | 2 | 2Д:4 | `84 -63 16 52 = 89` |
| 17 | Прямое +/-, 2Д5Р | 2 | 2Д:5 | `39 -27 36 -15 56 = 89` |
| 18 | Прямое +/-, 2Д6Р | 2 | 2Д:6 | `84 -53 17 -25 51 -61 = 13` |
| 19 | Младшие товарищи +4 | 1 | 1Д:3,4,5,6,7,8,10 | `4 4 -6 = 2` |
| 20 | Младшие товарищи -4 | 1 | 1Д:3,4,5,6,7,8,10 | `9 -3 -4 = 2` |
| 21 | Младшие товарищи +3 | 1 | 1Д:3,4,5,6,7,8,10 | `3 3 -4 = 2` |
| 22 | Младшие товарищи -3 | 1 | 1Д:3,4,5,6,7,8,10 | `5 -3 6 = 8` |
| 23 | Младшие товарищи +2 | 1 | 1Д:3,4,5,6,7,8,10 | `6 -5 2 = 3` |
| 24 | Младшие товарищи -2 | 1 | 1Д:3,4,5,6,7,8,10 | `7 -1 -2 = 4` |
| 25 | Младшие товарищи +1 | 1 | 1Д:3,4,5,6,7,8,10 | `7 -3 1 = 5` |
| 26 | Младшие товарищи -1 | 1 | 1Д:3,4,5,6,7,8,10 | `7 -2 -1 = 4` |
| 27 | Младшие товарищи, +/- двузначные | 2 | 2Д:2,3,4,5,10 | `35 44 = 79` |
| 28 | Старшие товарищи +9 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `6 -4 9 4 = 15` |
| 29 | Старшие товарищи +8 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `4 5 9 8 = 26` |
| 30 | Старшие товарищи +7 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `4 9 8 3 = 24` |
| 31 | Старшие товарищи +6 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `2 3 -1 6 = 10` |
| 32 | Старшие товарищи +5 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `8 -4 7 4 = 15` |
| 33 | Старшие товарищи +4 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `8 -4 3 4 = 11` |
| 34 | Старшие товарищи +3 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `3 4 5 6 = 18` |
| 35 | Старшие товарищи +2 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5 | `4 2 2 2 = 10` |
| 36 | Старшие товарищи +1 | 1,2 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5,10,15 | `8 1 1 7 = 17` |
| 37 | Микс формулы +6 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5,6,7,8,10; 3Д:3,5 | `1 4 -3 6 = 8` |
| 38 | Микс формулы + 7 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5,6,7,8,10; 3Д:3,5 | `9 2 6 7 = 24` |
| 39 | Микс формулы + 8 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5,6,7,8,10; 3Д:3,5 | `4 2 8 1 = 15` |
| 40 | Микс формулы + 9 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:2,3,4,5,6,7,8,10,15; 3Д:3,5 | `8 -2 -3 2 = 5` |
| 41 | Старшие товарищи -9 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `3 2 8 7 = 20` |
| 42 | Старшие товарищи -8 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `8 4 4 6 = 22` |
| 43 | Старшие товарищи -7 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `5 9 9 2 = 25` |
| 44 | Старшие товарищи -6 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `4 1 5 -6 = 4` |
| 45 | Старшие товарищи -5 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `6 6 7 2 = 21` |
| 46 | Старшие товарищи -4 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `8 7 7 -4 = 18` |
| 47 | Старшие товарищи -3 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `5 5 -3 6 = 13` |
| 48 | Старшие товарищи -2 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `5 -1 6 -2 = 8` |
| 49 | Старшие товарищи -1 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `9 4 4 3 = 20` |
| 50 | Старшие товарищи (-), сводный | 1,2 | 1Д:5,6,7,8,9,10; 2Д:5,6,7,8,9,10,11,12,13,14,15 | `6 4 -5 8 -9 = 4` |
| 51 | Микс формулы -6 | 1,2,3 | 1Д:4,5,6,7,8,9,10; 2Д:5,6,7,8,9,10; 3Д:5 | `7 7 -6 4 = 12` |
| 52 | Микс формулы  -7 | 1,2,3 | 1Д:5,10; 2Д:5,10; 3Д:5 | `3 8 9 -8 -7 = 5` |
| 53 | Микс формулы  -8 | 1,2,3 | 1Д:5,10; 2Д:5,10; 3Д:5 | `8 6 4 5 -8 = 15` |
| 54 | Микс  формулы -9 | 1,2,3 | 1Д:5,10; 2Д:5,10; 3Д:5 | `7 7 -9 -1 7 = 11` |
| 55 | Микс формулы  (-), сводный | 1,2 | 1Д:5,10; 2Д:5,10 | `5 9 -7 6 -8 = 5` |
| 56 | Переход через 50 (+9) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `21 19 9 9 -14 = 44` |
| 57 | Переход через 50 (+8) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `78 -49 28 -34 29 = 52` |
| 58 | Переход через 50 (+7) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `48 -34 19 17 -22 = 28` |
| 59 | Переход через 50 (+6) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `77 -48 26 11 -47 = 19` |
| 60 | Переход через 50 (+5) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `17 35 -24 11 15 = 54` |
| 61 | Переход через 50 (+4) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `24 14 14 -37 48 = 63` |
| 62 | Переход через 50 (+3) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `73 -36 13 -22 -14 = 14` |
| 63 | Переход через 50 (+2) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `56 28 -55 22 44 = 95` |
| 64 | Переход через 50 (+1) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `82 -63 31 48 -79 = 19` |
| 65 | Переход через 50 (+6) (МФ) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `43 -17 26 -22 27 = 57` |
| 66 | Переход через 50 (+7) (МФ) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `84 -56 -16 24 17 = 53` |
| 67 | Переход через 50 (+8) (МФ) | 2,3 | 2Д:5,10; 3Д:5 | `36 19 -26 28 -14 = 43` |
| 68 | Переход через 50 (+9) (МФ) | 2,3 | 2Д:5,10; 3Д:5 | `74 -47 -12 39 16 = 70` |
| 69 | Переход через 50 (+) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `18 32 11 -25 -27 = 9` |
| 70 | Переход через 50 (-9) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `36 25 -19 28 -17 = 53` |
| 71 | Переход через 50 (-8) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `26 64 -48 26 -19 = 49` |
| 72 | Переход через 50 (-7) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `78 -17 -17 -17 24 = 51` |
| 73 | Переход через 50 (-6) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `75 -26 31 -36 29 = 73` |
| 74 | Переход через 50 (-5) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `54 14 13 -35 -27 = 19` |
| 75 | Переход через 50 (-4) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `21 16 16 28 -34 = 47` |
| 76 | Переход через 50 (-3) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `26 46 -23 44 -47 = 46` |
| 77 | Переход через 50 (-2) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `47 27 -19 25 -32 = 48` |
| 78 | Переход через 50 (-1) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `34 26 -11 27 -29 = 47` |
| 79 | Переход через 50 (-6) (МФ) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `48 24 -26 -22 33 = 57` |
| 80 | Переход через 50 (-7) (МФ) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `26 48 -27 -18 21 = 50` |
| 81 | Переход через 50 (-8) (МФ) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `38 14 12 -18 -18 = 28` |
| 82 | Переход через 50 (-9) (МФ) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `35 49 -39 -17 24 = 52` |
| 83 | Переход через 50 (-) | 2,3 | 2Д:5,6,7,8,9,10; 3Д:5 | `31 43 -29 -14 -12 = 19` |
| 84 | Переходы +/- 50, сводный | 2,3 | 2Д:5; 3Д:5 | `43 -28 39 16 -21 = 49` |
| 85 | Переход через 100 (+9) | 2,3 | 2Д:5; 3Д:5 | `17 46 39 54 -32 = 124` |
| 86 | Переход через 100 (+8) | 2,3 | 2Д:5; 3Д:5 | `61 39 48 58 -43 = 163` |
| 87 | Переход через 100 (+7) | 2,3 | 2Д:5; 3Д:5 | `13 87 -42 25 17 = 100` |
| 88 | Переход через 100 (+6) | 2,3 | 2Д:5; 3Д:5 | `66 17 17 64 36 = 200` |
| 89 | Переход через 100 (+5) | 2,3 | 2Д:5; 3Д:5 | `85 15 -34 -23 57 = 100` |
| 90 | Переход через 100 (+4) | 2,3 | 2Д:5; 3Д:5 | `11 65 24 -18 14 = 96` |
| 91 | Переход через 100 (+3) | 2,3 | 2Д:5; 3Д:5 | `19 84 28 29 -35 = 125` |
| 92 | Переход через 100 (+2) | 2,3 | 2Д:5; 3Д:5 | `48 52 -11 12 49 = 150` |
| 93 | Переход через 100 (+1) | 2,3 | 2Д:5; 3Д:5 | `45 13 42 69 32 = 201` |
| 94 | Переход через 100 (+9/+8) | 2 | 2Д:5 | `15 47 38 64 39 = 203` |
| 95 | Тема. Переход через 100 (+7/+6/+5) | 2 | 2Д:5 | `14 86 -27 -45 77 = 105` |
| 96 | Переход через 100 (+4/+3) | 2 | 2Д:5 | `89 13 84 16 -15 = 187` |
| 97 | Тема. Переход через 100 (+2/+1) | 2 | 2Д:5 | `14 24 62 -11 12 = 101` |
| 98 | Переход через 100 (+6 МФ) | 2,3 | 2Д:5; 3Д:5 | `37 19 36 -15 42 = 119` |
| 99 | Переход через 100 (+7 МФ) | 2,3 | 2Д:5; 3Д:5 | `87 17 64 -34 21 = 155` |
| 100 | Переход через 100 (+8 МФ) | 2,3 | 2Д:5; 3Д:5 | `24 31 49 -49 48 = 103` |
| 101 | Переход через 100 (+9 МФ) | 2,3 | 2Д:5; 3Д:5 | `12 44 48 -16 -43 = 45` |
| 102 | Переход через 100 (+) | 3 | 3Д:5 | `725 179 -625 323 149 = 751` |
| 103 | Переход через 100 (-9) | 2,3 | 2Д:5; 3Д:5 | `49 69 -19 44 -49 = 94` |
| 104 | Переход через 100 (-8) | 2,3 | 2Д:5; 3Д:5 | `57 64 -28 53 -48 = 98` |
| 105 | Переход через 100 (-7) | 2,3 | 2Д:5; 3Д:5 | `86 95 -87 56 -57 = 93` |
| 106 | Переход через 100 (-6) | 2,3 | 2Д:5; 3Д:5 | `87 73 -66 26 -26 = 94` |
| 107 | Переход через 100 (-5) | 2,3 | 2Д:5; 3Д:5 | `59 71 -35 48 -45 = 98` |
| 108 | Переход через 100 (-4) | 2,3 | 2Д:5; 3Д:5 | `61 82 -44 81 -84 = 96` |
| 109 | Переход через 100 (-3) | 2,3 | 2Д:5; 3Д:5 | `37 85 -23 51 -53 = 97` |
| 110 | Переход через 100 (-2) | 2,3 | 2Д:5; 3Д:5 | `86 35 -22 31 -32 = 98` |
| 111 | Переход через 100 (-1) | 2,3 | 2Д:5; 3Д:5 | `58 72 -31 71 -71 = 99` |
| 112 | Переход через 100 (-9/-8) | 2 | 2Д:5 | `65 58 -29 41 -39 = 96` |
| 113 | Переход через 100 (-7/-6/-5) | 2 | 2Д:5 | `76 55 -37 28 -25 = 97` |
| 114 | Переход через 100 (-4/-3) | 2 | 2Д:5 | `73 57 -33 25 -24 = 98` |
| 115 | Переход через 100 (-2/-1) | 2 | 2Д:5 | `38 82 -21 61 -62 = 98` |
| 116 | Переход через 100 (-6 МФ) | 2,3 | 2Д:5; 3Д:5 | `32 44 67 -46 54 = 151` |
| 117 | Переход через 100 (-7 МФ) | 2,3 | 2Д:5; 3Д:5 | `86 68 -57 45 -47 = 95` |
| 118 | Переход через 100 (-8 МФ) | 2,3 | 2Д:5; 3Д:5 | `35 24 75 -38 24 = 120` |
| 119 | Переход через 100 (-9 МФ) | 2,3 | 2Д:5; 3Д:5 | `83 43 98 -29 55 = 250` |
| 120 | Переход через 100 (-) | 3 | 3Д:5 | `421 -122 351 -253 485 = 882` |
| 121 | Переход через 100 (+/-), свободный | 3 | 3Д:5 | `415 186 -305 408 -348 = 356` |

