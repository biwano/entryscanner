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
- **State Management**: TanStack Query (for managed polling and data fetching) and Pinia (for UI state).
- **Package Manager**: pnpm

## 3. Core Features

### 3.1. UI Pages

#### 3.1.1. Dashboard

- **Monitored Pairs View**: Display all system-wide monitored pairs (where `active` is `true`) with their current trend status.
- **Subscription Management**: Users can subscribe/unsubscribe to specific pair/timeframe combinations (e.g., BTC/Daily, ETH/Weekly) to receive personalized notifications.
- **Trend Indicators**:
  - **Bullish/Bearish Status**: Visual indicator of the current trend based on 50 SMA crossover on **Daily (D1) and Weekly (W1)** timeframes.
  - **Trend Duration**: Show since when the pair turned bullish or bearish (timestamp/relative time).
  - **Sorting**: Pairs are sorted by how long they have been in their current trend (ascending order - showing most recent trend changes first).
- **Navigation**: Click on any pair to open the **Pair Analysis** view.
- **Price Ticker**: Display live-polled prices for all active perpetual assets on Hyperliquid.
- **Manage Assets**: Link to the **Asset Management** settings to add or remove monitored pairs.

#### 3.1.2. Pair Analysis

- **Historical Price Chart**: Interactive price chart showing historical data (using candles from `info.candles`). The system displays exactly **400 candles** regardless of the timeframe (Daily or Weekly) to ensure a consistent view. Users can switch between **Daily (D1)** and **Weekly (W1)** timeframes by clicking the corresponding trend status badges. The chart displays two simple moving averages:
  - **SMA 50**: Used for trend flip triggers and primary visualization.
  - **SMA 200**: Provided for additional technical context.
- **Trend Details**: Detailed breakdown of the current trend status and duration.
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
- **Nuxt Cron**: Scheduled execution using Nuxt's built-in task scheduling/cron capabilities.
- **Bash Command**: Direct execution from the command line (e.g., for manual maintenance or CI/CD integration).

#### 3.2.2. Automated Trend Worker

- **Sequential Update Logic**: For each timeframe (Daily, Weekly), the worker identifies the coin in `monitored_pairs` that has the oldest trend record (or no record) in the `trends` table. It prioritizes coins where the `created_at` of the referenced `last_trend_flip_[timeframe]_id` is the oldest, ensuring that pairs which have maintained a trend the longest (or have never been analyzed) are checked for potential flips.
- **Simplified Processing Flow**:
  1.  **Get Candles**: Fetch the last 400 candles for the coin and timeframe.
  2.  **Check Database**: Verify if a record already exists in the `trends` table for the last closed candle's timestamp (`since`).
  3.  **Trend Calculation**: If no record exists, run the `determineTrend` logic using the fetched candles.
  4.  **Entry Creation**: Create a new entry in the `trends` table for the current candle.
  5.  **Database Synchronization**: Update the corresponding `last_trend_flip_[timeframe]_id` in `monitored_pairs` if the calculated trend status represents a flip from the previous state.
  6.  **Activity Tracking**: Update `last_analyzed` and `last_updated` timestamps in `monitored_pairs` on every run.
- **Reliability**: Ensures that all tracked pairs are eventually updated, even with API rate limits, by focusing on the least recently updated pair.

#### 3.2.3. Alert & Notification Engine (Server-Side)

- **Notification Dispatcher Worker**: The primary background process responsible for sending alerts. It ensures reliability by:
  - **Gap Analysis**: Periodically comparing entries in the `trends` table against `notification_history` for each user's `user_subscriptions`.
  - **Delivery Logic**: Identifying users who are subscribed to a specific pair/timeframe that experienced a trend flip but do not yet have a corresponding entry in `notification_history` for that `trend_id`.
  - **Execution**: Sending the Discord notifications to the users' configured webhooks and logging the successful delivery to `notification_history`.

### 3.3. Shared Features

#### 3.3.1. Hyperliquid Integration Library

- **Centralized SDK Wrapper**: A shared library used by both the UI and Server Workers to interact with Hyperliquid via `@nktkas/hyperliquid`.
- **Class-Based Implementation**: The logic is encapsulated in a `HyperliquidClient` class within `shared/hyperliquid.ts`, providing a clean interface for data fetching and trend computation.
- **Core Features**:
  - **Get Candles**: Fetch historical candle data for a specific pair and timeframe (e.g., "D1", "W1"). The system should always request enough data to provide exactly **400 candles** for consistent visualization and analysis.
  - **Compute Current Trend**: Logic to determine the current trend (bullish/bearish) based on the **50 SMA** crossover for a given pair and timeframe. This function returns `null` if no candle data is available.
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

- `id`: uuid (primary key)
- `coin`: string
- `active`: boolean (default: true, used to toggle monitoring without deletion)
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
    - Uses shared trend logic from the integration library to compare data against the 50 SMA.
    - Calculates bullish/bearish trends on **Daily and Weekly** timeframes.
    - Updates the `trends` table (with history) and the latest trend reference in `monitored_pairs` if a trend flip occurs.
    - **Notification Dispatcher**: A background worker that compares `trends` against `notification_history` for all `user_subscriptions` and sends pending alerts to ensure full delivery reliability.
3.  **Server-Side Workers**: Background processes (via Nitro/Server API) that cycle through monitored pairs (Trend Worker) and notification gaps (Dispatcher). These workers can be triggered through API endpoints, scheduled Nuxt cron tasks, or direct bash commands.
4.  **Persistence Layer**: Supabase handles all system and user-specific data, ensuring monitored states and alerts remain persistent.
5.  **Market Integration**: Uses the `InfoClient` for real-time market data retrieval.
