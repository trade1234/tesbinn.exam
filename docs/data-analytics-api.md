# Read-only Data Analytics API

This public endpoint exposes aggregate Data Analytics to another system without an `.env` file or API key. It only supports `GET` and reads from completed exam Results and Applications. It does not expose names, phone numbers, student IDs, passwords, payment data, identity images, or uploaded files.

## Endpoint

```text
GET https://tsexam-ashen.vercel.app/api/v1/external/data-analytics
```

No authentication or environment variable is required for this aggregate endpoint.

## Filters

| Query | Values | Example |
| --- | --- | --- |
| `period` | `all`, `daily`, `weekly`, `monthly`, `yearly` | `monthly` |
| `anchor` | `YYYY-MM-DD`; selects the day/week/month/year containing this date | `2026-06-01` |

If `period` is omitted, the endpoint returns all-time data.

```text
https://tsexam-ashen.vercel.app/api/v1/external/data-analytics?period=monthly&anchor=2026-06-01
```

## JavaScript server example

```js
const response = await fetch(
  "https://tsexam-ashen.vercel.app/api/v1/external/data-analytics?period=monthly&anchor=2026-06-01"
);

if (!response.ok) throw new Error(`Analytics API failed: ${response.status}`);
const analytics = await response.json();
console.log(analytics.totals, analytics.resultsByCourse, analytics.applicationsByProgram);
```

## cURL example

```bash
curl "https://tsexam-ashen.vercel.app/api/v1/external/data-analytics?period=yearly&anchor=2026-01-01" \
  --fail
```

The response includes totals, results grouped by course, and applications grouped by training program. Every response includes `readOnly: true`, `access: "PUBLIC_AGGREGATES"`, the applied filter, and its generation time.

## Optional detailed endpoint

Individual result/application records remain protected at:

```text
GET https://tsexam-ashen.vercel.app/api/v1/external/data-analytics/details
```

This optional endpoint requires `THIRD_PARTY_API_KEY`. You can ignore it until you are able to configure Vercel environment variables.

For a browser application hosted on another domain, add that exact domain to the server's `ALLOWED_ORIGINS` Vercel environment variable. A server-to-server integration does not require CORS configuration.
