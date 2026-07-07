import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('docs/audit-screenshots');

const items = [
  {
    title: 'Search results — title truncation & CTA alignment',
    note: 'Full product title with line-clamp; Add to cart aligned to quantity stepper height.',
    file: 'search-keyword-stm32.png',
  },
  {
    title: 'Product detail — tags & duplicate controls',
    note: 'Tags derived from taxonomy path; duplicate “Show similar products” button removed.',
    file: 'product-detail-prod-1.png',
  },
  {
    title: 'Order summary — promo image & checkout guidance',
    note: 'Electronics promo image instead of desk; inline helper text for incomplete shipping/payment.',
    file: 'order-summary-guest.png',
  },
  {
    title: 'Checkout demo page — contrast & CTA clarity',
    note: 'White card on slate background; disabled “Pay now” removed.',
    file: 'checkout-session-disabled.png',
  },
  {
    title: 'Mobile home — unified feature copy',
    note: 'Consistent R&D messaging across breakpoints; skeleton loaders replace empty flash.',
    file: 'mobile-home-390.png',
  },
  {
    title: 'Mobile order summary',
    note: 'Improved accordion guidance and promo imagery.',
    file: 'mobile-order-summary-390.png',
  },
];

async function toDataUri(folder, file) {
  const filePath = path.join(root, folder, file);
  const buffer = await readFile(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

const cards = [];

for (const item of items) {
  const [beforeSrc, afterSrc] = await Promise.all([toDataUri('before', item.file), toDataUri('after', item.file)]);
  cards.push({ ...item, beforeSrc, afterSrc });
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ECAS Audit — Before / After</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      header {
        position: sticky;
        top: 0;
        z-index: 10;
        backdrop-filter: blur(10px);
        background: rgba(15, 23, 42, 0.92);
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        padding: 1rem 1.5rem;
      }
      header h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
      header p { margin: 0; color: #94a3b8; font-size: 0.9rem; }
      main {
        max-width: 1600px;
        margin: 0 auto;
        padding: 1.5rem;
        display: grid;
        gap: 1.5rem;
      }
      .card {
        background: #fff;
        color: #0f172a;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
      }
      .card-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #e2e8f0;
      }
      .card-header h2 { margin: 0 0 0.35rem; font-size: 1rem; }
      .card-header p { margin: 0; color: #64748b; font-size: 0.875rem; line-height: 1.5; }
      .compare { display: grid; grid-template-columns: 1fr 1fr; }
      .pane { min-width: 0; border-right: 1px solid #e2e8f0; }
      .pane:last-child { border-right: 0; }
      .label {
        padding: 0.65rem 1rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .label.before { background: #fef2f2; color: #b91c1c; }
      .label.after { background: #ecfdf5; color: #047857; }
      .pane img {
        display: block;
        width: 100%;
        height: auto;
        background: #f8fafc;
      }
      @media (max-width: 900px) {
        .compare { grid-template-columns: 1fr; }
        .pane { border-right: 0; border-bottom: 1px solid #e2e8f0; }
        .pane:last-child { border-bottom: 0; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>ECAS UI Audit — Before / After</h1>
      <p>Self-contained comparison — images are embedded so this works in any preview.</p>
    </header>
    <main>
      ${cards
        .map(
          (item) => `
      <section class="card">
        <div class="card-header">
          <h2>${item.title}</h2>
          <p>${item.note}</p>
        </div>
        <div class="compare">
          <div class="pane">
            <div class="label before">Before</div>
            <img src="${item.beforeSrc}" alt="Before — ${item.title}" />
          </div>
          <div class="pane">
            <div class="label after">After</div>
            <img src="${item.afterSrc}" alt="After — ${item.title}" />
          </div>
        </div>
      </section>`
        )
        .join('')}
    </main>
  </body>
</html>
`;

await writeFile(path.join(root, 'comparison.html'), html);
console.log(`Wrote ${path.join(root, 'comparison.html')} (${cards.length} comparisons embedded)`);
