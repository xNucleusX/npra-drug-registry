# NPRA Drug Registry

A searchable, offline-first mirror of a sample of Malaysia's NPRA (National Pharmaceutical Regulatory Agency)
registered pharmaceutical product database, sourced from the official
[QUEST3+](https://quest3plus.bpfk.gov.my/pmo2/index.php) product search system.

Built with React, TypeScript, Vite, and Tailwind CSS.

## What's included

For each product:

- **Product name**
- **Active ingredient(s)**
- **Registration number**
- **Proposed package insert PDF**, where available in QUEST3+ (products registered from 2017 onward) — stored
  in this repo under [`public/data/pdfs/`](public/data/pdfs)

## Coverage

This is a **capped sample**, not the full registry. It was gathered by searching QUEST3+ for a broad list of
common active ingredients spanning major therapeutic classes (analgesics, antibiotics, cardiovascular,
diabetes, respiratory, CNS, etc.), de-duplicating by registration number, and capping at roughly ~1,800–2,000
unique products. The full Malaysian pharmaceutical registry contains many more products than are included
here — see [`scripts/scrape.py`](scripts/scrape.py) and [`scripts/ingredients.py`](scripts/ingredients.py) to
extend the sample or re-run the scrape.

## Getting started

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

Output goes to `dist/`. The build script also copies `index.html` to `404.html` so client-side routes work on
static hosts like GitHub Pages.

## Data format

[`public/data/products.json`](public/data/products.json):

```json
{
  "metadata": { "generatedAt": "...", "source": "NPRA Quest3+", "totalProducts": 0 },
  "products": [
    {
      "id": "MAL12035013X",
      "registrationNumber": "MAL12035013X",
      "productName": "string",
      "holder": "string | null",
      "manufacturer": "string | null",
      "activeIngredients": ["string"],
      "packageInserts": [{ "filename": "string", "path": "public/data/pdfs/<reg>/<file>.pdf", "sourceUrl": "string" }]
    }
  ]
}
```

## Deploying to GitHub Pages

A workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys to GitHub
Pages on every push to `main`. In repo settings, set **Pages → Source** to "GitHub Actions".

## Disclaimer

This is an independent, unofficial mirror for reference purposes only. It is not affiliated with NPRA or the
Ministry of Health Malaysia. For authoritative, complete, up-to-date information, always refer to the
official [QUEST3+](https://quest3plus.bpfk.gov.my/pmo2/index.php) system.
