# ✦ PLANKTOS — Deep Space Knowledge Archive

> **Content belongs to Obsidian. Structure emerges from links and metadata. GitHub preserves and publishes it. The website visualizes the resulting knowledge universe.**

Obsidian vault (`vault/`) → Git → GitHub Actions → Astro static site → GitHub Pages

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev        # http://localhost:4321  (แก้ .md ใน Obsidian แล้ว reload หน้าเว็บได้เลย)
npm run validate   # ตรวจ wikilink / รูป / metadata / citation
npm run build      # สร้างเว็บใน dist/
npm run preview    # ดูผล build
```

เปิดโฟลเดอร์ `vault/` ใน Obsidian ด้วย "Open folder as vault" ได้เลย
ถ้าจะใช้ vault ที่อื่น ให้ตั้งตัวแปร `VAULT_DIR=path/to/vault`

## โครงสร้าง

```text
vault/                    ← Obsidian vault = CMS (แหล่งเนื้อหาเพียงแห่งเดียว)
  Mathematics/ Physics/ Computer Science/ Research/ Ideas/ Assets/
  references.bib          ← BibTeX สำหรับ @citekey
  About.md                ← หน้า /about
  Templates/              ← ไม่ถูก publish
src/
  lib/config.ts           ← ชื่อเว็บ, sections, callout types, statuses
  lib/vault/              ← Knowledge engine (ไม่ขึ้นกับ Astro)
    vault.ts              ←   scan vault, resolve [[links]] แบบ Obsidian, backlinks, tags, graph
    parse.ts              ←   wikilink/tag/heading extraction, slug
    bib.ts                ←   BibTeX parser
    validate.ts           ←   กฎตรวจสอบสำหรับ CI
  lib/markdown/           ← Obsidian compatibility layer (unified/remark/rehype)
    obsidian.ts           ←   [[wikilinks]], ![[embeds]], ![[img.png|300]], #tags, ==highlight==, ^block-id
    callouts.ts           ←   > [!theorem] Title, foldable +/-
    citations.ts          ←   [@Key] และ @Key
    render.ts             ←   pipeline: GFM + MathJax (SVG) + Shiki + Mermaid
  lib/site.ts             ← view-models: sections, tree, research projects, roadmap
  pages/                  ← routes
  scripts/graph.ts        ← Knowledge Universe / local graph (d3-force + canvas)
  scripts/search.ts       ← client-side search (MiniSearch)
  styles/global.css       ← design tokens (เปลี่ยนธีม = แก้ token)
scripts/
  validate.ts             ← npm run validate
  sync-assets.ts          ← copy รูป/ไฟล์แนบจาก vault → public/vault/
.github/workflows/deploy.yml
```

## Routes

| URL | ที่มา |
|---|---|
| `/` | Home: starfield, sections, recent transmissions |
| `/universe` | Knowledge Universe: ทุก note = ดาว, section = กาแล็กซี |
| `/library`, `/library/<section>` | Library แบบ tree จากโฟลเดอร์ |
| `/<folders>/<note>` | หน้า note: TOC, local graph, backlinks, bibliography |
| `/research` | Research sector: project ที่ `type: research-project` |
| `/ideas`, `/tags/<tag>`, `/search?q=` | |
| `/graph.json`, `/search-index.json` | ข้อมูลที่สร้างตอน build |

URL ได้มาจาก path ของไฟล์: `Physics/Quantum Field Theory/Yang-Mills/Mass Gap.md` → `/physics/quantum-field-theory/yang-mills/mass-gap`
โน้ตที่ชื่อซ้ำกับโฟลเดอร์ (folder note) เช่น `Gauge Theory/Gauge Theory.md` จะได้ URL `/…/gauge-theory`

## Syntax ที่รองรับ

- `[[Note]]`, `[[Note|alias]]`, `[[Note#Heading]]`, `[[#Heading]]`, `[[Note#^block]]`
- `![[Note]]`, `![[Note#Section]]`, `![[Note#^block]]`: embed เนื้อหา (กัน embed วนซ้ำได้)
- `![[image.png]]`, `![[image.png|700]]`, `![alt](Assets/x.png)`, รวมทั้ง video/audio/PDF
- `$inline$`, `$$display$$`, `\begin{aligned}`, `\tag{}`: render เป็น SVG ตอน build (ไม่ต้องโหลด JS ฝั่ง client)
- ```` ```mermaid ````: โหลด mermaid เฉพาะหน้าที่มี diagram
- Callouts: note, info, tip, warning, danger, example, quote, **definition, theorem, lemma, proposition, corollary, proof, conjecture, remark, exercise** (เพิ่มได้ใน `config.ts`)
- `#tag`, frontmatter `tags:`, `aliases:`, footnotes, tables, task lists, `%%comments%%`, `==highlight==`
- `[@Wilson1974]`, `@Wilson1974`: อ้างอิงจาก `vault/references.bib`
- Wikilink ใน Properties (เช่น `project: "[[…]]"`) นับเป็นลิงก์จริงเหมือน Obsidian
- `publish: false` หรือ `draft: true` ใน frontmatter = ไม่ publish

## Frontmatter

```yaml
---
title: Yang-Mills Mass Gap      # ไม่ใส่ = ใช้ชื่อไฟล์
status: studying                # seed | studying | draft | active | paused | complete | archived
field: Quantum Field Theory
created: 2026-10-04
updated: 2026-10-04             # ไม่ใส่ = ใช้วันที่ commit ล่าสุดจาก git
aliases: [YM]
tags: [Yang-Mills, QFT]
---
```

Research project (ดูตัวอย่างใน `vault/Research/Yang-Mills Mass Gap/`):

```yaml
type: research-project          # log | question | idea สำหรับโน้ตในโฟลเดอร์ project
status: active
question: Can four-dimensional quantum Yang–Mills theory …?
roadmap:                        # "A -> B" ใช้ [[wikilink]] หรือข้อความธรรมดาก็ได้
  - "[[Lattice Yang-Mills]] -> [[Spectral Gap]]"
```

## Deploy ไป GitHub Pages

1. สร้าง repo แล้ว push (branch `main`)
2. Settings → Pages → Source: **GitHub Actions**
3. ทุกครั้งที่ push, workflow จะ `validate`, `build` แล้ว deploy ให้อัตโนมัติ (base path ตั้งตามชื่อ repo ให้เอง)
   ถ้ามี broken link หรือรูปหาย CI จะ fail และแสดง annotation ที่ไฟล์/บรรทัดนั้น พร้อม "Possible: [[…]]"
