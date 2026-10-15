# CryptoSynapse

CryptoSynapse is a premium, modern full-stack web application designed for tracking cryptocurrencies, NLP-driven articles sentiment analysis, and managing user-configured price alerts in real-time. 

The project is built entirely in TypeScript using a modern tech stack:
*   **Backend**: Node.js + Express + TypeScript
*   **Database**: PostgreSQL + Prisma ORM
*   **Frontend**: React + Vite + TypeScript + Tailwind CSS (dynamic dark-mode themes)
*   **AI Engine**: Google Gemini (via `@google/generative-ai`) for multi-lingual translation, sentiment analysis, context expansion, deep research filters, and automated trading analysis.

For detailed design patterns, database entity relationship structures, background services, and error handling mechanisms, see the [Architecture Guide](./ARCHITECTURE.md).

---

## Key Features

1. **Asset Price Tracking**: Tracks cryptocurrency prices, market caps, and 24h trends via the CoinGecko API.
2. **Interactive Correlation Charting**: Features dynamic visual timelines using Recharts area graphs with custom timeframes (`1s` up to `1M`), overlaying **Price and AI Sentiment** to identify market correlations.
3. **AI Crypto News Ingest**: Automatically fetches feeds from CoinDesk RSS and runs them through Google Gemini to generate Polish summaries and 5-level market sentiment scores.
4. **Context Expansion & AI Analysis**: Generates insightful deep bullet-point market impacts for news articles using Gemini (Polish, English, and Ukrainian support) with a database-level caching mechanism to save API usage.
5. **AI Trading Companion**: An interactive widget that analyzes recent news for a selected coin and generates a professional investment report with a Risk Score based on real-time market sentiment.
6. **On-demand Deep Research**: Scans Google News RSS for customized target keywords and queries, utilizing an AI-based crypto-relevance gate to filter out non-crypto content, summarize findings, and run sentiment analysis.
7. **Price Alerts Manager with Retry Logic**: Set real-time targets for coins. The backend tracks price crossings and dispatches alerts with delivery status tracking:
    *   **Telegram Chat Integration** (formatted HTML notification).
    *   **SMTP Email Alerts** (premium glassmorphic HTML email template).
    *   **Resilient Delivery**: Automatic retry logic for failed notifications ensuring high reliability (`deliveryStatus` tracking).
8. **Full Multilingual Localization**: Complete native translations for **Polish (PL)**, **English (EN)**, and **Ukrainian (UK)** powered by React `i18next`.

---

## Workspace Directory Structure

```text
CryptoSynapse/
├── backend/                  # Node.js + Express backend service
│   ├── prisma/
│   │   ├── schema.prisma     # Prisma database models & relation graph
│   │   └── migrations/       # Database migration history
│   ├── src/
│   │   ├── index.ts          # Express server entry point & scheduler
│   │   ├── middleware/       # Custom middleware (JWT auth)
│   │   ├── routes/           # Routing layers (Auth, Coins, News, Alerts, AI)
│   │   └── services/         # Integration services (Gemini, CoinGecko, Mail, Telegram)
│   ├── .env.example          # Template environment config
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Vite + React client app
│   ├── src/
│   │   ├── assets/           # UI media assets
│   │   ├── context/          # State management (AuthContext.tsx)
│   │   ├── App.tsx           # Premium glassmorphic dashboard interface
│   │   ├── index.css         # Custom CSS directives and HSL variables
│   │   ├── i18n.ts           # i18next localizations (PL, EN, UK)
│   │   └── main.tsx          # Client mounting entry point
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── docker-compose.yml        # PostgreSQL service container definition
└── README.md                 # Project launch instructions (this file)
```

---

## Step-by-Step Setup Guide

### 1. Run the Database (Docker Compose)
To launch the preconfigured PostgreSQL server, make sure Docker is running and execute:
```bash
docker-compose up -d
```
This boots up a PostgreSQL instance on port `5432` with username `postgres`, password `postgrespassword`, and database `cryptosynapse`.

### 2. Configure Environment Variables
Navigate to the `backend` folder, duplicate the `.env.example` file, and name it `.env`:
```bash
cd backend
cp .env.example .env
```
Ensure the `.env` settings are populated as follows:
```env
PORT=5001
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/cryptosynapse?schema=public"
GEMINI_API_KEY="your_google_gemini_api_key"
JWT_SECRET="your_custom_jwt_secret_token"

# (Optional) Telegram Bot configuration
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# (Optional) SMTP Email configuration
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your_smtp_user"
SMTP_PASS="your_smtp_password"
```

### 3. Install Dependencies

**For Backend:**
```bash
cd backend
npm install
```

**For Frontend:**
```bash
cd ../frontend
npm install
```

### 4. Setup Database and Run Migrations
Run the initial Prisma schema migration to initialize tables for `User`, `Coin`, `Article`, and `Alert`:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Running Development Servers

To spin up the ecosystem, run the backend and frontend servers in separate terminals (or in parallel):

#### Start the Backend Server:
```bash
cd backend
npm run dev
```
*   **Backend Server Port**: [http://localhost:5001](http://localhost:5001)
*   **Health validation endpoint**: [http://localhost:5001/api/health](http://localhost:5001/api/health)
*   *Note: Ingest tasks for CoinGecko prices (5m interval) and RSS News (15m interval) will run automatically upon startup.*

#### Start the Frontend Client:
```bash
cd frontend
npm run dev
```
*   **Frontend Local URL**: [http://localhost:5173](http://localhost:5173) (or the port specified by Vite on launch)
