# DairyTop Business Cockpit

One dashboard for sales, volumes, customers, receivables, open orders and the books. Every figure can be clicked to see the rows it is made of, and each of those lists shows a check that the rows add up to the figure exactly.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

The cockpit opens in your browser at the address printed in the terminal (usually http://localhost:5173).

## Publish it

```bash
npm run build
```

This creates a `dist` folder. Copy the whole folder to any web server or static hosting service. Use `npm run preview` to check the built version locally first.

## Deploy on Vercel

Push this folder to a Git repository and import it in Vercel, or run `npx vercel` in this folder. Vercel detects Vite automatically: build command `npm run build`, output folder `dist` (both are also set in `vercel.json`). To update the figures, replace `public/dash.json`, commit and push; Vercel redeploys on its own.

## Update the figures

All figures come from one file: `public/dash.json`. To show newer figures, replace that file with the latest version and reload the page. After `npm run build`, the same file is at `dist/dash.json` and can be replaced there directly without rebuilding.

## Pages

| Page | What it answers |
|---|---|
| Overview | How the business is doing in the selected period |
| Sales trend | Revenue month by month, with returns and credit notes |
| Verkopers | How each sales representative is doing |
| Verkoper card | One page per sales representative |
| Volumes per verkoper | Tonnes and pieces sold per representative and product line |
| Customers | Who buys, who is new and who stopped; contract progress |
| Products & price | Product groups, price per kg and estimated margin |
| Markets | Revenue by country |
| Reorder radar | Regular buyers who are late to reorder |
| Open orders | Orders still to deliver, waiting for an invoice, or invoiced but still open |
| Results (books) | Profit and loss from the accounts |
| Receivables | What customers owe, how late it is, and the tie-out to the debtors account |
| Data & definitions | How each figure is defined |
| Insights | What changed this week or month |
| Executive Summary | Takeaways, decisions, outlook and risks |

## How the figures are defined

- All amounts exclude VAT.
- Receivables cover invoices dated from 7 April 2026.
- January 2025 to March 2026 come from the former sales portal as monthly totals. Day-level detail starts in April 2026.
- The latest month is partial. It is only compared with the same days of an earlier month.
- Filters at the top apply to every page except the Executive Summary, which always shows the whole company.
- Every chart has a Chart / Table switch.
- The cockpit follows the device's light or dark setting.
