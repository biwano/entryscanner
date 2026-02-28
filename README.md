# Entry Scanner

Entry Scanner is a web-based application designed to monitor real-time market data on the Hyperliquid decentralized exchange. It provides automated alerts based on predefined conditions like Trend Flips (SMA 50 crossover) and Price milestones.

## 🚀 Key Features

- **Real-time Monitoring**: Track bullish/bearish trends for all active perpetual assets on Hyperliquid.
- **Trend Flips**: Visual indicators and duration tracking for trend changes on Daily (D1) and Weekly (W1) timeframes.
- **Interactive Charts**: Historical price charts with SMA 50 and SMA 200 indicators.
- **Subscription Management**: Personalized notifications for specific pairs and timeframes.
- **Discord Integration**: Automated alerts delivered via Discord webhooks.
- **Asset Management**: Admin-only controls to manage the list of monitored pairs.

## 🛠 Tech Stack

- **Frontend**: [Nuxt 4](https://nuxt.com/) (Vue.js)
- **UI Framework**: [Nuxt UI](https://ui.nuxt.com/) (Fuchsia theme) + [Tailwind CSS](https://tailwindcss.com/)
- **SDK**: [@nktkas/hyperliquid](https://github.com/nktkas/hyperliquid)
- **Backend/DB**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Data Fetching**: Polling via Hyperliquid's InfoClient
- **Package Manager**: pnpm

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd entryscanner
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root directory and add the following:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   CRON_SECRET=your_custom_secret_for_cron_jobs
   ```

## 🛠 Development

Start the development server:
```bash
pnpm dev
```

## 🏗 Production

Build the application for production:
```bash
pnpm build
```

Preview the production build locally:
```bash
pnpm preview
```

## 🗄 Database Management

Generate TypeScript types from the Supabase schema:
```bash
pnpm db:codegen
```

Push local database changes to Supabase:
```bash
pnpm db:push
```

## ⚙️ Background Workers

The application uses server-side workers for trend analysis and alert dispatching:

- **Automated Trend Worker**: Systematic updates for monitored pairs, calculating SMA 50 crossovers.
- **Notification Dispatcher**: Processes new events and sends Discord alerts to subscribed users.

These can be triggered via:
- API endpoints
- Scheduled Nuxt cron tasks
- Bash commands

---

For more detailed technical information, refer to the [SPECS.md](./SPECS.md) file.
