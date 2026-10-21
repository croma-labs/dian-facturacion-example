# Facturación DIAN con Croma

An example Next.js app that connects a Colombian taxpayer's DIAN electronic-invoicing account and shows its issued and received invoices, one invoice in full (with its original XML and PDF), DIAN's monthly invoicing report and the account's invoicing profile. It runs on the [Croma API](https://docs.croma.run/guides/colombia/dian-facturacion).

The UI is in Spanish, because the people who use it are. Every step also shows the exact API call it makes, so the app doubles as a walkthrough of the integration.

## How the connection works

DIAN's electronic-invoicing system has no password. Access is a link that DIAN emails to the address in the RUT, and it is valid for 60 minutes. The onboarding has three steps:

1. **Ask for the link.** `POST /co/dian-facturacion/access-requests/v1` with the legal representative's document and the company's NIT (or a person's own document). DIAN emails the link. This call runs without a connection.
2. **Register the link.** The user pastes it, and `POST /co/dian-facturacion/connections/v1` with `access_link` and `authorized: true` returns a connection id (`conn_...`). Store it next to your user.
3. **Query.** Every query sends that `connection_id` and reads DIAN live as that account:

| Endpoint | Returns |
|---|---|
| `issued-documents`, `received-documents` | Every document in a date range (up to a year): CUFE, counterparty, taxes, withholdings, total, DIAN and RADIAN status, totals per type |
| `document` | One document in full: lines, totals, validations, events, `xml` and `pdf_base64` |
| `monthly-reports` | DIAN's monthly invoicing report |
| `profile` | Enablement, reception email, legal representatives, software and numbering ranges |

DIAN keeps the access open for about an hour. After that, queries answer `422 connection_rejected`. Ask for a new link and register it again: the same connection is renewed and keeps its id. The app sends the user back to step 1 when that happens.

## Run it

```bash
cp .env.example .env.local   # add your CROMA_API_KEY
npm install
npm run dev
```

Get an API key at [platform.usecroma.com](https://platform.usecroma.com).

## Where to look

- `lib/croma.ts`: the API client. Slow lookups are async jobs: it waits inline (`Prefer: wait=55`) and polls the job when Croma answers `202`.
- `app/actions.ts`: the server actions for the access request and the connection.
- `components/onboarding.tsx`: the three-step onboarding.
- `components/views.tsx`, `app/panel`: the queries and how each one renders.
- `lib/session.ts`: this demo keeps the connection id in a cookie. In your product, keep it on your user record.

The API key stays on the server. The browser only ever sees the connection id.

## License

MIT
