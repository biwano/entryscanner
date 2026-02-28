# Specifications: Hyperliquid Alert Web App

## 1. Project Overview
A web-based application that monitors real-time market data on the Hyperliquid decentralized exchange and triggers automated alerts based on predefined conditions (Trend Flips, Price milestones).

## 2. Technical Stack
- **Frontend**: Nuxt 4 (Vue.js) with Nuxt UI (which includes Tailwind CSS).
- **Hyperliquid SDK**: `@nktkas/hyperliquid` (TypeScript SDK) wrapped in a custom shared library.
- **Database/Backend**: Supabase (PostgreSQL for storage, Supabase Auth for users).
- **Data Fetching**: Polling via Hyperliquid's `InfoClient` (using standardized shared utilities).
- **State Management**: TanStack Query (for managed polling and data fetching) and Pinia (for UI state).

## 3. Core Features

### 3.1. UI Features

#### 3.1.1. Dashboard
- **Monitored Pairs View**: Display all system-wide monitored pairs with their current trend status.
- **Trend Indicators**: 
    - **Bullish/Bearish Status**: Visual indicator of the current trend based on 200 EMA crossover on **Daily (D1) and Weekly (W1)** timeframes.
    - **Trend Duration**: Show since when the pair turned bullish or bearish (timestamp/relative time).
    - **Sorting**: Pairs are sorted by how long they have been in their current trend (ascending order - showing most recent trend changes first).
- **Navigation**: Click on any pair to open the **Pair Analysis** view.
- **Price Ticker**: Display live-polled prices for all active perpetual assets on Hyperliquid.
- **Asset Selection**: A searchable list of assets (BTC, ETH, etc.) to add to the system-wide monitored list.

#### 3.1.2. Pair Analysis
- **Historical Price Chart**: Interactive price chart showing historical data (using candles from `info.candles`).
- **Trend Details**: Detailed breakdown of the current trend status and duration.
- **Asset Statistics**: Display key metrics such as 24h volume, open interest, and funding rate (from `info.metaAndAssetCtxs`).

#### 3.1.3. Asset Management & Configuration
- **Global Pair Configuration**: A dedicated settings area to manage the system-wide list of tracked coins.
- **Bulk Selection**: Interface to quickly add or remove multiple pairs from Hyperliquid's available perpetual markets.
- **Persistence**: All configurations are saved to the `monitored_pairs` table in Supabase.

#### 3.1.4. User Authentication & Profile
- **Supabase Auth**: Users can sign up to manage their personal settings (like webhooks).
- **Wallet Integration**: Support for connecting Web3 wallets (MetaMask, Rabby) to monitor user-specific data.
- **Notification History**: View a personal log of past automated alerts triggered by trend flips.
- **Profile Settings**: Configure and test the Discord Webhook URL for personal notifications.

### 3.2. Server Scripts (Workers)

#### 3.2.1. Automated Trend Worker
- **Triggering Mechanisms**: The worker can be triggered via:
    - **API Calls**: Dedicated server endpoints (e.g., for manual triggers or external webhooks).
    - **Nuxt Cron**: Scheduled execution using Nuxt's built-in task scheduling/cron capabilities.
    - **Bash Command**: Direct execution from the command line (e.g., for manual maintenance or CI/CD integration).
- **Sequential Update Logic**: For each timeframe (Daily, Weekly), the worker identifies the coin in `monitored_pairs` that has the oldest trend record (or no record) in the `trends` table. It prioritizes coins where the `created_at` of the referenced `last_trend_flip_[timeframe]_id` is the oldest, ensuring that pairs which have maintained a trend the longest (or have never been analyzed) are checked for potential flips.
- **Trend Analysis**: Re-calculates bullishness/bearishness based on the 200 EMA logic for the targeted timeframe using the shared library.
- **Database Synchronization**:
    - **Candle Closure Check**: Before creating a new trend entry, the worker must verify that the candle for the targeted timeframe (Daily or Weekly) is fully closed. If the candle is still active, the worker logs a debug message and skips the update for that pair/timeframe.
    - Compares the calculated trend against the most recent record in the `trends` table.
    - If a flip is detected (and the candle is closed), a new entry is inserted into the `trends` table and the corresponding `last_trend_flip_[timeframe]_id` in `monitored_pairs` is updated.
    - Updates `last_analyzed` and `last_updated` timestamps in `monitored_pairs` on every run to track activity.
- **Reliability**: Ensures that all tracked pairs are eventually updated, even with API rate limits, by focusing on the least recently updated pair.

#### 3.2.2. Alert & Notification Engine (Server-Side)
- **Predefined Alerts**: The system automatically triggers notifications for:
    - **Trend Flips**: When a pair crosses the 200 EMA on Daily or Weekly timeframes.
    - **Price Thresholds**: Significant price milestones.
- **Notification Delivery**:
    - **Discord Integration**: The server identifies all users with a configured `discord_webhook_url` and sends alerts to their respective channels.
    - **User-Specific Logs**: For every notification sent, the server logs an entry in `notification_history` referencing both the user and the specific `trend_id`.

### 3.3. Shared Features

#### 3.3.1. Hyperliquid Integration Library
- **Centralized SDK Wrapper**: A shared library used by both the UI and Server Workers to interact with Hyperliquid via `@nktkas/hyperliquid`.
- **Core Features**:
    - **Get Candles**: Fetch historical candle data for a specific pair and timeframe (e.g., "D1", "W1").
    - **Compute Current Trend**: Logic to determine the current trend (bullish/bearish) based on the 200 EMA crossover for a given pair and timeframe. This should only be computed if the trend is not already stored in the database for the current candle.
    - **Get Known Pairs**: Retrieve a list of all available perpetual pairs from Hyperliquid.
- **Data Fetching Utilities**: Standardized methods for fetching prices and market metadata.
- **Type Safety**: Common TypeScript interfaces and types for Hyperliquid data structures.

## 4. Database Schema (Supabase)

Tables use **Row Level Security (RLS)** to ensure appropriate data access. User-specific data is private to each user, while system-wide data is publicly readable.

### `profiles`
- `id`: uuid (references auth.users, primary key)
- `wallet_address`: string (optional)
- `discord_webhook_url`: string (optional, for notifications)
- `created_at`: timestamp
- **RLS Policy**: Users can only read/update their own profile.

### `monitored_pairs`
- `id`: uuid (primary key)
- `coin`: string
- `last_trend_flip_daily_id`: uuid (foreign key to trends.id, nullable)
- `last_trend_flip_weekly_id`: uuid (foreign key to trends.id, nullable)
- `last_analyzed`: timestamp (last time the trend logic was run)
- `last_updated`: timestamp (last time the record was updated)
- `created_at`: timestamp
- **RLS Policy**: Publicly readable. Only system-level processes (or admin) can update.

### `trends`
- `id`: uuid (primary key)
- `coin`: string (e.g., "BTC", "ETH")
- `timeframe`: string (e.g., "D1", "W1")
- `status`: enum ("bullish", "bearish")
- `since`: timestamp (the opening time of the candle where the trend flipped)
- `created_at`: timestamp (for history and tracking changes)
- **RLS Policy**: Publicly readable. Only system-level processes can insert.
- **Note**: This table stores the current trend and a full history of trend changes per pair and timeframe.

### `notification_history`
- `id`: uuid (primary key)
- `user_id`: uuid (foreign key to profiles.id)
- `trend_id`: uuid (foreign key to trends.id)
- `message`: text (e.g., "BTC Daily Trend flipped to bullish")
- `triggered_at`: timestamp
- **RLS Policy**: Users can only view notifications triggered for their own account. Only system-level processes can insert.
- **Note**: This table tracks which trend flips were successfully sent to which users. Metadata like coin and timeframe are found in the referenced `trends` table.

## 5. System Architecture

1.  **Market Data Layer**: The app uses a shared **Hyperliquid Integration Library** (wrapping `@nktkas/hyperliquid`) to poll for `allMids`, `l2Book`, and `candles` data.
2.  **Condition & Trend Engine**: 
    - Uses shared trend logic from the integration library to compare data against the 200 EMA.
    - Calculates bullish/bearish trends on **Daily and Weekly** timeframes. 
    - Updates the `trends` table (with history) and the latest trend reference in `monitored_pairs` if a trend flip occurs.
    - **Automated Alerts (Server-Side)**: If a trend flip is detected, the server automatically identifies users with a `discord_webhook_url` in their profile, triggers the Discord notification, and logs a unique record to `notification_history` for each user/trend combination.
3.  **Server-Side Trend Worker**: A background process (via Nitro/Server API) that cycles through monitored pairs in `monitored_pairs`, identifying targets based on the oldest `created_at` values for each timeframe in the `trends` table. It verifies candle closure before committing any flips, fetches fresh data via the shared library, and updates the `trends` table and `monitored_pairs` references when flips occur. This worker can be triggered through API endpoints, scheduled Nuxt cron tasks, or direct bash commands.
4.  **Persistence Layer**: Supabase handles all system and user-specific data, ensuring monitored states and alerts remain persistent.
5.  **Wallet Layer**: Uses the `ExchangeClient` (if trading features are added later) and `InfoClient` for read-only user account data.
