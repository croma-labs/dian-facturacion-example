<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/croma_brand_white.svg">
  <img alt="Croma" src="public/croma_brand_black.svg" height="26">
</picture>

# DIAN Playground

**Issued and received invoices from Colombia's DIAN, in one API.**

A playground for the [Croma API](https://docs.croma.run/guides/colombia/dian-facturacion): connect a DIAN electronic-invoicing account and explore its invoices, each document's original XML and PDF, the monthly invoicing report and the account's profile. Every call shows up in a live inspector you can copy from.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=dian-playground&repository-name=dian-playground&repository-url=https%3A%2F%2Fgithub.com%2Fcroma-labs%2Fdian-facturacion-example&env=CROMA_API_KEY&envDescription=CROMA_API_KEY+reads+DIAN+through+Croma+%28free+to+get%29.+The+sample-data+mode+works+without+it.&envLink=https%3A%2F%2Fplatform.usecroma.com%2Fsign-up)
&nbsp;
[![Get your Croma API key](public/croma-api-key-badge.svg)](https://platform.usecroma.com/sign-up)

</div>

---

## What's inside

- **Two ways in.** *Explorar con datos de ejemplo* opens a fictional company with two years of invoicing, no account needed. *Conectar mi cuenta DIAN* runs the real flow against your own account.
- **The whole connection flow.** Ask DIAN to email the access link, paste it, and Croma returns a connection id. DIAN keeps the access open for about an hour; when it ends, the app asks for a new link and the same connection is renewed with its id intact.
- **A dashboard built from two calls.** Sales, purchases, VAT generated and deductible, month by month, and the top clients and providers, all from `issued-documents` and `received-documents`.
- **Every document, in full.** Search and filter the invoices, open one to see its lines, taxes, DIAN validations and RADIAN events, preview the PDF, read the UBL XML, download both.
- **A live API inspector.** Each request, its response, its latency, and a ready-to-run cURL. The API key stays on your server; the browser never sees it.
- **Nothing stored.** No database. The only state is a cookie that remembers which connection the browser is looking at.
- **Validated end to end.** Zod schemas check every form before it leaves the browser, every server action before it calls the API, and every API response before it reaches the UI.
- **Crafted UI.** [shadcn/ui](https://ui.shadcn.com) on the same ruled-sheet design system as the [Croma Chat Template](https://github.com/croma-labs/croma-chat-template): hairline rails, mono eyebrow labels, square surfaces, Croma blue, dark mode.

## One-click deploy

1. Click **Deploy with Vercel** above.
2. Get a free API key with the **Get your Croma API key** button.
3. Paste `CROMA_API_KEY` when Vercel asks for it.

The sample-data mode works with no key at all, so the deploy is useful from the first second.

## Running locally

```bash
git clone https://github.com/croma-labs/dian-facturacion-example
cd dian-facturacion-example
npm install

cp .env.example .env.local   # add CROMA_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose *Explorar con datos de ejemplo*.

## How the connection works

DIAN's electronic-invoicing system has no password: access is a link DIAN emails to the address in the RUT, valid for 60 minutes.

| Step | Call | What happens |
|---|---|---|
| 1 | `POST /co/dian-facturacion/access-requests/v1` | DIAN emails the link to the legal representative (or the person). Runs without a connection. |
| 2 | `POST /co/dian-facturacion/connections/v1` | `access_link` + `authorized: true`. Returns `conn_...`: keep it with your user. |
| 3 | `issued-documents`, `received-documents`, `document`, `monthly-reports`, `profile` | Each call sends `connection_id` and reads DIAN live as that account. |

When the access ends, queries answer `422 connection_rejected`. Register a new link and the same connection is renewed.

## How it's built

```
app/actions.ts               Server actions: Zod-validated input, one per endpoint, sample or live
lib/croma.ts                 API client: async-job polling, Zod-validated responses, inspector traces
lib/schemas.ts               Zod schemas for every form, input and response
lib/demo.ts                  The sample company: deterministic invoices, reports, XML and PDF
lib/session.ts               The one cookie: which connection this browser looks at
components/connect-flow.tsx  Ask for the link, paste it, connect (also used to renew)
components/inspector.tsx     The live inspector and the query cache behind it
components/overview-panel.tsx, documents-panel.tsx, document-sheet.tsx, account-panels.tsx
```

Slow lookups are async jobs: the client waits inline with `Prefer: wait=55` and polls the job when Croma answers `202`. See [async jobs](https://docs.croma.run/async-jobs).

## Learn more

- [DIAN electronic invoicing guide](https://docs.croma.run/guides/colombia/dian-facturacion): every field, every error
- [Croma docs](https://docs.croma.run): the rest of the catalog
- [Croma Chat Template](https://github.com/croma-labs/croma-chat-template): the same data, through MCP, in a chat

## License

[MIT](LICENSE)
