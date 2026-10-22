# Ninety Plus — World Football 26 Jersey Store

A responsive football-fan jersey storefront built with HTML, CSS, vanilla JavaScript, Node.js, Express and PostgreSQL. It includes Docker configuration and is preconfigured to use the Neon PostgreSQL URL provided for this project.

> **Credential safety:** the included `.env` file contains the database connection string supplied for this request so the project is easy to start. Treat the ZIP and `.env` as private. Never commit `.env` or publish it. If the database password has been shared beyond a trusted environment, rotate it in Neon and update `.env`.

## Features

- Responsive desktop, tablet and mobile storefront with custom jersey illustrations.
- 12 starter product records across Home, Away, Training and Retro collections. These are **fan-concept/supporter-style designs**, not official licensed team merchandise.
- Product search, country/category filtering, price sorting, product quick-shop, size/stock selection and wishlist.
- Persistent browser cart, quantity updates, free-shipping progress and delivery form.
- Orders and order items saved transactionally in PostgreSQL; sizes are reserved with row locks to reduce overselling.
- Newsletter signup stored in PostgreSQL.
- PostgreSQL schema and initial product catalogue are created automatically at first start.
- Docker image build, Docker Compose, health check, non-root app user, rate limits for order/newsletter endpoints, and a local PostgreSQL option.

## Option A — Run with the supplied Neon database

Requirements: Node.js 20+ and access to the configured Neon database.

1. Unzip the project and open a terminal in this folder.
2. Review `.env`. The supplied `DATABASE_URL` is already present. Do not share that file or commit it.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the application:

   ```bash
   npm start
   ```

5. Open **http://localhost:3000**.
6. Verify the API and database connection at **http://localhost:3000/api/health**. A successful response looks like `{"status":"ok","database":"connected"}`.

The first start creates the tables and inserts the sample jerseys if the products table is empty. Ensure the Neon database user has permission to create tables, indexes and insert rows.

## Option B — Run with Docker and Neon PostgreSQL

Requirements: Docker Desktop (or Docker Engine with the Compose plugin).

```bash
docker compose -f compose.yaml up --build -d
```

Visit **http://localhost:3000**. Check the running container and logs:

```bash
docker compose ps
docker compose logs -f jersey-store
```

Stop the app:

```bash
docker compose down
```

The container reads `DATABASE_URL` from the local `.env` through Compose. The `.env` file is **not copied into the image**.

## Option C — Run entirely in local containers (no Neon connection needed)

The optional Compose override starts a local PostgreSQL container with a named data volume. The override supplies an internal connection string to the app, replacing the Neon URL for this run:

```bash
docker compose -f compose.yaml -f compose.local.yaml up --build -d
```

Visit **http://localhost:3000**. The first database start may take a short moment while PostgreSQL initializes. To view logs:

```bash
docker compose -f compose.yaml -f compose.local.yaml logs -f
```

To stop containers but keep local database data:

```bash
docker compose -f compose.yaml -f compose.local.yaml down
```

To remove the local database volume and its data as well (destructive):

```bash
docker compose -f compose.yaml -f compose.local.yaml down -v
```

The local compose credentials are development-only and must not be used for a public deployment.

## API routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | App/database health check |
| `GET` | `/api/products` | Product listing; supports `q`, `category`, `nation`, `min`, `max`, `sort` |
| `GET` | `/api/products/:id` | One product |
| `POST` | `/api/orders` | Validates stock and creates an order plus items in a transaction |
| `GET` | `/api/orders/:orderNumber` | Retrieve an order by reference |
| `POST` | `/api/newsletter` | Add an email to the newsletter list |

Example order JSON:

```json
{
  "name": "Alex Fan",
  "email": "alex@example.com",
  "phone": "+1 555 0100",
  "address": "10 Football Lane",
  "city": "Austin",
  "postalCode": "78701",
  "country": "United States",
  "items": [
    { "productId": "argentina-skyline-home", "size": "M", "quantity": 1 }
  ]
}
```

## Important production notes

- Checkout is a **demo order flow**. It saves delivery details and order data, but it does not charge a card or integrate a payment processor. Add a payment provider and verified webhook handling before taking real payments.
- Add customer authentication, order-access controls, admin tooling, privacy/retention controls, fulfilment/email workflows, tax handling, real shipping rates and legal policies before production use.
- The seeded products and prices are demonstration data. Verify supply, product claims, sizing, applicable taxes and prices before selling anything.
- The design is an independent fan-concept storefront and is not affiliated with FIFA or national football federations. Obtain the necessary rights before using protected crests, official kit artwork, tournament branding or claiming merchandise is licensed.
- Do not publish the provided database credential. Use a new restricted application role for production, rotate any credential that has been exposed, and use environment/secret management on hosting platforms.

## Project structure

```text
world-cup-2026-jersey-store/
├── public/
│   ├── app.js
│   ├── favicon.svg
│   ├── index.html
│   └── styles.css
├── .dockerignore
├── .env                 # local secret config; excluded from image and Git
├── .env.example         # template for other environments
├── .gitignore
├── Dockerfile
├── compose.yaml
├── compose.local.yaml   # optional app + local PostgreSQL
├── package.json
├── README.md
└── server.js
```

## Checks

Run the static JavaScript syntax checks with:

```bash
npm run check
```

The Docker image is built on your machine by Docker Compose; this deliverable includes the full Docker build and container configuration.
