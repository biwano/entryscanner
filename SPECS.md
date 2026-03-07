# Specifications: Entry scanner

## 1. Project Overview

Entry scanner is a web-based application that monitors real-time market data on the Hyperliquid decentralized exchange and triggers automated alerts based on predefined conditions (Trend Flips, Price milestones).

## 2. Technical Stack

- **Frontend**: Nuxt 4 (Vue.js) with Nuxt UI (using a **Fuchsia** primary theme and Tailwind CSS).
- **Hyperliquid SDK**: `@nktkas/hyperliquid` (TypeScript SDK) wrapped in a custom shared library.
- **Database/Backend**: Supabase (PostgreSQL for storage, Supabase Auth for users).
- **Authentication UI**: `@supa-kit/auth-ui-vue` for managing the login and registration flows.
- **Data Fetching**: Polling via Hyperliquid's `InfoClient` (using standardized shared utilities).
- **Coding Standards**:
  - **No `any`**: The `any` type is strictly forbidden. Use proper interfaces or `unknown` with type guards.
  - **No Typecasting**: Avoid `as` type assertions. Use type guards or properly defined types from the database schema.
- **Architecture (Feature-Slice Design)**:
  - **Pages (`/app/pages`)**: Orchestrate the layout and combine multiple features to form a complete view. Pages handle routing and high-level data orchestration.
  - **Features (`/app/features`)**: Small, focused, and self-contained units of functionality. A feature is a granular piece of the UI and logic (e.g., `MonitoredPairsList`, `PriceChart`, `AssetToggle`). Features should be reusable where possible.
- **Relative Time**: Use `dayjs` for date manipulation and relative time formatting across the application.
- **Package Manager**: pnpm

## 3. Core Features

### 3.1. UI Pages

#### 3.1.1. Dashboard

  - **Monitored Pairs View**: Display all system-wide monitored pairs (where `active` is `true`) with their current trend status. The dashboard table (implemented using `UTable`) includes the following columns:
  - **Asset**: The name of the perpetual pair (e.g., BTC, ETH).
  - **Price**: Current live-polled price for the asset.
  - **Daily (D1)**: Bullish/Bearish status and duration for the daily timeframe.
  - **Weekly (W1)**: Bullish/Bearish status and duration for the weekly timeframe.
  - **Last Analyzed**: Relative time since the pair was last processed by the trend worker.
  - **Action**: Options to toggle subscriptions and navigate to detailed analysis.
- **Data Refresh**: The dashboard table data is automatically reloaded every minute using **TanStack Query**'s polling capabilities (`refetchInterval`) to ensure users are viewing the most up-to-date market information and trend statuses. The time of the last update is displayed to the user for transparency.
- **Subscription Management**: Users can subscribe/unsubscribe to specific pair/timeframe combinations (e.g., BTC/Daily, ETH/Weekly) to receive personalized notifications.
  - **Bulk Subscription**: Dedicated buttons on the dashboard to "Subscribe to All" or "Unsubscribe from All" alerts for all currently monitored pairs and timeframes.
- **Trend Indicators**:
  - **Bullish/Bearish Status**: Visual indicator of the current trend based on SMA 50 crossover on **Daily (D1) and Weekly (W1)** timeframes.
  - **Trend Duration**: Show since when the pair turned bullish or bearish (using the `since` column from the `events` table).
  - **Sorting**: Users can change the dashboard table sort order by clicking on the column headers. The table supports sorting by any column in both ascending and descending order. By default, pairs are sorted by how long they have been in their current trend (most recent changes first, based on `events.since`). **The user's preferred sort configuration is saved in the browser's local storage and persists across page reloads.**
- **Navigation**: Click on any pair to open the **Pair Analysis** view.
- **Price Ticker**: Display live-polled prices for all active perpetual assets on Hyperliquid.
- **Manage Assets**: Link to the **Asset Management** settings to add or remove monitored pairs.

#### 3.1.2. Pair Analysis

- **Historical Price Chart**: Interactive price chart showing historical data (using candles from `info.candles`). The system displays exactly **400 candles** regardless of the timeframe (Daily or Weekly) to ensure a consistent view. Users can switch between **Daily (D1)** and **Weekly (W1)** timeframes by clicking the corresponding trend status badges. The chart displays two simple moving averages:
  - **SMA 50**: Used for trend flip triggers and primary visualization.
  - **SMA 200**: Provided for additional technical context.
- **Trend Details**: Detailed breakdown of the current trend status and duration (using the `since` column from the `events` table).
- **Asset Statistics**: Display key metrics such as 24h volume, open interest, and funding rate (from `info.metaAndAssetCtxs`).

#### 3.1.3. Asset Management & Configuration

- **Admin Only Access**: This area is restricted to users with the `admin` role in the `user_system` table.
- **Global Pair Configuration**: A dedicated settings area to manage the system-wide list of tracked coins.
- **Searchable Asset Universe**: Users can search through all perpetual pairs available on Hyperliquid (fetched from `info.meta`).
- **Pair Selection**: A grid or list interface allowing users to toggle (select/deselect) which pairs are monitored by the system.
- **Persistence & Toggle**: When a pair is no longer monitored, it is not deleted from the database. Instead, an `active` boolean flag is toggled to `false`.
- **Bulk Management**: Capabilities to quickly add or remove multiple pairs from the active monitoring list.
- **Persistence**: All configurations are saved to the `monitored_pairs` table in Supabase.

#### 3.1.4. User Authentication & Profile

- **Supabase Auth UI**: Uses `@supa-kit/auth-ui-vue` with the **Supa theme** to provide a standardized login/registration interface.
- **Email-Based Authentication**: Users can sign up and sign in using their email address and password via Supabase Auth.
- **Supabase Auth**: Secure authentication flow for managing personal settings, subscriptions, and webhooks.
- **Subscription Overview**: View and manage all active pair/timeframe subscriptions from the profile or dashboard.
- **Notification History**: View a personal log of past automated alerts triggered by trend flips for subscribed pairs.
- **Profile Settings**: Configure and test the Discord Webhook URL for personal notifications.

### 3.2. Server Scripts (Workers)

#### 3.2.1. Common Triggering Mechanisms

All server-side workers (Trend Worker, Notification Dispatcher) can be triggered via:

- **API Calls**: Dedicated server endpoints (e.g., for manual triggers or external webhooks).
- **Bash Command**: Direct execution from the command line (e.g., for manual maintenance or CI/CD integration).

#### 3.2.2. Automated Trend Worker

- **Systematic Update Logic**: The worker runs frequently (e.g., every minute) to ensure data is up-to-date. For each run, it identifies the coin in `monitored_pairs` that has the oldest `last_analyzed` timestamp (or no record). It then processes ALL supported timeframes (Daily "D1" and Weekly "W1") for that specific coin in a single execution. This ensures that a coin's trend status is kept consistent across all timeframes.
- **Simplified Processing Flow**:
  1.  **Select Coin**: Pick the least recently analyzed active coin from `monitored_pairs`.
  2.  **Iterate Timeframes**: For each timeframe (D1, W1):
      a. **Get Candles**: Fetch the last 400 candles for the coin and timeframe.
      b. **Trend Calculation**: Run the `determineTrend` logic using the fetched candles (SMA 50 crossover). This returns both the current trend and the `since` timestamp (start of the trend).
      c. **Trend Update**: Update the single row in the `trends` table for the coin/timeframe (upsert with uniqueness on `coin` and `timeframe`). Set `timestamp` to the latest closed candle.
      d. **Event Creation**: If the calculated trend status represents a flip from the previous state (or if it's the first record), create a new record in the `events` table.
      - `since`: The opening time of the candle where the trend flipped (from `determineTrend`).
      - `timestamp`: The opening time of the latest closed candle at the time of detection.
        e. **Database Synchronization**: Update the corresponding `last_trend_flip_[timeframe]_id` in `monitored_pairs` with the new `event_id`.
  3.  **Activity Tracking**: Update `last_analyzed` and `last_updated` (if any flip occurred) timestamps in `monitored_pairs` after all timeframes are processed.
- **Reliability**: Ensures that all tracked pairs are systematically updated across all timeframes, preventing data staleness in any specific interval.

#### 3.2.3. Alert & Notification Engine (Server-Side)

- **Notification Dispatcher Worker**: The primary background process responsible for generating and sending alerts. It operates in two sequential phases:
  1.  **Notification Generation**:
      - It selects all **events** from the `events` table where `notifications_created` is `false`.
      - For each selected event:
        - It identifies all users with an active `user_subscriptions` for that specific coin and timeframe.
      - It creates new rows in `notification_history` for each of these users, referencing the `event_id`. By default, these rows have `sent_at` set to `null`.
      - Once processing is complete for the event, it marks `notifications_created` as `true` in the `events` table.
  2.  **Notification Dispatching**:
      - It selects all rows in `notification_history` where `sent_at` is `null`.
      - For each row, it sends the notification to the user's configured Discord webhook.
      - Upon successful (or attempted) delivery, it updates `sent_at` to the current timestamp.

### 3.3. Shared Features

#### 3.3.1. Hyperliquid Integration Library

- **Centralized SDK Wrapper**: A shared library used by both the UI and Server Workers to interact with Hyperliquid via `@nktkas/hyperliquid`.
- **Class-Based Implementation**: The logic is encapsulated in a `HyperliquidClient` class within `shared/hyperliquid.ts`, providing a clean interface for data fetching and trend computation.
- **Core Features**:
  - **Get Candles**: Fetch historical candle data for a specific pair and timeframe (e.g., "D1", "W1"). The system should always request enough data to provide exactly **400 candles** for consistent visualization and analysis.
  - **Compute Current Trend**: Logic to determine the current trend (bullish/bearish) based on the **SMA 50** crossover for a given pair and timeframe. This function returns both the current status and the `since` timestamp (start of the current trend).
  - **Get Known Pairs**: Retrieve a list of all available perpetual pairs from Hyperliquid.
- **Data Fetching Utilities**: Standardized methods for fetching prices and market metadata.
- **Type Safety**: Common TypeScript interfaces and types for Hyperliquid data structures.

#### 3.3.2. UI Formatting Utilities

- **Shared Formatting Logic**: Centralized formatting functions located in `app/utils/format.ts` for consistent UI representation.
- **Price Formatting**: `formatPrice` handles USD currency formatting for asset prices.
- **Volume Formatting**: `formatVolume` uses compact notation (e.g., "1.2M") for trading volumes and open interest.

## 4. Database Schema (Supabase)

Tables use **Row Level Security (RLS)** to ensure appropriate data access. User-specific data is private to each user, while system-wide data is publicly readable.

### `profiles`

- `id`: uuid (references auth.users, primary key)
- `discord_webhook_url`: string (optional, for notifications)
- `created_at`: timestamp
- **RLS Policy**: Users can only read/update their own profile.

### `user_system`

- `id`: uuid (primary key)
- `user_id`: uuid (references auth.users, unique)
- `is_admin`: boolean (default: false)
- `created_at`: timestamp
- **RLS Policy**: Publicly readable. Only administrators can update. Used to restrict access to system management features.

### `user_subscriptions`

- `id`: uuid (primary key)
- `user_id`: uuid (foreign key to profiles.id)
- `coin`: string (e.g., "BTC", "ETH")
- `timeframe`: enum ("D1", "W1")
- `created_at`: timestamp
- **RLS Policy**: Users can only manage (read/insert/delete) their own subscriptions (`user_id = auth.uid()`).

### `monitored_pairs`

- `coin`: string (primary key)
- `active`: boolean (default: true, used to toggle monitoring without deletion)
- `last_trend_flip_daily_id`: uuid (foreign key to `events.id`, nullable, **ON DELETE SET NULL**)
- `last_trend_flip_weekly_id`: uuid (foreign key to `events.id`, nullable, **ON DELETE SET NULL**)
- `last_analyzed`: timestamp (last time the trend logic was run)
- `last_updated`: timestamp (last time the record was updated)
- `created_at`: timestamp
- **RLS Policy**: Publicly readable. Only system-level processes (or admin) can update.

### `trends`

- `coin`: string (primary key component)
- `timeframe`: string (primary key component, e.g., "D1", "W1")
- `status`: enum ("bullish", "bearish")
- `timestamp`: timestamp (the opening time of the last closed candle analyzed)
- **Primary Key**: `(coin, timeframe)`
- **RLS Policy**: Publicly readable. Only system-level processes can insert/update.
- **Note**: This table stores the _current_ trend for each pair and timeframe. There is only one row per coin/timeframe couple. Uniqueness is ensured by the composite primary key.

### `events`

- `id`: uuid (primary key)
- `coin`: string
- `timeframe`: string
- `status`: enum ("bullish", "bearish")
- `timestamp`: timestamp (the opening time of the latest closed candle at detection)
- `since`: timestamp (the opening time of the candle where the trend flipped)
- `notifications_created`: boolean (default: false, indicates if notification history rows have been generated)
- `created_at`: timestamp
- **RLS Policy**: Publicly readable. Only system-level processes can insert.
- **Note**: This table stores the history of trend flips. The `since` column is used to show the trend duration in the UI.

### `notification_history`

- `id`: uuid (primary key)
- `user_id`: uuid (foreign key to profiles.id)
- `event_id`: uuid (foreign key to `events.id`, nullable, **ON DELETE SET NULL**)
- `message`: text (e.g., "BTC Daily Trend flipped to bullish")
- `sent_at`: timestamp (null if not yet sent)
- **RLS Policy**: Users can only view notifications triggered for their own account. Only system-level processes can insert.
- **Note**: This table tracks which events were successfully sent to which users. Metadata like coin and timeframe are found in the referenced `events` table.

## 5. System Architecture

1.  **Market Data Layer**: The app uses a shared **Hyperliquid Integration Library** (wrapping `@nktkas/hyperliquid`) to poll for `allMids`, `l2Book`, and `candles` data.
2.  **Condition & Trend Engine**:
    - Uses shared trend logic from the integration library to compare data against the SMA 50.
    - Calculates bullish/bearish trends on **Daily and Weekly** timeframes.
    - Updates the `trends` table (single row per coin/timeframe) and creates an entry in `events` if a trend flip occurs.
    - **Notification Dispatcher**: A background worker that identifies new `events` for which the user hasn't been notified (based on `created_at` value comparison with last notification) and sends alerts.
3.  **Server-Side Workers**: Background processes (via Nitro/Server API) that cycle through monitored pairs (Trend Worker) and events (Dispatcher). These workers can be triggered through API endpoints or direct bash commands.
4.  **Persistence Layer**: Supabase handles all system and user-specific data, ensuring monitored states and alerts remain persistent.
5.  **Market Integration**: Uses the `InfoClient` for real-time market data retrieval.
