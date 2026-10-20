---
tags: [UXUI, สรุปสอบ, HCI]
aliases: [สรุป UX/UI]
---

# 📘 สรุปเตรียมสอบ UX/UI

> [!info] แนวข้อสอบ
> - **ข้อ 1 + 3** → Shneiderman's Eight Golden Rules ⭐ (ออก 2 ข้อ อ่านให้ลึกที่สุด)
> - **ข้อ 2** → Information Architecture (Card Sorting / Sitemap)
> - **ข้อ 4** → Evaluation (เน้น Nielsen's 10 Usability Heuristics)
> - **ข้อ 5** → A/B Testing
> - **ข้อ 6** → Universal Design (UD)

## สารบัญ
- [[#1. Shneiderman's Eight Golden Rules]]
- [[#2. Information Architecture]]
- [[#3. Evaluation & Nielsen's 10 Usability Heuristics]]
- [[#4. A/B Testing]]
- [[#5. Universal Design (UD)]]
- [[#6. Cheat Sheet ทบทวนก่อนสอบ]]
- [[#7. แนวข้อสอบพร้อมตัวอย่างคำตอบ]]

---

# 1. Shneiderman's Eight Golden Rules

## 1.1 ภูมิหลัง
- **Ben Shneiderman** นักวิทยาศาสตร์คอมพิวเตอร์ University of Maryland ผู้บุกเบิกด้าน HCI (Human-Computer Interaction)
- เสนอในหนังสือ **"Designing the User Interface"** (ฉบับแรก ปี 1985/1987) ปรับปรุงหลายครั้ง (ฉบับปี 2016 เปลี่ยนข้อ 2 เป็น *Seek universal usability* และข้อ 7 เป็น *Keep users in control*)
- เป็น **หลักการออกแบบ (design principles)** ใช้ได้ทั้งตอน *ออกแบบ* และตอน *ประเมิน* UI
- เน้นที่ **interaction dialog** ระหว่างผู้ใช้กับระบบ

## 1.2 กฎทั้ง 8 ข้อ (ท่องให้ได้!)

> [!tip] ช่วยจำ: **C-U-F-C-P-R-C-R**
> **C**onsistency → **U**niversal usability → **F**eedback → **C**losure → **P**revent errors → **R**eversal → **C**ontrol → **R**educe memory load

### ① Strive for Consistency (มุ่งความสม่ำเสมอ)
- **ความหมาย:** การกระทำที่คล้ายกันควรมีลำดับขั้นตอนเหมือนกัน ใช้คำศัพท์ ไอคอน สี เมนู ฟอนต์ เลย์เอาต์ แบบเดียวกันทั้งระบบ
- **เหตุผล:** ผู้ใช้เรียนรู้ครั้งเดียวใช้ได้ทั้งระบบ ลดภาระการเรียนรู้ ลดความผิดพลาด
- **ตัวอย่างดี:** ปุ่ม "บันทึก" อยู่ตำแหน่งเดิม สีเดิมทุกหน้า, Ctrl+C / Ctrl+V ใช้ได้ทุกโปรแกรม, Microsoft Office มี Ribbon เหมือนกันทุกแอป
- **ตัวอย่างละเมิด:** หน้าหนึ่งใช้คำว่า "ลบ" อีกหน้าใช้ "Remove"; ปุ่มยืนยันสีเขียวบางหน้า สีแดงบางหน้า
- **ประเภทความสม่ำเสมอ:** Internal (ภายในระบบเดียวกัน) / External (สอดคล้องกับมาตรฐานแพลตฟอร์มหรือระบบอื่น)
- ข้อยกเว้นที่ยอมรับได้: เช่น การขอยืนยันก่อนลบ หรือไม่แสดงรหัสผ่าน (ควรมีให้น้อย)

### ② Seek Universal Usability (ออกแบบให้ทุกคนใช้ได้) — *เดิม: Enable frequent users to use shortcuts*
- **ความหมาย:** รองรับผู้ใช้หลากหลาย — มือใหม่ vs ผู้เชี่ยวชาญ, อายุ, ความพิการ, วัฒนธรรม/ภาษา, อุปกรณ์
- **แนวทาง:** มีคำอธิบายสำหรับมือใหม่ + **ทางลัด (shortcuts, hotkeys, macros, gestures)** สำหรับผู้ใช้ประจำ
- **ตัวอย่าง:** Keyboard shortcut ใน Figma/Photoshop, tooltip ช่วยมือใหม่, รองรับ screen reader, ปรับขนาดตัวอักษร, Dark mode, หลายภาษา
- **ตัวอย่างละเมิด:** ระบบที่ต้องคลิกเมนู 5 ชั้นทุกครั้งโดยไม่มี shortcut; เว็บที่ใช้ไม่ได้กับ screen reader
- เชื่อมโยงกับ **Universal Design** (ข้อ 6)

### ③ Offer Informative Feedback (ให้ผลตอบกลับที่มีความหมาย)
- **ความหมาย:** ทุกการกระทำของผู้ใช้ควรได้รับ feedback จากระบบ
  - การกระทำเล็ก/บ่อย → feedback เล็กน้อย (เช่น ปุ่มเปลี่ยนสีเมื่อกด)
  - การกระทำใหญ่/ไม่บ่อย → feedback ชัดเจน (เช่น dialog แจ้งผล)
- **ตัวอย่าง:** Progress bar ตอนอัปโหลด, "ส่งข้อความแล้ว ✓✓" ใน LINE, Toast "บันทึกสำเร็จ", แจ้งจำนวนสินค้าในตะกร้าเปลี่ยน
- **ตัวอย่างละเมิด:** กดปุ่มแล้วไม่มีอะไรเกิดขึ้น ผู้ใช้กดซ้ำจนสั่งซื้อ 2 ครั้ง
- **Visual presentation** ของ object ที่สนใจช่วยให้เห็นการเปลี่ยนแปลงชัด (direct manipulation)

### ④ Design Dialogs to Yield Closure (ออกแบบลำดับขั้นให้มีจุดสิ้นสุดชัดเจน)
- **ความหมาย:** ลำดับการกระทำควรจัดเป็นกลุ่ม มี **จุดเริ่มต้น – ระหว่างทาง – จุดจบ** ชัดเจน เมื่อจบให้ feedback ว่าเสร็จสมบูรณ์
- **เหตุผล:** ผู้ใช้รู้สึกโล่งใจ (sense of accomplishment) และพร้อมไปงานต่อไป ไม่ต้องจำแผนสำรอง
- **ตัวอย่าง:** Checkout แบบ stepper (ตะกร้า → ที่อยู่ → ชำระเงิน → **หน้ายืนยันคำสั่งซื้อ + เลขออเดอร์**), หน้า "สมัครสมาชิกสำเร็จ", อีเมลยืนยัน
- **ตัวอย่างละเมิด:** ชำระเงินแล้วกลับไปหน้าแรกเฉยๆ ไม่รู้ว่าสำเร็จหรือไม่

### ⑤ Prevent Errors (ป้องกันความผิดพลาด)
- **ความหมาย:** ออกแบบให้ผู้ใช้ทำผิดได้ยากที่สุด และถ้าผิด ระบบต้องตรวจจับได้และเสนอวิธีแก้ที่ **เรียบง่าย สร้างสรรค์ เฉพาะเจาะจง**
- **แนวทาง:**
  - ปิด (disable/gray out) เมนูที่ใช้ไม่ได้
  - ใช้ dropdown/date picker แทนการพิมพ์อิสระ
  - Inline validation (ตรวจทันทีขณะพิมพ์)
  - ถ้าผิด ไม่ต้องให้กรอกใหม่ทั้งหมด — แก้เฉพาะช่องที่ผิด
  - ระบบสถานะไม่เปลี่ยนเมื่อกระทำผิด
- **ตัวอย่าง:** Gmail เตือน "คุณพิมพ์ว่าแนบไฟล์แต่ไม่ได้แนบ", ช่องเบอร์โทรรับเฉพาะตัวเลข, ปุ่มสั่งซื้อกดไม่ได้จนกว่ากรอกครบ
- **ตัวอย่างละเมิด:** ฟอร์มยาวกด submit แล้ว error ข้อมูลหายหมด

### ⑥ Permit Easy Reversal of Actions (ย้อนกลับการกระทำได้ง่าย)
- **ความหมาย:** การกระทำควรยกเลิก/ย้อนกลับได้ (Undo) ช่วยลดความกังวล ส่งเสริมให้ผู้ใช้กล้าสำรวจ (exploration)
- หน่วยการย้อนกลับอาจเป็นการกระทำเดียว, การกรอกข้อมูลหนึ่งชุด, หรือทั้งกลุ่มการกระทำ
- **ตัวอย่าง:** Ctrl+Z, "Undo send" ใน Gmail, ถังขยะ (Recycle Bin), Version history ใน Google Docs, "ยกเลิกคำสั่งซื้อภายใน 30 นาที"
- **ตัวอย่างละเมิด:** ลบไฟล์แล้วหายถาวรทันทีโดยไม่มีถังขยะ

### ⑦ Keep Users in Control (ให้ผู้ใช้เป็นผู้ควบคุม) — *เดิม: Support internal locus of control*
- **ความหมาย:** ผู้ใช้ (โดยเฉพาะผู้มีประสบการณ์) ต้องรู้สึกว่า *ตนเป็นผู้สั่งการ* ระบบตอบสนองต่อคำสั่ง ไม่ใช่ระบบบงการผู้ใช้
- **สิ่งที่ทำให้ไม่พอใจ:** พฤติกรรมของระบบที่คาดไม่ถึง, ลำดับการป้อนข้อมูลที่น่าเบื่อ, ไม่สามารถได้ข้อมูลที่ต้องการ, ไม่สามารถทำสิ่งที่ต้องการได้
- **ตัวอย่าง:** ปุ่ม Skip โฆษณา, ปิด autoplay ได้, ปุ่ม Pause/Cancel ระหว่างดาวน์โหลด, ตั้งค่าการแจ้งเตือนเองได้
- **ตัวอย่างละเมิด:** Windows update บังคับรีสตาร์ทกลางงาน, popup ที่ปิดไม่ได้, วิดีโอเล่นเสียงอัตโนมัติ

### ⑧ Reduce Short-term Memory Load (ลดภาระความจำระยะสั้น)
- **ความหมาย:** มนุษย์จำข้อมูลระยะสั้นได้จำกัด (**Miller's Law: 7 ± 2 หน่วย**) จึงควรออกแบบให้ผู้ใช้ไม่ต้องจำข้อมูลข้ามหน้าจอ
- **แนวทาง:** ใช้ **recognition แทน recall**, แสดงข้อมูลที่จำเป็นให้เห็น, ไม่ให้ผู้ใช้ต้องจำรหัส/เลขจากหน้าหนึ่งไปกรอกอีกหน้า, จัดกลุ่ม (chunking) ข้อมูล
- **ตัวอย่าง:** Autocomplete ช่องค้นหา, "Recently viewed", เบอร์โทรแสดงแบบ 081-234-5678, breadcrumb, แสดงสรุปคำสั่งซื้อตอนชำระเงิน
- **ตัวอย่างละเมิด:** ระบบให้จดรหัสยืนยัน 12 หลักแล้วไปกรอกอีกหน้า, เมนูที่ซ้อนกันลึกมากๆ

## 1.3 ตารางสรุป Shneiderman

| # | Rule | สรุปสั้น | ตัวอย่าง |
|---|------|---------|---------|
| 1 | Strive for consistency | เหมือนกันทั้งระบบ | ปุ่ม/สี/คำ เหมือนกัน |
| 2 | Seek universal usability | รองรับทุกกลุ่มผู้ใช้ + shortcuts | Hotkeys, screen reader |
| 3 | Offer informative feedback | ทุกการกระทำมีผลตอบกลับ | Progress bar, toast |
| 4 | Design dialogs to yield closure | มีจุดจบชัดเจน | หน้ายืนยันคำสั่งซื้อ |
| 5 | Prevent errors | ป้องกัน + แก้ง่าย | Disable ปุ่ม, inline validation |
| 6 | Permit easy reversal | Undo ได้ | Ctrl+Z, Undo send |
| 7 | Keep users in control | ผู้ใช้เป็นผู้สั่ง | Skip ad, Cancel |
| 8 | Reduce short-term memory load | recognition > recall | Autocomplete, breadcrumb |

## 1.4 Shneiderman vs Nielsen

| ประเด็น | Shneiderman (8 Golden Rules) | Nielsen (10 Heuristics) |
|---|---|---|
| ปีที่เสนอ | 1985/1987 | 1990 (กับ Rolf Molich), ปรับ 1994 |
| ลักษณะ | หลักการออกแบบ interaction | หลักเกณฑ์สำหรับ *ประเมิน* (heuristic evaluation) |
| ข้อที่คล้ายกัน | Consistency ↔ Consistency & standards; Feedback ↔ Visibility of system status; Prevent errors ↔ Error prevention; Reversal + Control ↔ User control & freedom; Memory load ↔ Recognition rather than recall; Universal usability ↔ Flexibility & efficiency | |
| ที่ Nielsen มีเพิ่ม | — | Match real world, Aesthetic & minimalist, Help users recover from errors, Help & documentation |
| ที่ Shneiderman มีเด่น | Closure | — |

> [!example] วิธีตอบข้อสอบแนว "วิเคราะห์ UI ด้วย 8 Golden Rules"
> 1. ระบุ **ชื่อกฎ** (ภาษาอังกฤษ + ไทย)
> 2. อธิบาย **ความหมาย** ของกฎ 1–2 บรรทัด
> 3. ชี้ **จุดใน UI** ที่สอดคล้อง/ละเมิด
> 4. เสนอ **แนวทางปรับปรุง** ที่เป็นรูปธรรม
>
> เช่น: *"แอปธนาคารไม่แสดงหน้าสรุปหลังโอนเงิน → ละเมิด Rule 4 Design dialogs to yield closure เพราะผู้ใช้ไม่รู้ว่าการโอนเสร็จสิ้นแล้ว → ควรแสดงสลิปพร้อมเลขอ้างอิงและปุ่ม 'เสร็จสิ้น'"*

---

# 2. Information Architecture

## 2.1 IA คืออะไร
- **Information Architecture (IA / สถาปัตยกรรมสารสนเทศ)** = ศาสตร์ของการ **จัดระเบียบ (organize), จัดโครงสร้าง (structure), และตั้งชื่อ (label)** เนื้อหา เพื่อให้ผู้ใช้ **ค้นหาข้อมูลและทำงานสำเร็จ** ได้ง่าย
- คำนี้ถูกทำให้แพร่หลายโดย Richard Saul Wurman (1976) และหนังสือ *"Information Architecture for the World Wide Web"* ของ **Louis Rosenfeld & Peter Morville** ("Polar Bear book")
- IA คือ **โครงสร้างเบื้องหลัง** ของ UI — ส่วน Navigation/UI คือสิ่งที่ผู้ใช้มองเห็น

> [!note] IA ตอบคำถามว่า
> - เนื้อหามีอะไรบ้าง? (Content inventory)
> - จัดกลุ่มอย่างไร? (Organization)
> - ตั้งชื่อว่าอะไร? (Labeling)
> - ผู้ใช้เดินทางไปยังเนื้อหาอย่างไร? (Navigation)
> - ผู้ใช้ค้นหาอย่างไร? (Search)

## 2.2 IA Three Circles (Rosenfeld & Morville)
IA ที่ดีต้องสมดุลระหว่าง 3 ส่วน:
1. **Context** — เป้าหมายธุรกิจ, งบ, เทคโนโลยี, วัฒนธรรมองค์กร
2. **Content** — ประเภท, ปริมาณ, โครงสร้าง, เจ้าของเนื้อหา
3. **Users** — ผู้ใช้คือใคร, ต้องการอะไร, พฤติกรรมการค้นหา

## 2.3 องค์ประกอบ 4 ระบบของ IA
| ระบบ | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| **Organization Systems** | วิธีจัดหมวดหมู่ข้อมูล | ตามหมวดสินค้า, ตามวันที่ |
| **Labeling Systems** | การตั้งชื่อ/สัญลักษณ์แทนข้อมูล | เมนู "เกี่ยวกับเรา", ไอคอน 🏠 |
| **Navigation Systems** | วิธีเคลื่อนที่ไปมาในระบบ | Global nav, breadcrumb, footer |
| **Search Systems** | การค้นหาข้อมูล | ช่องค้นหา, filter, facet |

### Organization Schemes (รูปแบบการจัดกลุ่ม)
- **Exact (ชัดเจน/ไม่กำกวม):** Alphabetical (ก-ฮ, A–Z), Chronological (ตามเวลา), Geographical (ตามสถานที่)
- **Ambiguous (กำกวม/ต้องตีความ):** Topic (ตามหัวข้อ), Task (ตามงาน), Audience (ตามกลุ่มผู้ใช้ เช่น "นักศึกษา/บุคลากร/ศิษย์เก่า"), Metaphor (อุปมา เช่น desktop, folder), Hybrid (ผสม)

### Organization Structures
- **Hierarchy (Top-down / Tree)** — โครงสร้างแบบต้นไม้ พบบ่อยที่สุด
- **Database model (Bottom-up)** — ใช้ metadata/tag เช่น e-commerce filter
- **Hypertext** — เชื่อมโยงแบบอิสระ (เช่น Wikipedia, Obsidian 😉)

### Navigation ประเภทต่างๆ
- **Global navigation** — เมนูหลักทุกหน้า
- **Local navigation** — เมนูภายในหมวด
- **Contextual navigation** — ลิงก์ในเนื้อหา "สินค้าที่เกี่ยวข้อง"
- **Supplemental** — Sitemap, Index, Guide
- **Breadcrumb** — หน้าแรก > หมวด > หน้าปัจจุบัน
- **Utility navigation** — Login, ตะกร้า, ภาษา

### Top-down vs Bottom-up IA
- **Top-down:** เริ่มจากเป้าหมายธุรกิจ/ความต้องการผู้ใช้ → แบ่งหมวดใหญ่ → ย่อย
- **Bottom-up:** เริ่มจากเนื้อหาที่มี → จัดกลุ่มขึ้นไป (Card sorting เป็นเครื่องมือหนึ่ง)

## 2.4 Card Sorting ⭐

### ความหมาย
**Card Sorting** = เทคนิค UX research ที่ให้ผู้ใช้ **จัดกลุ่ม "การ์ด"** (แต่ละใบเขียนหัวข้อ/เนื้อหา) ตามที่ผู้ใช้เข้าใจ เพื่อค้นหา **mental model** ของผู้ใช้ แล้วนำไปออกแบบ IA, เมนู, การตั้งชื่อหมวดหมู่

### วัตถุประสงค์
- เข้าใจว่าผู้ใช้คาดหวังให้ข้อมูลอยู่ตรงไหน
- หาวิธีจัดกลุ่มและตั้งชื่อหมวดที่ผู้ใช้เข้าใจ
- ลดการออกแบบตามความคิดของทีม/องค์กร (inside-out thinking)

### ประเภทของ Card Sorting
| ประเภท | วิธีการ | ใช้เมื่อ | ข้อดี | ข้อเสีย |
|---|---|---|---|---|
| **Open Card Sort** | ผู้ใช้จัดกลุ่มเอง + **ตั้งชื่อกลุ่มเอง** | เริ่มออกแบบ IA ใหม่, ยังไม่มีหมวด | ได้ insight เรื่อง mental model และคำที่ผู้ใช้ใช้ | วิเคราะห์ยาก ใช้เวลานาน |
| **Closed Card Sort** | **กำหนดหมวดไว้แล้ว** ผู้ใช้นำการ์ดไปใส่ | ทดสอบ/ปรับ IA ที่มีอยู่, เพิ่มเนื้อหาใหม่ | วิเคราะห์ง่าย ได้ข้อมูลเชิงปริมาณ | ไม่ได้ไอเดียหมวดใหม่ |
| **Hybrid Card Sort** | มีหมวดให้ แต่ **สร้างหมวดใหม่ได้** | อยากได้ทั้งสองแบบ | ยืดหยุ่น | วิเคราะห์ซับซ้อนขึ้น |

**รูปแบบการดำเนินการ:**
- **Moderated** (มีผู้ดำเนินการ, ถาม "ทำไมจัดแบบนี้" ได้ — ได้ข้อมูลเชิงคุณภาพ) vs **Unmoderated** (ผู้ใช้ทำเอง — ได้กลุ่มตัวอย่างมาก)
- **In-person / Physical** (การ์ดกระดาษ, sticky note) vs **Remote / Online** (เครื่องมือออนไลน์)
- **Individual** vs **Group**

### ขั้นตอนการทำ Card Sorting
1. **กำหนดเป้าหมาย** — ต้องการรู้อะไร (เช่น จัดเมนูเว็บมหาวิทยาลัย)
2. **เตรียมการ์ด** — ทำ content inventory เลือกหัวข้อ ~**30–60 ใบ** (ไม่เกิน ~100) ใช้คำที่เข้าใจง่าย ไม่ใช้คำที่ชี้นำหมวด
3. **เลือกประเภท** — open / closed / hybrid
4. **สรรหาผู้เข้าร่วม** — ผู้ใช้จริง/ตัวแทนกลุ่มเป้าหมาย; NN/g แนะนำประมาณ **15–20 คน** สำหรับ open card sort (บางแหล่งว่า 15+; closed/quantitative อาจ 30+)
5. **ดำเนินการ** — อธิบายวิธี, ให้ผู้ใช้จัดกลุ่ม, (open) ตั้งชื่อกลุ่ม, ให้ think-aloud ถ้า moderated
6. **วิเคราะห์ผล** — หา pattern ที่ผู้ใช้ส่วนใหญ่จัดตรงกัน
7. **นำไปออกแบบ IA / Sitemap** แล้วตรวจสอบด้วย **Tree Testing**

### การวิเคราะห์ผล
- **Similarity Matrix** — ตารางแสดง % ที่การ์ด 2 ใบถูกจัดอยู่กลุ่มเดียวกัน
- **Dendrogram** — แผนภาพต้นไม้แสดงการจัดกลุ่ม (cluster analysis)
- **Standardization grid** (closed sort) — การ์ดแต่ละใบถูกใส่หมวดไหนกี่ %
- ชื่อกลุ่มที่ผู้ใช้ตั้งบ่อย → ใช้เป็น label

### เครื่องมือ
OptimalSort (Optimal Workshop), Maze, UXtweak, Miro/FigJam, การ์ดกระดาษ + sticky note

### Tree Testing (Reverse card sorting)
- ให้ผู้ใช้ **หาตำแหน่งของข้อมูล** ในโครงสร้างต้นไม้แบบข้อความล้วน (ไม่มี UI) เช่น "คุณจะไปดูตารางสอบที่ไหน?"
- ใช้ **ตรวจสอบ (validate)** IA หลัง card sorting
- Card sorting = *สร้าง* IA (generative) | Tree testing = *ประเมิน* IA (evaluative)

> [!tip] ข้อดี/ข้อจำกัด Card Sorting
> ✅ ถูก ง่าย เร็ว ยึดผู้ใช้เป็นศูนย์กลาง ได้ mental model จริง
> ⚠️ ไม่ได้บอกว่าผู้ใช้ใช้งานจริงอย่างไร (ไม่มีบริบทงาน), ผลขึ้นกับคุณภาพการ์ด, ผู้ใช้อาจจัดตามคำผิวเผิน (surface similarity)

## 2.5 Sitemap ⭐

### ความหมาย
**Sitemap** = แผนผังแสดง **โครงสร้างลำดับชั้นของหน้าทั้งหมด** ในเว็บไซต์/แอป และความสัมพันธ์ระหว่างหน้า เป็นผลลัพธ์ (deliverable) สำคัญของงาน IA

### ประเภทของ Sitemap
| ประเภท | ผู้ใช้หลัก | รายละเอียด |
|---|---|---|
| **Visual / UX Sitemap** | ทีมออกแบบ, stakeholder | แผนผังกล่อง-เส้น แสดงลำดับชั้นหน้า ใช้วางแผนการออกแบบ |
| **HTML Sitemap** | ผู้ใช้เว็บ | หน้าเว็บที่รวมลิงก์ทุกหน้า ช่วยนำทาง |
| **XML Sitemap** | Search engine (SEO) | ไฟล์ sitemap.xml ให้ Google crawl/index |

### รูปแบบโครงสร้าง (Sitemap structures)
1. **Hierarchical (ลำดับชั้น/ต้นไม้)** — แบบที่พบบ่อยที่สุด หน้าแรก → หมวดหลัก → หมวดย่อย
2. **Sequential / Linear (เรียงลำดับ)** — ทำทีละขั้น เช่น ขั้นตอนสมัคร, checkout, บทเรียนออนไลน์
3. **Matrix (เมทริกซ์)** — ผู้ใช้เลือกเส้นทางเองได้หลายทาง เชื่อมโยงข้ามกัน เช่น e-commerce filter, เว็บข่าว
4. **Database / Dynamic (ฐานข้อมูล)** — หน้าสร้างจากข้อมูลและ tag/metadata เช่น Amazon, Pinterest

### ความกว้าง vs ความลึก (Breadth vs Depth)
- **Broad & shallow (กว้างและตื้น):** เมนูหลักเยอะ ชั้นน้อย → คลิกน้อย แต่ตัวเลือกเยอะต่อหน้า
- **Narrow & deep (แคบและลึก):** เมนูน้อย ชั้นเยอะ → คลิกหลายครั้ง หลงทางง่าย
- โดยทั่วไป **กว้างและตื้นดีกว่า** (แนะนำไม่เกิน ~3 ชั้น — "3-click rule" เป็นแนวคิดที่นิยมแต่ไม่ใช่กฎตายตัว สิ่งสำคัญคือผู้ใช้รู้ว่ากำลังไปถูกทาง)

### ขั้นตอนการสร้าง Sitemap
1. ทำ **Content inventory / audit** (รวบรวมเนื้อหาทั้งหมด)
2. เข้าใจผู้ใช้และเป้าหมาย (persona, user tasks)
3. ทำ **Card sorting** เพื่อจัดกลุ่ม
4. กำหนดหมวดหลักและ label
5. วาดแผนผังลำดับชั้น (กำหนดหมายเลขหน้า เช่น 1.0, 1.1, 1.1.1)
6. **Tree testing** ตรวจสอบ → ปรับปรุง
7. ต่อยอดเป็น **User flow → Wireframe → Prototype**

### ตัวอย่าง Sitemap (เว็บร้านกาแฟออนไลน์)
```
Home (0.0)
├── เมนู (1.0)
│   ├── กาแฟร้อน (1.1)
│   ├── กาแฟเย็น (1.2)
│   └── เบเกอรี่ (1.3)
├── สั่งออนไลน์ (2.0)
│   ├── ตะกร้า (2.1)
│   └── ชำระเงิน (2.2) → ยืนยันคำสั่งซื้อ (2.3)
├── สาขา (3.0)
├── โปรโมชัน (4.0)
├── เกี่ยวกับเรา (5.0)
└── บัญชีของฉัน (6.0)
    ├── เข้าสู่ระบบ/สมัคร (6.1)
    └── ประวัติการสั่งซื้อ (6.2)
```

### Sitemap vs User Flow vs Wireframe
| | Sitemap | User Flow | Wireframe |
|---|---|---|---|
| แสดงอะไร | โครงสร้างหน้าทั้งหมด (what/where) | เส้นทางผู้ใช้ทำงานหนึ่ง (how) | เลย์เอาต์ในแต่ละหน้า |
| มุมมอง | ภาพรวมทั้งระบบ | ตามงาน/สถานการณ์ | ระดับหน้าจอ |

### เครื่องมือ
Figma/FigJam, Miro, Whimsical, Lucidchart, Octopus.do, Slickplan, draw.io

---

# 3. Evaluation & Nielsen's 10 Usability Heuristics

## 3.1 Usability Evaluation คืออะไร
การประเมินว่า UI **ใช้งานได้ดีแค่ไหน** เพื่อหาปัญหาและปรับปรุง

### องค์ประกอบของ Usability (Nielsen) — ช่วยจำ **LEMES**
1. **Learnability** — เรียนรู้ง่าย
2. **Efficiency** — ใช้งานได้รวดเร็วเมื่อเรียนรู้แล้ว
3. **Memorability** — กลับมาใช้แล้วจำได้
4. **Errors** — ผิดพลาดน้อย แก้ไขง่าย
5. **Satisfaction** — พึงพอใจ

> นิยาม ISO 9241-11: Usability = ระดับที่ผู้ใช้เฉพาะกลุ่มใช้ผลิตภัณฑ์เพื่อบรรลุเป้าหมายได้อย่าง **Effectiveness (ประสิทธิผล), Efficiency (ประสิทธิภาพ), Satisfaction (ความพึงพอใจ)** ในบริบทการใช้งานที่กำหนด

## 3.2 ประเภทของการประเมิน

### แบ่งตามช่วงเวลา
- **Formative evaluation** — ประเมินระหว่างพัฒนา เพื่อหาปัญหาและปรับปรุง (ทำบ่อย, เชิงคุณภาพ)
- **Summative evaluation** — ประเมินเมื่อเสร็จ เพื่อวัดผลรวม/เปรียบเทียบ/เทียบมาตรฐาน (เชิงปริมาณ)

### แบ่งตามผู้ประเมิน
| แบบ | วิธี | ข้อดี | ข้อเสีย |
|---|---|---|---|
| **Expert-based / Inspection (ไม่มีผู้ใช้)** | Heuristic Evaluation, Cognitive Walkthrough, Guideline review, Consistency inspection | เร็ว ถูก ทำได้ตั้งแต่ต้น | อาจไม่ตรงกับปัญหาจริงของผู้ใช้, false positive |
| **User-based (มีผู้ใช้)** | Usability Testing, Think-aloud, A/B testing, Survey/Questionnaire (SUS), Interview, Eye tracking, Analytics | เห็นปัญหาจริง | แพง ใช้เวลา |

### วิธีการสำคัญ
- **Heuristic Evaluation** — ผู้เชี่ยวชาญตรวจ UI ตามหลัก heuristics (ดูข้อ 3.4)
- **Cognitive Walkthrough** — ผู้เชี่ยวชาญ "เดิน" ผ่านงานทีละขั้นในมุมมองผู้ใช้ใหม่ ถาม 4 คำถาม: ผู้ใช้จะพยายามทำสิ่งนั้นไหม? / จะเห็นปุ่ม/การกระทำที่ถูกต้องไหม? / จะเข้าใจว่าการกระทำนั้นนำไปสู่เป้าหมายไหม? / เห็น feedback แล้วรู้ไหมว่าก้าวหน้า? → เน้น **learnability**
- **Usability Testing** — ให้ผู้ใช้จริงทำ task ที่กำหนด สังเกตปัญหา; Nielsen: **5 คนพบปัญหาราว 85%** (สำหรับ qualitative testing)
- **Think-Aloud Protocol** — ผู้ใช้พูดความคิดออกมาขณะใช้งาน
- **SUS (System Usability Scale)** — แบบสอบถาม 10 ข้อ Likert 5 ระดับ, คะแนน 0–100, **ค่าเฉลี่ย ≈ 68** (สูงกว่า 68 = ดีกว่าค่าเฉลี่ย)
- **A/B Testing** — ดูหัวข้อ 4
- **Analytics / Eye tracking / Heatmap** — ดูพฤติกรรมเชิงปริมาณ

### ตัวชี้วัด (Usability Metrics)
- Task success rate (อัตราทำงานสำเร็จ)
- Time on task (เวลาที่ใช้)
- Error rate (จำนวนข้อผิดพลาด)
- Satisfaction (SUS, SEQ, NPS)

## 3.3 Nielsen's 10 Usability Heuristics ⭐⭐

> **Jakob Nielsen** (Nielsen Norman Group) พัฒนาร่วมกับ **Rolf Molich** ปี 1990 และปรับปรุงปี 1994 (ถ้อยคำปรับเล็กน้อยปี 2020) — เรียกว่า "heuristics" เพราะเป็น **กฎกว้างๆ (rules of thumb)** ไม่ใช่แนวทางเฉพาะเจาะจง

> [!tip] ช่วยจำ: **"Vi-Ma-Us-Co-Er-Re-Fl-Ae-He-He"**
> Visibility → Match → User control → Consistency → Error prevention → Recognition → Flexibility → Aesthetic → Help recover → Help docs

### H1. Visibility of System Status (แสดงสถานะของระบบ)
- ระบบควรแจ้งให้ผู้ใช้รู้ว่า **กำลังเกิดอะไรขึ้น** ด้วย feedback ที่เหมาะสม **ภายในเวลาที่สมควร**
- ✅ Progress bar, loading spinner, "กำลังพิมพ์...", แสดงหน้าปัจจุบันในเมนู (active state), สถานะพัสดุ, แบตเตอรี่
- ❌ กด submit แล้วหน้าจอนิ่ง ไม่รู้ว่าระบบทำงานอยู่ไหม
- ≈ Shneiderman Rule 3 (Feedback)

### H2. Match Between System and the Real World (ตรงกับโลกจริง)
- ใช้ **ภาษา คำ แนวคิดที่ผู้ใช้คุ้นเคย** ไม่ใช้ศัพท์เทคนิค ข้อมูลเรียงลำดับเป็นธรรมชาติและสมเหตุสมผล
- ✅ ไอคอนถังขยะ = ลบ, รถเข็น = ตะกร้าสินค้า, ปฏิทินเรียงแบบปฏิทินจริง, หน่วยเงินบาท
- ❌ Error "Exception 0x0004F: NullPointer" แสดงให้ผู้ใช้ทั่วไป
- ใช้ **metaphor / skeuomorphism** ได้

### H3. User Control and Freedom (ผู้ใช้ควบคุมได้และมีอิสระ)
- ผู้ใช้มักทำผิดโดยไม่ตั้งใจ ต้องมี **"ทางออกฉุกเฉิน" (emergency exit)** ที่ชัดเจน ออกจากสถานะที่ไม่ต้องการได้โดยไม่ต้องผ่านหลายขั้น — รองรับ **Undo และ Redo**
- ✅ ปุ่ม Cancel, Back, ปิด (X), Undo send, แก้ไข/ลบข้อความที่ส่ง
- ❌ Popup ที่ไม่มีปุ่มปิด, wizard ที่ย้อนกลับไม่ได้
- ≈ Shneiderman Rule 6 + 7

### H4. Consistency and Standards (ความสม่ำเสมอและมาตรฐาน)
- ผู้ใช้ไม่ควรต้องสงสัยว่าคำ/สถานการณ์/การกระทำต่างกันหมายถึงสิ่งเดียวกันหรือไม่ — ทำตาม **convention ของแพลตฟอร์มและอุตสาหกรรม**
- **Jakob's Law:** ผู้ใช้ใช้เวลาส่วนใหญ่บนเว็บอื่น จึงคาดหวังให้เว็บคุณทำงานเหมือนที่เคยใช้
- Internal consistency + External consistency
- ✅ โลโก้มุมซ้ายบนคลิกแล้วกลับหน้าแรก, ลิงก์สีน้ำเงินขีดเส้นใต้, ตะกร้ามุมขวาบน
- ❌ ไอคอนรูปบ้านที่ไม่ได้พาไปหน้าแรก
- ≈ Shneiderman Rule 1

### H5. Error Prevention (ป้องกันความผิดพลาด)
- ดีกว่าข้อความ error ที่ดี คือ **ออกแบบไม่ให้เกิด error ตั้งแต่แรก**
- แยก error 2 แบบ: **Slips** (ตั้งใจถูกแต่ทำพลาด เช่น กดผิดปุ่ม — แก้ด้วย constraints, defaults ที่ดี) และ **Mistakes** (เข้าใจผิดตั้งแต่ต้น — แก้ด้วยการสื่อสารให้ชัด)
- ✅ Confirmation dialog ก่อนลบ, date picker, disable ปุ่มที่ใช้ไม่ได้, suggestion ในช่องค้นหา, เตือนลืมแนบไฟล์
- ❌ ปุ่ม "ลบทั้งหมด" อยู่ติดกับปุ่ม "บันทึก" และไม่มีการยืนยัน
- ≈ Shneiderman Rule 5

### H6. Recognition Rather Than Recall (จดจำได้ดีกว่าต้องนึก)
- ลดภาระความจำ ให้ **วัตถุ การกระทำ ตัวเลือกมองเห็นได้** ผู้ใช้ไม่ควรต้องจำข้อมูลจากส่วนหนึ่งไปอีกส่วน
- **Recognition** (เห็นแล้วจำได้) ง่ายกว่า **Recall** (ต้องนึกเอง)
- ✅ เมนูแบบมองเห็น (แทน command line), ประวัติการค้นหา, "ดูล่าสุด", autocomplete, label บนไอคอน
- ❌ ให้จำรหัสสินค้าจากหน้าหนึ่งไปพิมพ์อีกหน้า, ไอคอนไม่มี label ที่ความหมายกำกวม
- ≈ Shneiderman Rule 8

### H7. Flexibility and Efficiency of Use (ยืดหยุ่นและมีประสิทธิภาพ)
- มี **accelerators** (ซ่อนจากมือใหม่) ที่ช่วยผู้ใช้ชำนาญทำงานเร็วขึ้น — ระบบรองรับทั้งมือใหม่และผู้เชี่ยวชาญ ให้ **ปรับแต่ง (customize/personalize)** ได้
- ✅ Keyboard shortcuts, gestures (swipe), templates, favorites, "ซื้อซ้ำ", ตั้งค่าเมนูลัด
- ❌ ต้องทำ 10 ขั้นตอนเดิมทุกครั้งโดยไม่มีทางลัด
- ≈ Shneiderman Rule 2

### H8. Aesthetic and Minimalist Design (สวยงามและเรียบง่าย)
- UI ไม่ควรมีข้อมูลที่ **ไม่เกี่ยวข้องหรือไม่จำเป็น** เพราะทุกหน่วยข้อมูลเพิ่มเติมจะแย่งความสนใจจากข้อมูลสำคัญ
- ไม่ได้แปลว่าต้องเรียบแบบ flat design แต่ต้อง **focus ที่สิ่งสำคัญ** มี visual hierarchy ชัด
- ✅ Google search หน้าแรก, ใช้ whitespace, แสดงข้อมูลสำคัญก่อน (progressive disclosure)
- ❌ หน้าเว็บเต็มไปด้วยโฆษณา แบนเนอร์ กระพริบ ข้อความยาวเหยียด

### H9. Help Users Recognize, Diagnose, and Recover from Errors (ช่วยผู้ใช้รับรู้ วินิจฉัย และแก้ไขข้อผิดพลาด)
- ข้อความ error ควร: **ใช้ภาษาธรรมดา (ไม่มี code)**, **บอกปัญหาอย่างชัดเจน**, **เสนอวิธีแก้ไขเชิงสร้างสรรค์** — และแสดงให้เห็นเด่นชัด (สีแดง, ไอคอน)
- ✅ "รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข 1 ตัว", หน้า 404 ที่มีช่องค้นหาและลิงก์กลับหน้าแรก, "คุณหมายถึง...?"
- ❌ "Error 500", "Invalid input", "เกิดข้อผิดพลาด" โดยไม่บอกสาเหตุ

### H10. Help and Documentation (ความช่วยเหลือและคู่มือ)
- ดีที่สุดคือระบบใช้ได้โดยไม่ต้องอธิบาย แต่บางครั้งจำเป็น — เอกสารควร **ค้นหาง่าย, เน้นงานของผู้ใช้, บอกขั้นตอนที่เป็นรูปธรรม, สั้นกระชับ**
- ✅ FAQ, tooltip, onboarding tutorial, contextual help (ไอคอน ⓘ ข้างช่องกรอก), chatbot, help center มีช่องค้นหา
- ❌ คู่มือ PDF 200 หน้าไม่มีสารบัญ

## 3.4 ตารางสรุป Nielsen 10 Heuristics

| # | Heuristic | คำสำคัญ | ตัวอย่างดี | ตัวอย่างละเมิด |
|---|---|---|---|---|
| 1 | Visibility of system status | Feedback, สถานะ | Progress bar | กดแล้วเงียบ |
| 2 | Match system & real world | ภาษาผู้ใช้, metaphor | ไอคอนถังขยะ | ศัพท์เทคนิค |
| 3 | User control & freedom | Undo, Cancel, Exit | Undo send | Popup ปิดไม่ได้ |
| 4 | Consistency & standards | มาตรฐาน, Jakob's Law | โลโก้กลับหน้าแรก | ปุ่มเดียวกันคนละชื่อ |
| 5 | Error prevention | Constraints, confirm | Date picker | ลบไม่มียืนยัน |
| 6 | Recognition rather than recall | มองเห็นได้ | Recent searches | ต้องจำรหัส |
| 7 | Flexibility & efficiency | Shortcuts, customize | Hotkeys | ไม่มีทางลัด |
| 8 | Aesthetic & minimalist | ไม่รก, focus | Google หน้าแรก | โฆษณาเต็มจอ |
| 9 | Help recover from errors | Error message ดี | บอกวิธีแก้ | "Error 500" |
| 10 | Help & documentation | คู่มือ, FAQ | Tooltip, FAQ | ไม่มีความช่วยเหลือ |

## 3.5 วิธีทำ Heuristic Evaluation ⭐

### ขั้นตอน
1. **Planning** — กำหนดขอบเขต (หน้าจอ/task ที่จะประเมิน), เลือก heuristics, เตรียม user persona/task scenario
2. **เลือกผู้ประเมิน** — **3–5 คน** (Nielsen: ผู้ประเมิน 1 คนพบปัญหาเฉลี่ยราว 35%; 5 คนพบราว **75%**; มากกว่านี้ได้ผลเพิ่มไม่คุ้มค่า)
3. **Briefing** — อธิบายระบบ ผู้ใช้ เป้าหมายให้ผู้ประเมิน
4. **Evaluation (ประเมินแยกกันอิสระ)** — แต่ละคนใช้งานอย่างน้อย **2 รอบ**: รอบแรกดูภาพรวม flow, รอบสองดูรายละเอียดแต่ละ element แล้วจดปัญหา + heuristic ที่ละเมิด
5. **Debriefing / รวมผล** — รวมผลจากทุกคน ลบปัญหาซ้ำ
6. **Severity rating** — ให้คะแนนความรุนแรง
7. **Report** — เขียนรายงานพร้อมข้อเสนอแนะ

> [!warning] ทำไมต้องประเมินแยกกัน?
> เพื่อไม่ให้ความคิดเห็นของกันและกันมีอิทธิพล (bias) แล้วค่อยรวมผลภายหลัง

### Severity Rating Scale (Nielsen) 0–4
| คะแนน | ระดับ | ความหมาย |
|---|---|---|
| **0** | Not a problem | ไม่ใช่ปัญหา usability |
| **1** | Cosmetic | ปัญหาด้านความสวยงาม แก้เมื่อมีเวลา |
| **2** | Minor | ปัญหาเล็ก ความสำคัญต่ำ |
| **3** | Major | ปัญหาใหญ่ ควรแก้ ความสำคัญสูง |
| **4** | Catastrophe | ร้ายแรง **ต้องแก้ก่อนปล่อยผลิตภัณฑ์** |

**ปัจจัยที่ใช้พิจารณาความรุนแรง:** Frequency (เกิดบ่อยไหม), Impact (แก้ยากไหม), Persistence (เกิดครั้งเดียวหรือซ้ำๆ)

### Template รายงาน Heuristic Evaluation
| # | ตำแหน่ง/หน้าจอ | ปัญหาที่พบ | Heuristic ที่ละเมิด | Severity | ข้อเสนอแนะ |
|---|---|---|---|---|---|
| 1 | หน้าชำระเงิน | กด "ชำระเงิน" แล้วไม่มี loading ผู้ใช้กดซ้ำ | H1 Visibility of system status | 3 | แสดง spinner + disable ปุ่มหลังกด |
| 2 | ฟอร์มสมัคร | Error "Invalid input" ไม่บอกช่องไหนผิด | H9 Help recover from errors | 3 | ไฮไลต์ช่องที่ผิด + บอกรูปแบบที่ถูก |
| 3 | หน้าตั้งค่า | ปุ่มลบบัญชีไม่มีการยืนยัน | H5 Error prevention | 4 | เพิ่ม confirmation dialog + พิมพ์ยืนยัน |
| 4 | เมนู | ไอคอนไม่มี label | H6 Recognition rather than recall | 2 | เพิ่ม text label ใต้ไอคอน |

### ข้อดี/ข้อเสีย Heuristic Evaluation
- ✅ ถูก เร็ว ไม่ต้องหาผู้ใช้ ทำได้ตั้งแต่ wireframe/prototype ใช้ได้ทุกช่วงของการออกแบบ
- ⚠️ ขึ้นกับความเชี่ยวชาญผู้ประเมิน, อาจพบปัญหาที่ไม่ใช่ปัญหาจริง (false positives), พลาดปัญหาที่เกิดเฉพาะกับผู้ใช้จริง → **ควรใช้ร่วมกับ usability testing**

---

# 4. A/B Testing

## 4.1 ความหมาย
**A/B Testing (Split testing)** = การทดลองแบบควบคุม (controlled experiment) โดย **แบ่งผู้ใช้แบบสุ่ม** ออกเป็น 2 กลุ่ม:
- **กลุ่ม A (Control)** — เห็นเวอร์ชันเดิม
- **กลุ่ม B (Variant / Treatment)** — เห็นเวอร์ชันที่เปลี่ยน
แล้ว **วัดผลด้วยตัวชี้วัด (metric)** ว่าเวอร์ชันไหนดีกว่าอย่าง **มีนัยสำคัญทางสถิติ**

- เป็นวิธี **เชิงปริมาณ (quantitative)**, ผู้ใช้จริงในสภาพแวดล้อมจริง (live)
- ตอบคำถาม **"อะไร"** (what works) แต่ไม่ตอบ **"ทำไม"** (why) → ต้องใช้คู่กับ qualitative research
- เป็นส่วนหนึ่งของ **Data-driven design / CRO (Conversion Rate Optimization)**

## 4.2 ขั้นตอนการทำ A/B Testing
1. **ระบุปัญหา / เก็บข้อมูลเดิม** — ใช้ analytics, heatmap, usability test หาจุดที่มีปัญหา (เช่น อัตราออกจากหน้าตะกร้าสูง)
2. **ตั้งเป้าหมายและ metric** — เช่น Conversion rate, Click-through rate (CTR), Bounce rate, Sign-up rate, Revenue per user
3. **ตั้งสมมติฐาน (Hypothesis)** — รูปแบบ: *"ถ้าเราเปลี่ยน [X] แล้ว [metric Y] จะ [เพิ่ม/ลด] เพราะ [เหตุผล]"*
   - H₀ (Null hypothesis): ไม่มีความแตกต่าง
   - H₁ (Alternative): มีความแตกต่าง
4. **สร้าง Variant** — เปลี่ยน **ตัวแปรทีละ 1 อย่าง** เพื่อรู้ว่าผลเกิดจากอะไร
5. **คำนวณขนาดกลุ่มตัวอย่าง (Sample size)** และระยะเวลา — ขึ้นกับ baseline conversion, MDE (Minimum Detectable Effect), significance level, power (มัก 80%)
6. **สุ่มแบ่งผู้ใช้ (Randomization)** — โดยทั่วไป 50/50 ผู้ใช้คนเดิมต้องเห็นเวอร์ชันเดิมตลอด
7. **รันการทดสอบ** — พร้อมกันทั้ง 2 เวอร์ชัน อย่างน้อย **1–2 สัปดาห์ (ครอบคลุมรอบสัปดาห์)** จนได้ sample size ที่กำหนด
8. **วิเคราะห์ผล** — ตรวจ **statistical significance** (นิยม confidence level **95%**, p-value < **0.05**)
9. **สรุปและนำไปใช้** — ถ้า B ชนะ → implement; ถ้าไม่ต่าง → เรียนรู้และตั้งสมมติฐานใหม่ (iterate)

## 4.3 แนวคิดทางสถิติที่ควรรู้
| คำ | ความหมาย |
|---|---|
| **Statistical significance** | ความแตกต่างที่พบไม่น่าจะเกิดจากความบังเอิญ |
| **p-value** | ความน่าจะเป็นที่จะเห็นผลต่างขนาดนี้ ถ้าจริงๆ แล้วไม่มีความแตกต่าง (p < 0.05 = มีนัยสำคัญ) |
| **Confidence level** | ระดับความเชื่อมั่น เช่น 95% |
| **Sample size** | จำนวนผู้ใช้ที่ต้องการ — น้อยไปผลไม่น่าเชื่อถือ |
| **Conversion rate** | (จำนวนที่ทำ action เป้าหมาย ÷ จำนวนผู้เข้าชม) × 100 |
| **Type I error (False positive)** | สรุปว่าต่าง ทั้งที่ไม่ต่าง |
| **Type II error (False negative)** | สรุปว่าไม่ต่าง ทั้งที่ต่าง |

> [!example] ตัวอย่างการคำนวณ
> - A: ผู้เข้าชม 10,000 คน สมัคร 300 คน → CR = **3.0%**
> - B: ผู้เข้าชม 10,000 คน สมัคร 360 คน → CR = **3.6%**
> - Uplift = (3.6 − 3.0) / 3.0 × 100 = **+20%**
> - ต้องตรวจว่า p < 0.05 จึงสรุปว่า B ดีกว่าจริง

## 4.4 สิ่งที่นิยมทดสอบ
- ข้อความ/สี/ขนาด/ตำแหน่งของปุ่ม **CTA (Call to Action)**
- Headline, copywriting
- รูปภาพ, วิดีโอ
- เลย์เอาต์หน้า, ลำดับเนื้อหา
- ความยาวฟอร์ม, จำนวนช่องกรอก
- ราคา/การแสดงราคา, โปรโมชัน
- Subject line อีเมล
- Navigation, onboarding flow

## 4.5 รูปแบบการทดสอบที่เกี่ยวข้อง
| แบบ | คำอธิบาย |
|---|---|
| **A/B Test** | เทียบ 2 เวอร์ชัน เปลี่ยน 1 ตัวแปร |
| **A/B/n Test** | เทียบมากกว่า 2 เวอร์ชัน (A, B, C, ...) ต้องใช้ traffic มากขึ้น |
| **Multivariate Test (MVT)** | เปลี่ยนหลายตัวแปรพร้อมกัน ทดสอบทุก combination (เช่น 2 headline × 2 รูป = 4 เวอร์ชัน) เพื่อดู interaction — ต้องใช้ traffic มาก |
| **Split URL Test** | แต่ละเวอร์ชันอยู่คนละ URL เหมาะกับการเปลี่ยนแปลงใหญ่ (redesign ทั้งหน้า) |
| **A/A Test** | ทดสอบเวอร์ชันเดียวกันสองกลุ่ม เพื่อเช็กว่าระบบทดสอบทำงานถูกต้อง |
| **Multi-armed bandit** | ปรับสัดส่วน traffic ไปยังเวอร์ชันที่ดีกว่าโดยอัตโนมัติระหว่างทดสอบ |

## 4.6 ข้อดี / ข้อจำกัด
**ข้อดี ✅**
- ตัดสินใจจาก **ข้อมูลจริง** ไม่ใช่ความเห็น (ลด HiPPO — Highest Paid Person's Opinion)
- วัดผลกระทบเชิงธุรกิจได้ชัดเจน
- ความเสี่ยงต่ำ (ทดสอบกับผู้ใช้บางส่วนก่อน)
- พิสูจน์ความสัมพันธ์เชิงเหตุผล (causation) ได้เพราะมีการสุ่ม

**ข้อจำกัด ⚠️**
- ต้องมี **traffic มากพอ** (ไม่เหมาะกับเว็บที่ผู้ใช้น้อย)
- บอกได้ว่า "อะไร" แต่ไม่บอก "ทำไม"
- ใช้เวลา, ทดสอบได้ทีละไม่กี่อย่าง
- ไม่เหมาะกับการเปลี่ยนแปลงใหญ่หรือนวัตกรรมใหม่ทั้งหมด
- อาจได้ **local maximum** (ปรับเล็กๆ จนดีที่สุดในกรอบเดิม แต่พลาดแนวทางที่ดีกว่ามาก)
- ผลระยะสั้นอาจไม่สะท้อนระยะยาว (**novelty effect** — ผู้ใช้ตื่นเต้นกับของใหม่ชั่วคราว)

## 4.7 ข้อผิดพลาดที่พบบ่อย
- หยุดการทดสอบเร็วเกินไปเมื่อเห็นผลดีช่วงแรก (**peeking**)
- เปลี่ยนหลายตัวแปรพร้อมกันใน A/B test → ไม่รู้ว่าอะไรทำให้ต่าง
- กลุ่มตัวอย่างน้อยเกินไป
- ไม่มีสมมติฐานที่ชัดเจน
- รันไม่ครบรอบสัปดาห์ (พฤติกรรมวันธรรมดา vs เสาร์อาทิตย์ต่างกัน)
- ไม่คำนึงถึงปัจจัยภายนอก (เทศกาล, โปรโมชัน)

## 4.8 ตัวอย่างจริงที่มีชื่อเสียง
- **Google "41 shades of blue"** — ทดสอบสีลิงก์ 41 เฉด เพื่อหาสีที่คนคลิกมากที่สุด
- **Obama 2008 campaign** — ทดสอบปุ่ม ("Learn More" vs "Sign Up") และรูปภาพหน้า landing page เพิ่มอัตราสมัครอย่างมีนัยสำคัญ
- **Netflix** — ทดสอบภาพ thumbnail/artwork ของหนัง
- **Amazon, Booking.com** — รัน A/B tests จำนวนมหาศาลอย่างต่อเนื่อง

## 4.9 เครื่องมือ
Optimizely, VWO, AB Tasty, Adobe Target, Firebase A/B Testing, Statsig, LaunchDarkly, PostHog (หมายเหตุ: Google Optimize ปิดบริการไปแล้วในปี 2023)

## 4.10 A/B Testing vs Usability Testing
| | A/B Testing | Usability Testing |
|---|---|---|
| ข้อมูล | Quantitative | Qualitative (ส่วนใหญ่) |
| ผู้ใช้ | หลายพัน–หลายแสน | 5–10 คน |
| ตอบคำถาม | อะไรดีกว่า (What) | ทำไมมีปัญหา (Why) |
| ช่วงเวลา | หลัง launch (live) | ทุกช่วง รวมถึง prototype |

---

# 5. Universal Design (UD)

## 5.1 ความหมาย
**Universal Design (การออกแบบเพื่อทุกคน / อารยสถาปัตย์)** = *"การออกแบบผลิตภัณฑ์และสภาพแวดล้อมให้ **ทุกคนใช้งานได้มากที่สุดเท่าที่เป็นไปได้** โดย **ไม่ต้องปรับเปลี่ยนหรือออกแบบเฉพาะ** (without the need for adaptation or specialized design)"*

- บัญญัติคำโดย **Ronald (Ron) Mace** สถาปนิกผู้ใช้วีลแชร์ — **The Center for Universal Design, North Carolina State University (NC State)**
- **7 Principles of Universal Design** พัฒนาโดยกลุ่มสถาปนิก นักออกแบบผลิตภัณฑ์ วิศวกร และนักวิจัย ปี **1997**
- แนวคิด: ออกแบบเพื่อ **ความหลากหลายของมนุษย์** (อายุ, ความสามารถ, ขนาดร่างกาย, ภาษา, สถานการณ์) ไม่ใช่ออกแบบเพื่อ "คนทั่วไป" แล้วค่อยเสริมสำหรับคนพิการ
- **Curb-cut effect** — ทางลาดขอบทางเท้าที่ทำเพื่อผู้ใช้วีลแชร์ กลับเป็นประโยชน์กับทุกคน (รถเข็นเด็ก, กระเป๋าลาก, จักรยาน) ← ตัวอย่างคลาสสิกของ UD

> [!note] ความพิการ 3 แบบ (Microsoft Inclusive Design)
> - **Permanent** (ถาวร) — แขนข้างเดียว
> - **Temporary** (ชั่วคราว) — แขนหัก
> - **Situational** (ตามสถานการณ์) — อุ้มลูกอยู่ ใช้มือเดียว
> → ออกแบบเพื่อคนกลุ่มหนึ่ง ช่วยคนอีกมาก ("Solve for one, extend to many")

## 5.2 หลักการ 7 ข้อของ Universal Design ⭐⭐

> [!tip] ช่วยจำ: **"E-F-S-P-T-L-S"** → *"Every Friend Should Play Tennis Like Serena"*
> **E**quitable → **F**lexibility → **S**imple → **P**erceptible → **T**olerance → **L**ow effort → **S**ize & space

### Principle 1: Equitable Use (ใช้ได้อย่างเท่าเทียม)
- **นิยาม:** การออกแบบเป็นประโยชน์และวางขายได้สำหรับผู้มีความสามารถหลากหลาย
- **แนวทาง:** ใช้วิธีเดียวกันสำหรับทุกคน (เหมือนกันถ้าทำได้ หรือเทียบเท่า), ไม่แบ่งแยกหรือตีตราผู้ใช้กลุ่มใด, ความเป็นส่วนตัวและความปลอดภัยเท่าเทียม, ดึงดูดใจทุกคน
- **ตัวอย่างกายภาพ:** ประตูอัตโนมัติ, ทางลาดที่เป็นทางเข้าหลัก (ไม่ใช่ทางเข้าหลังตึก)
- **ตัวอย่างดิจิทัล:** เว็บไซต์ที่ใช้ได้กับ screen reader โดยไม่ต้องมี "เวอร์ชันสำหรับคนพิการ" แยก, ตัวเลือกเข้าสู่ระบบด้วยใบหน้า/ลายนิ้วมือ/รหัสผ่าน

### Principle 2: Flexibility in Use (ยืดหยุ่นในการใช้งาน)
- **นิยาม:** รองรับความชอบและความสามารถที่หลากหลาย
- **แนวทาง:** มีทางเลือกในวิธีใช้งาน, รองรับทั้งมือซ้ายและมือขวา, ช่วยความแม่นยำ, ปรับตามจังหวะความเร็วของผู้ใช้
- **ตัวอย่างกายภาพ:** กรรไกรใช้ได้ทั้งมือซ้ายมือขวา, ATM ที่มีทั้งปุ่มกดและหน้าจอสัมผัส
- **ตัวอย่างดิจิทัล:** ปรับขนาดตัวอักษร, ใช้ได้ทั้งเมาส์/คีย์บอร์ด/สัมผัส/เสียง, วิดีโอปรับความเร็วได้, Dark mode, responsive design

### Principle 3: Simple and Intuitive Use (ง่ายและเข้าใจได้ทันที)
- **นิยาม:** เข้าใจง่ายโดยไม่ขึ้นกับประสบการณ์ ความรู้ ทักษะทางภาษา หรือระดับสมาธิของผู้ใช้
- **แนวทาง:** ตัดความซับซ้อนที่ไม่จำเป็น, สอดคล้องกับความคาดหวังของผู้ใช้, รองรับระดับการอ่านออกเขียนได้และภาษาที่หลากหลาย, จัดข้อมูลตามความสำคัญ, มี prompt และ feedback ระหว่างและหลังทำงาน
- **ตัวอย่างกายภาพ:** คู่มือประกอบเฟอร์นิเจอร์แบบรูปภาพ (IKEA)
- **ตัวอย่างดิจิทัล:** ไอคอนสากล, onboarding ง่าย, ภาษาเรียบง่าย (plain language), step indicator

### Principle 4: Perceptible Information (รับรู้ข้อมูลได้)
- **นิยาม:** สื่อสารข้อมูลที่จำเป็นได้อย่างมีประสิทธิภาพ **ไม่ว่าสภาพแวดล้อมหรือความสามารถทางประสาทสัมผัสของผู้ใช้เป็นอย่างไร**
- **แนวทาง:** ใช้หลายรูปแบบ (ภาพ, เสียง, สัมผัส) นำเสนอข้อมูลซ้ำ, **contrast สูง** ระหว่างข้อมูลกับพื้นหลัง, ทำให้ข้อมูลสำคัญอ่านง่ายที่สุด, เข้ากันได้กับอุปกรณ์ช่วยเหลือ (assistive tech)
- **ตัวอย่างกายภาพ:** ลิฟต์ที่มีเสียงประกาศ + ตัวเลข + อักษรเบรลล์, สัญญาณไฟจราจรมีเสียง
- **ตัวอย่างดิจิทัล:** **Alt text** สำหรับรูปภาพ, **คำบรรยายใต้ภาพ (captions/subtitles)**, ไม่ใช้สีอย่างเดียวสื่อความหมาย (เช่น error มีทั้งสีแดง + ไอคอน + ข้อความ), contrast ratio ตาม WCAG (≥ 4.5:1 สำหรับข้อความปกติ), การสั่นแจ้งเตือน

### Principle 5: Tolerance for Error (ทนต่อความผิดพลาด)
- **นิยาม:** ลดอันตรายและผลเสียจากการกระทำโดยบังเอิญหรือไม่ตั้งใจ
- **แนวทาง:** จัดวาง element ให้ส่วนที่ใช้บ่อยเข้าถึงง่าย ส่วนอันตรายถูกแยก/ซ่อน/ป้องกัน, มีคำเตือนอันตรายและข้อผิดพลาด, มีระบบ fail-safe, ป้องกันการกระทำโดยไม่ตั้งใจในงานที่ต้องระมัดระวัง
- **ตัวอย่างกายภาพ:** เตารีดที่ตัดไฟอัตโนมัติ, ประตูลิฟต์เปิดเมื่อมีสิ่งกีดขวาง
- **ตัวอย่างดิจิทัล:** Undo, confirmation dialog, auto-save, ถังขยะ, เตือนก่อนออกโดยไม่บันทึก
- ≈ Nielsen H5 + Shneiderman Rule 5, 6

### Principle 6: Low Physical Effort (ใช้แรงน้อย)
- **นิยาม:** ใช้ได้อย่างมีประสิทธิภาพ สะดวกสบาย และเหนื่อยน้อยที่สุด
- **แนวทาง:** ให้ผู้ใช้อยู่ในท่าทางที่เป็นธรรมชาติ, ใช้แรงในการทำงานที่สมเหตุสมผล, ลดการกระทำซ้ำๆ, ลดการออกแรงต่อเนื่อง
- **ตัวอย่างกายภาพ:** มือจับประตูแบบก้าน (lever) แทนลูกบิด, ก๊อกน้ำเซนเซอร์
- **ตัวอย่างดิจิทัล:** Autofill, ลดจำนวนคลิก, สั่งงานด้วยเสียง, ปุ่มขนาดใหญ่พอ, ไม่ต้องใช้ gesture ซับซ้อน (เช่น pinch หลายนิ้ว) โดยไม่มีทางเลือกอื่น, one-click checkout

### Principle 7: Size and Space for Approach and Use (ขนาดและพื้นที่เหมาะสมในการเข้าถึงและใช้งาน)
- **นิยาม:** มีขนาดและพื้นที่เหมาะสมสำหรับการเข้าถึง เอื้อมถึง จัดการ และใช้งาน ไม่ว่าผู้ใช้มีขนาดร่างกาย ท่าทาง หรือการเคลื่อนไหวแบบใด
- **แนวทาง:** มองเห็นองค์ประกอบสำคัญชัดเจนทั้งขณะนั่งหรือยืน, เอื้อมถึงได้สะดวก, รองรับขนาดมือหลากหลาย, มีพื้นที่เพียงพอสำหรับอุปกรณ์ช่วยเหลือหรือผู้ช่วย
- **ตัวอย่างกายภาพ:** ห้องน้ำคนพิการกว้างพอให้วีลแชร์หมุนได้, ประตูกว้าง, ช่องเก็บเงินระดับต่ำ
- **ตัวอย่างดิจิทัล:** **Touch target ขนาดใหญ่พอ** (Apple แนะนำ ≥ **44×44 pt**, Material Design ≥ **48×48 dp**), ระยะห่างระหว่างปุ่มพอเหมาะ, วางปุ่มสำคัญในโซนที่นิ้วโป้งเอื้อมถึง (thumb zone), รองรับการหมุนจอ

## 5.3 ตารางสรุป 7 Principles

| # | Principle | สรุป | ตัวอย่างดิจิทัล |
|---|---|---|---|
| 1 | Equitable Use | ทุกคนใช้ได้เท่าเทียม ไม่แบ่งแยก | เว็บเดียวรองรับ screen reader |
| 2 | Flexibility in Use | มีหลายทางเลือก | ปรับฟอนต์, dark mode, voice |
| 3 | Simple and Intuitive | เข้าใจง่าย | Plain language, ไอคอนสากล |
| 4 | Perceptible Information | รับรู้ได้ทุกประสาทสัมผัส | Alt text, captions, contrast |
| 5 | Tolerance for Error | ผิดพลาดแล้วไม่เสียหาย | Undo, auto-save |
| 6 | Low Physical Effort | ใช้แรงน้อย | Autofill, ลดคลิก |
| 7 | Size and Space | ขนาด/พื้นที่พอเหมาะ | Touch target ≥ 44px |

## 5.4 UD vs Accessibility vs Inclusive Design
| | Universal Design | Accessibility | Inclusive Design |
|---|---|---|---|
| เป้าหมาย | **ผลลัพธ์**: ออกแบบหนึ่งเดียวให้ทุกคนใช้ได้ | **ผลลัพธ์**: คนพิการเข้าถึงได้ (มักตามมาตรฐาน/กฎหมาย) | **กระบวนการ**: รวมคนหลากหลายเข้ามามีส่วนร่วมในการออกแบบ |
| แนวคิด | One design fits all | Remove barriers สำหรับคนพิการ | One size fits one — solve for one, extend to many |
| ต้นกำเนิด | สถาปัตยกรรม (Ron Mace, 1980s–1997) | กฎหมาย/มาตรฐาน (ADA, Section 508, WCAG) | ดิจิทัล/การออกแบบ (Microsoft Inclusive Design, Inclusive Design Research Centre) |
| ตัวอย่าง | ทางลาด, ประตูอัตโนมัติ | เว็บผ่าน WCAG AA | Xbox Adaptive Controller |

## 5.5 เชื่อมโยงกับ Web Accessibility (WCAG)
**WCAG (Web Content Accessibility Guidelines)** โดย **W3C** — หลัก 4 ข้อ **POUR**:
1. **Perceivable** (รับรู้ได้) — alt text, captions, contrast
2. **Operable** (ใช้งานได้) — ใช้ด้วยคีย์บอร์ดได้, มีเวลาพอ, ไม่กระตุ้นอาการชัก (ไม่กระพริบเกิน 3 ครั้ง/วินาที)
3. **Understandable** (เข้าใจได้) — อ่านง่าย, คาดเดาได้, ช่วยแก้ error
4. **Robust** (ทนทาน/รองรับเทคโนโลยี) — ใช้ได้กับ assistive technology และเบราว์เซอร์หลากหลาย

**ระดับความสอดคล้อง:** A (ขั้นต่ำ) → **AA** (มาตรฐานที่นิยมใช้/ตามกฎหมายหลายประเทศ) → AAA (สูงสุด) — เวอร์ชันล่าสุดที่เป็นมาตรฐาน: **WCAG 2.2** (2023)

**Assistive Technologies:** Screen reader (NVDA, JAWS, VoiceOver, TalkBack), screen magnifier, switch device, voice control, เครื่องอ่านเบรลล์

## 5.6 ประโยชน์ของ UD
- ผู้ใช้กลุ่มกว้างขึ้น (คนพิการ ~16% ของประชากรโลก ตาม WHO + ผู้สูงอายุที่เพิ่มขึ้น — ไทยเป็นสังคมสูงวัย)
- ลดต้นทุนการปรับแก้ภายหลัง
- ประสบการณ์ดีขึ้นสำหรับ *ทุกคน* (curb-cut effect)
- สอดคล้องกฎหมาย, ภาพลักษณ์องค์กร, SEO ดีขึ้น

---

# 6. Cheat Sheet ทบทวนก่อนสอบ

## 🔑 ตัวเลขที่ต้องจำ
| หัวข้อ | ตัวเลข |
|---|---|
| Shneiderman | **8** Golden Rules |
| Nielsen | **10** Heuristics (1990 กับ Molich, ปรับ 1994) |
| Heuristic evaluators | **3–5 คน** (5 คน ≈ 75% ของปัญหา) |
| Severity rating | **0–4** (4 = Catastrophe) |
| Usability test | **5 users** ≈ 85% ของปัญหา |
| SUS ค่าเฉลี่ย | **68** |
| Miller's Law | **7 ± 2** |
| Card sorting ผู้เข้าร่วม | ~**15–20** คน, การ์ด ~30–60 ใบ |
| A/B confidence | **95%**, p < **0.05** |
| UD | **7** Principles (NC State, 1997, Ron Mace) |
| WCAG | **4** หลัก POUR, ระดับ A/AA/AAA, contrast ≥ **4.5:1** |
| Touch target | ≥ **44×44 pt** (iOS), **48×48 dp** (Android) |

## 🧠 ช่วยจำ
- **Shneiderman 8:** Consistency · Universal usability · Feedback · Closure · Prevent errors · Reversal · Control · Memory load
- **Nielsen 10:** Visibility · Match · Control · Consistency · Prevention · Recognition · Flexibility · Minimalist · Recover · Help
- **UD 7:** Equitable · Flexible · Simple · Perceptible · Tolerance · Low effort · Size & space
- **IA 4 ระบบ:** Organization · Labeling · Navigation · Search
- **Card sort 3 แบบ:** Open (ตั้งชื่อเอง) · Closed (หมวดกำหนดให้) · Hybrid
- **Sitemap 4 โครงสร้าง:** Hierarchical · Sequential · Matrix · Database
- **Usability 5 (LEMES):** Learnability · Efficiency · Memorability · Errors · Satisfaction

## 🔗 Mapping ข้ามหัวข้อ (ใช้ตอบข้อสอบเชื่อมโยง)
| แนวคิด | Shneiderman | Nielsen | UD |
|---|---|---|---|
| ความสม่ำเสมอ | R1 Consistency | H4 Consistency & standards | P3 Simple & intuitive |
| Feedback | R3 Informative feedback | H1 Visibility of system status | P4 Perceptible info |
| ป้องกัน error | R5 Prevent errors | H5 Error prevention | P5 Tolerance for error |
| Undo / ควบคุม | R6 Reversal, R7 Control | H3 User control & freedom | P5 Tolerance for error |
| ความจำ | R8 Reduce memory load | H6 Recognition > recall | P3 Simple & intuitive |
| ผู้ใช้หลากหลาย | R2 Universal usability | H7 Flexibility & efficiency | P1 Equitable, P2 Flexibility |
| จุดจบงาน | R4 Closure | (H1 บางส่วน) | — |

---

# 7. แนวข้อสอบพร้อมตัวอย่างคำตอบ

> [!question] Q1: จงอธิบาย Shneiderman's Eight Golden Rules ทั้ง 8 ข้อ พร้อมยกตัวอย่าง
> **แนวตอบ:** ตอบครบ 8 ข้อ แต่ละข้อมี (1) ชื่อ (2) ความหมาย (3) ตัวอย่าง — ดูตารางข้อ 1.3

> [!question] Q3: กำหนดหน้าจอแอปพลิเคชันมาให้ จงวิเคราะห์ว่าละเมิด Golden Rules ข้อใด และเสนอแนวทางแก้ไข
> **แนวตอบ (ตัวอย่าง: แอป Food delivery):**
> - กดสั่งอาหารแล้วไม่มีหน้าสรุปคำสั่งซื้อ → ละเมิด **R4 Closure** → เพิ่มหน้า "สั่งซื้อสำเร็จ" + เลขออเดอร์ + เวลาจัดส่งโดยประมาณ
> - ไม่สามารถยกเลิกคำสั่งซื้อได้ → ละเมิด **R6 Permit easy reversal** → เพิ่มปุ่มยกเลิกภายในเวลาที่ร้านยังไม่รับออเดอร์
> - ปุ่ม "ยืนยัน" หน้าแรกสีเขียว หน้าชำระเงินสีเทา → ละเมิด **R1 Consistency** → ใช้ design system เดียวกัน
> - ไม่มีสถานะไรเดอร์ → ละเมิด **R3 Informative feedback** → แสดง tracking แบบ real-time
> - ต้องพิมพ์ที่อยู่ใหม่ทุกครั้ง → ละเมิด **R8 Reduce memory load** (และ R2) → บันทึกที่อยู่ที่ใช้บ่อย

> [!question] Q2: อธิบาย Card Sorting และความแตกต่างของ Open/Closed Card Sort พร้อมออกแบบ Sitemap ของเว็บไซต์ที่กำหนด
> **แนวตอบ:**
> - Card sorting = เทคนิคให้ผู้ใช้จัดกลุ่มเนื้อหาเพื่อเข้าใจ mental model และนำไปออกแบบ IA
> - Open: ผู้ใช้จัดกลุ่มและตั้งชื่อเอง ใช้ตอนเริ่มออกแบบ / Closed: มีหมวดกำหนดให้ ใช้ตรวจสอบ IA ที่มีอยู่ / Hybrid: ผสม
> - ขั้นตอน: เตรียมการ์ด → หาผู้ใช้ → ให้จัดกลุ่ม → วิเคราะห์ (similarity matrix/dendrogram) → สร้าง sitemap → tree testing
> - Sitemap: วาดแบบลำดับชั้นจาก Home → หมวดหลัก (ไม่เกิน ~7 หมวด) → หมวดย่อย (ไม่ควรลึกเกิน 3 ชั้น) ใส่หมายเลขหน้ากำกับ

> [!question] Q4: จงทำ Heuristic Evaluation หน้าจอที่กำหนดโดยใช้ Nielsen's 10 Heuristics
> **แนวตอบ:** ใช้ตาราง: ปัญหา | Heuristic ที่ละเมิด | Severity (0–4) | ข้อเสนอแนะ (ดู Template ข้อ 3.5) — พยายามหาให้ได้หลาย heuristic ไม่ใช่ซ้ำข้อเดียว และอธิบายเหตุผลว่า *ทำไม* ถึงละเมิด

> [!question] Q4b: Heuristic Evaluation ต่างจาก Usability Testing อย่างไร
> **แนวตอบ:** HE = ผู้เชี่ยวชาญ 3–5 คนตรวจตามหลัก ไม่มีผู้ใช้ ถูกและเร็ว แต่อาจไม่ตรงปัญหาจริง / UT = ผู้ใช้จริงทำ task ได้ปัญหาจริงแต่แพงกว่า → ควรใช้ร่วมกัน

> [!question] Q5: จงออกแบบการทดสอบ A/B Testing สำหรับเพิ่มยอดสมัครสมาชิก
> **แนวตอบ:**
> 1. ปัญหา: อัตราสมัครหน้า landing page ต่ำ (2%)
> 2. Metric: Sign-up conversion rate
> 3. Hypothesis: "ถ้าเปลี่ยนข้อความปุ่มจาก 'ส่ง' เป็น 'เริ่มใช้ฟรี' อัตราสมัครจะเพิ่มขึ้น เพราะบอกคุณค่าที่ผู้ใช้จะได้รับชัดเจนกว่า"
> 4. A = ปุ่ม "ส่ง" (control), B = ปุ่ม "เริ่มใช้ฟรี" (variant) — เปลี่ยนตัวแปรเดียว
> 5. สุ่มแบ่ง 50/50, คำนวณ sample size, รันอย่างน้อย 2 สัปดาห์
> 6. วิเคราะห์: เปรียบเทียบ conversion rate ที่ confidence 95% (p < 0.05)
> 7. สรุป: ถ้า B ดีกว่าอย่างมีนัยสำคัญ → ใช้ B แล้วทดสอบตัวแปรถัดไป

> [!question] Q6: อธิบายหลัก 7 ประการของ Universal Design พร้อมยกตัวอย่างการประยุกต์ใช้กับแอปพลิเคชัน
> **แนวตอบ:** ตอบครบ 7 ข้อ + ตัวอย่างดิจิทัล (ดูตาราง 5.3) เช่น แอปธนาคาร: P1 ใช้ได้กับ screen reader / P2 สแกนหน้า-นิ้ว-PIN / P3 เมนูไม่ซับซ้อน / P4 contrast สูง + alt text / P5 ยืนยันก่อนโอน / P6 โอนซ้ำด้วยรายการโปรด / P7 ปุ่มใหญ่ ≥ 44pt
> อาจถูกถามต่อ: UD ต่างจาก Accessibility อย่างไร → ดูตาราง 5.4, และยก curb-cut effect

---

## 📚 แหล่งอ้างอิงแนะนำ (สำหรับอ่านเพิ่ม)
- Shneiderman, B. et al. *Designing the User Interface* (6th ed., 2016) — cs.umd.edu/users/ben/goldenrules.html
- Nielsen Norman Group — "10 Usability Heuristics for User Interface Design" (nngroup.com/articles/ten-usability-heuristics)
- NN/g — "How to Conduct a Heuristic Evaluation", "Severity Ratings for Usability Problems", "Card Sorting: Uncover Users' Mental Models"
- Rosenfeld, Morville & Arango — *Information Architecture: For the Web and Beyond* (4th ed.)
- Interaction Design Foundation — interaction-design.org (Shneiderman's rules, Card sorting, Universal design)
- The Center for Universal Design, NC State University — *The Principles of Universal Design* (1997)
- W3C — WCAG 2.2 (w3.org/WAI)
- Optimizely — "What is A/B testing?" (optimizely.com/optimization-glossary/ab-testing)
- Microsoft Inclusive Design Toolkit

#UXUI #สรุปสอบ #Shneiderman #Nielsen #IA #CardSorting #Sitemap #ABTesting #UniversalDesign
