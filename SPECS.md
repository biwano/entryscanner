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

#### 3.1.0. Dashboard

The Dashboard provides a high-level overview of the most recent significant market shifts and the user's personal trading status if connected.

- **Personal Trading Summary**: If the user has configured their Hyperliquid API key and wallet address, display a summary card at the top of the dashboard containing:
  - **Account Value**: Total equity in USD.
  - **Open Positions**: A table showing active perpetual positions (Asset, Size, Entry Price, Mark Price, PnL). This table is only displayed if the user has active positions.
  - **Open Orders**: A table showing active limit/trigger orders (Asset, Side, Size, Price). This table is only displayed if the user has pending orders.
  - **No Active Trades**: If neither positions nor orders are present, a "No active trades" message is displayed within the card.
  - **Navigation**: A "Full View" button is displayed on the dashboard that links to the **Trading** page.
- **Trend Flip Tables**: Two primary tables showing recent market shifts:
  - **Last 5 Weekly Flips**: Shows the 5 most recent pairs that flipped to either bullish or bearish trend on the Weekly (W1) timeframe (one flip per coin). Display the percentage of all monitored pairs that are currently bullish/bearish with a small visual indicator.
  - **Last 5 Daily Flips**: Shows the 5 most recent pairs that flipped to either bullish or bearish trend on the Daily (D1) timeframe (one flip per coin). Display the percentage of all monitored pairs that are currently bullish/bearish with a small visual indicator.

**Table Columns (Trend Flips)**:

- **Asset**: The name of the perpetual pair (with icon).
- **Price**: Current live-polled price.
- **Status**: Visual indicator of the current trend (Bullish/Bearish) and since when it flipped.
- **Action**: Button to navigate to the detailed **Pair Analysis** view.

#### 3.1.1. Monitored Pairs

This page provides a comprehensive view of all active assets being tracked by the system.

- **Monitored Pairs View**: Display all system-wide monitored pairs (where `active` is `true`) with their current trend status. The table (implemented using `UTable`) includes the following columns:
  - **Asset**: The name of the perpetual pair (e.g., BTC, ETH).
  - **Price**: Current live-polled price for the asset.
  - **Daily (D1)**: Bullish/Bearish status and duration for the daily timeframe.
  - **Daily Change %**: The **% price change since the daily trend started**. This column is sortable.
  - **Weekly (W1)**: Bullish/Bearish status and duration for the weekly timeframe.
  - **Weekly Change %**: The **% price change since the weekly trend started**. This column is sortable.
  - **Last Analyzed**: Relative time since the pair was last processed by the trend worker.
  - **Action**: Options to toggle subscriptions and navigate to detailed analysis.
- **Filtering**: A search input allows users to filter the list of monitored pairs by their name (e.g., searching for "ETH" will show all pairs containing "ETH"). This filter works in conjunction with sorting and pagination.
- **Data Refresh**: The monitored pairs table data is automatically reloaded every minute using **TanStack Query**'s polling capabilities (`refetchInterval`) to ensure users are viewing the most up-to-date market information and trend statuses. The time of the last update is displayed to the user for transparency.
- **Subscription Management**: Users can subscribe/unsubscribe to specific pair/timeframe combinations (e.g., BTC/Daily, ETH/Weekly) to receive personalized notifications.
  - **Bulk Subscription**: Dedicated buttons on the dashboard to "Subscribe to All" or "Unsubscribe from All" alerts for all currently monitored pairs and timeframes.
- **Trend Indicators**:
  - **Bullish/Bearish Status**: Visual indicator of the current trend based on SMA 50 crossover on **Daily (D1) and Weekly (W1)** timeframes.
  - **Trend Duration**: Show since when the pair turned bullish or bearish (using the `since` column from the `events` table).
  - **Sorting**: Users can change the table sort order by clicking on the column headers. The table supports sorting by any column in both ascending and descending order. By default, pairs are sorted by how long they have been in their current trend (most recent changes first, based on `events.since`). The user's preferred sort configuration is saved in the browser's local storage and persists across page reloads.
- **Pagination & Stats**: The table includes pagination (10 items per page). The current page is reflected in the URL via a `page` query parameter (e.g., `?page=2`), allowing users to bookmark or share specific pages of the monitored pairs list. The total number of monitored pairs is displayed near the pagination controls for quick reference.
- **Navigation**: Click on any pair to open the **Pair Analysis** view. Clicking on **Daily (D1)** or **Daily Change %** columns navigates to the pair analysis with the **Daily** timeframe selected. Clicking on **Weekly (W1)** or **Weekly Change %** columns navigates to the pair analysis with the **Weekly** timeframe selected.
- **Price Ticker**: Display live-polled prices for all active perpetual assets on Hyperliquid.
- **Manage Assets**: Link to the **Asset Management** settings to add or remove monitored pairs.

#### 3.1.2. Pair Analysis

- **Navigation**: Supports deep linking via a `timeframe` query parameter (e.g., `?timeframe=1d` or `?timeframe=1w`) to set the initial view.
- **Header Section**: Displays the asset name (with icon), current live price, and a title that includes the **% price change since the current trend started** for daily and weekly timeframes.
- **Trading Controls**: If the user has a valid Hyperliquid API key configured, and has no open position for the current coin, display trading controls:
  - **Directional Buttons**: "Buy" or "Sell" buttons. The default recommendation (visual emphasis) is based on whether the current timeframe trend is bullish (Buy) or bearish (Sell).
  - **Take Profit Price Input**: An optional numerical input field for the `take_profit_price`.
  - **Take Profit % Input**: A numerical input field for the `take_profit_pct` (default: **50**).
  - **Stop Loss % Input**: A numerical input field for the `stop_loss_pct` (default: **10**).
  - **Action**: Clicking "Buy" or "Sell" validates the inputs, automatically calculates the **Notional Size** based on the account value and a target leverage (9.5x if the coin supports 10x, otherwise 95% of the coin's maximum leverage), creates or updates a record in the `user_trades` table (setting status to `requested`), and triggers the **Trader Hook**.
  - **Leverage Rules**:
    - **Default Leverage**: 9.5x.
    - **Max Leverage Handling**: If the coin does not support 10x leverage, set it to **95% of the coin's maximum leverage**.
  - **Max Leverage Display**: The trade form displays the maximum leverage supported by the specific coin for user awareness.
  - **Price Display**: Always display at least **4 significant digits** for prices across the application (charts, tables, inputs, and logs).
- **Historical Price Chart**: Interactive price chart showing historical data (using candles from `info.candles`). The system displays exactly **400 candles** regardless of the timeframe (Daily or Weekly) to ensure a consistent view. Users can switch between **Daily (D1)** and **Weekly (W1)** timeframes by clicking the corresponding **TrendIndicator** components in the header. The chart displays two simple moving averages:
  - **SMA 50**: Used for trend flip triggers and primary visualization.
  - **SMA 200**: Provided for additional technical context.
- **Trend Visual Markers**: The price chart displays vertical markers for all trend flips (SMA 50 crossover) that occurred within the displayed 400 candles. Bullish flips are marked with a success color (green), and bearish flips with an error color (red).
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
- **Password Reset functionality**:
  - **Request Reset**: Users can initiate a password reset through the auth UI.
  - **Reset Password View**: Redirects directly to `/auth/reset-password` to exchange the `code` for a session. It assumes any auth code exchange on this page is for a password reset flow and presents the new password form. If the code exchange fails, an error message is displayed to the user.
- **Supabase Auth**: Secure authentication flow for managing personal settings, subscriptions, and webhooks.
- **Subscription Overview**: View and manage all active pair/timeframe subscriptions from the profile or dashboard.
- **Notification History**: View a personal log of past automated alerts triggered by trend flips for subscribed pairs.
- **Profile Settings**: Configure the Discord Webhook URL for personal notifications and manage Hyperliquid credentials.
- **Hyperliquid Integration**: Allow users to securely save their Hyperliquid wallet address (for read-only info requests) and their Hyperliquid API key (private key) for more advanced monitoring and potentially trading actions. These fields are accessible in the profile settings and allow displaying account info in the header and dashboard.

#### 3.1.5. Global Navigation & Search

- **Coin Search Bar**: A global search input is available in the top menu, allowing users to quickly search for any perpetual pair by its name (e.g., BTC, ETH).
- **Direct Navigation**: Upon selecting a coin from the search results, the user is navigated directly to that asset's **Pair Analysis** page.
- **Available Pairs**: The search bar pulls its list from all currently active perpetual pairs available on Hyperliquid.
- **Mobile Access**: The search bar is accessible on both desktop and mobile devices.

#### 3.1.6. Privacy Mode

- **Global Toggle**: A privacy mode toggle is available in the top menu (near the dark mode button), allowing users to hide sensitive wallet and trade information.
- **Privacy Component**: A reusable `Private` component wraps sensitive data and shows a placeholder when privacy mode is active.
- **Persistence**: The privacy mode state is persisted across page reloads in the browser's local storage.

#### 3.1.7. Trading Page

A dedicated view for managing personal Hyperliquid assets and trades, accessible via the main navigation only if the user has a valid Hyperliquid API key configured.

- **Access Restriction**: This page is hidden in the main navigation and restricted via a redirect if the user has not entered their Hyperliquid API key in the Profile Settings. If an API key is present but a wallet address is missing, a message is displayed to the user.
- **Trader Status & Logs**: If the user has an active trade (status is not `sleeping` in `user_trades`), display:
  - **Current Status**: The status from the `user_trades` table.
  - **Activity Logs**: A scrollable log of recent activities from the **Trader Hook** (persisted in `localStorage`).
  - **Account Performance**: Overview of the total account value, equity, and maintenance margin.
  - **Active Trade Card**: A summary card showing the current state of active perpetual positions and open orders, including the **real-time price** of the traded coin(s). The "Full View" button is hidden on this page as it's the target destination.
  - **Detailed Asset Breakdown**:
    - **Open Positions**: Comprehensive table of all active perpetual positions with real-time PnL calculation.
    - **Open Orders**: Detailed list of pending orders with the ability to see status and types. Users can edit a trade's parameters (Take Profit and Stop Loss prices) via a pen icon in the open orders table header (only visible when in `exit_setup` status). The edit modal is pre-filled with the actual trigger prices from the open orders on Hyperliquid, falling back to the values stored in the database if no orders are found. This action updates the `user_trades` table and sets the status to `entry_setup`, which triggers the trader hook to cancel existing trigger orders and place new ones based on the updated configuration.
    - **Recent Trades**: A table displaying the recent closed trades for the user's account, including:
    - **Asset**: The name of the perpetual pair (with icon).
    - **Leverage**: The leverage used for the trade.
    - **Entry**: Date and time of entry, and entry price.
    - **Exit**: Date and time of exit, and exit price.
    - **PnL**: The realized profit or loss for the trade.
    - **Pagination**: Display 5 trades per page with pagination controls.
- **Real-Time Data**: The trading view uses polling to ensure account data and position statuses are kept up to date.

### 3.2. Server Scripts (Workers)

#### 3.2.1. Common Triggering Mechanisms

All server-side workers (Trend Worker, Notification Dispatcher) can be triggered via:

- **API Calls**: Dedicated server endpoints (e.g., for manual triggers or external webhooks).
- **Bash Command**: Direct execution from the command line (e.g., for manual maintenance or CI/CD integration).

#### 3.2.2. Automated Trend Worker

- **Systematic Update Logic**: The worker runs frequently (e.g., every minute) to ensure data is up-to-date. For each run, it identifies the coin in `monitored_pairs` that has the oldest `last_analyzed` timestamp (or no record). It then processes ALL supported timeframes (Daily "D1" and Weekly "W1") for that specific coin in a single execution. This ensures that a coin's trend status is kept consistent across all timeframes. All trend-related timestamps (`trends.timestamp`, `events.timestamp`, `events.since`) represent the **closing time** of the relevant candle.
- **Simplified Processing Flow**:
  1.  **Select Coin**: Pick the least recently analyzed active coin from `monitored_pairs`.
  2.  **Iterate Timeframes**: For each timeframe (D1, W1):
      a. **Get Candles**: Fetch the last 400 candles for the coin and timeframe.
      b. **Trend Calculation**: Run the `determineTrend` logic using the fetched candles (SMA 50 crossover). This returns both the current trend and the `since` timestamp (close time of the candle where the trend flipped).
      c. **Trend Update**: Update the single row in the `trends` table for the coin/timeframe (upsert with uniqueness on `coin` and `timeframe`). Set `timestamp` to the closing time of the latest analyzed closed candle.
      d. **Event Creation**: If the calculated trend status represents a flip from the previous state (or if it's the first record), create a new record in the `events` table.
      - `since`: The closing time of the candle where the trend flipped (from `determineTrend`).
      - `timestamp`: The closing time of the latest closed candle at the time of detection.
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

### 3.3. Client-Side Hooks & Logic

#### 3.3.1. Trader Hook (Client-Side)

- **Execution**: Runs on a **10-second interval** while the application is open (started from `app.vue`), and whenever triggered explicitly by the UI (e.g. starting a trade, saving the **Edit Trade** modal).
- **State Management**: The hook provides the handlers with all necessary real-time market data (Meta, Prices) and account states (Clearinghouse, Positions) via the context. Handlers do not fetch these states independently.
- **Modular Logic**: The logic for each trade status is decoupled into individual handler files for better maintainability and testability.
- **Logic Strategy**: Processes records in the `user_trades` table for the authenticated user based on their `status`:
  - **`requested`** (Handled in `requested.ts`):
    - Sets leverage for the specific coin. If the coin supports 10x leverage, it sets it to **9.5x**. If not, it sets it to **95% of the coin's maximum leverage**.
    - Places a limit order very close to the current market price (calculated using `allMids` from the context).
    - Updates status to **`entry_setup`** in Supabase and refreshes the active trade state.
  - **`entry_setup`** (Handled in `entrySetup.ts`):
    - When an open position exists for the trade’s coin: fetches open orders, **cancels existing trigger (TP/SL) orders** for that coin, then places a new **Stop Loss** and **Take Profit** trigger pair.
    - The **Edit Trade** flow (`EditTradeModal.vue`) also cancels **all** open orders for that coin before resetting the row to `entry_setup` and **awaiting** `processTrade()`, so entry limits are cleared before SL/TP are re-placed.
    - Checks if the user has an open position for the coin via the account state provided in the context.
    - If a position is found:
      - Creates a **Stop Loss** order (manual `stop_loss_price` if set; otherwise from `stop_loss_pct` and the **actual position leverage**).
      - Creates a **Take Profit** order using `take_profit_price` when set; otherwise from `take_profit_pct` and the **actual position leverage**.
      - Updates status to **`exit_setup`** in Supabase and refreshes the active trade state.
  - **`exit_setup`** (Handled in `exitSetup.ts`):
    - Checks if the position has been closed (using the account state from the context).
    - If the position is closed, updates status to **`sleeping`** in Supabase and refreshes the active trade state.
- **Activity Logging**: Maintains a persistent activity log (stored in **`localStorage`**) of all actions, successes, and failures. This ensures logs are preserved across page refreshes and are accessible via the Trading page.
- **Concurrency**: `processTrade` is guarded by a **module-level mutex** so the 10s interval and UI triggers (e.g. **Edit Trade**, **Buy/Sell**) never run two handler chains at once—preventing duplicate SL/TP placement when status is still `entry_setup`. UI actions **await** `processTrade()` after mutating `user_trades`.
- **Persistence errors**: Status transitions in handler modules check Supabase `.update` results and throw on failure (surfaced via the hook’s toast) so a failed `exit_setup` update cannot leave the app silently stuck re-placing orders every poll.

#### 3.3.2. Active Trade Hook (Client-Side)

- **Purpose**: Provides a reactive state for the current active trade from the `user_trades` table.
- **Features**:
  - **Manual Refresh**: Instead of continuous polling, the hook provides a `refresh` function that should be called after any action that modifies the trade status (e.g., starting a trade or processing a trade step). This ensures the UI remains consistent with the backend state without unnecessary network traffic.
  - **Trade Management**: Exposes an `updateTrade` function to genericly update a record in the `user_trades` table (e.g., starting a new trade, or changing target prices).
  - **Shared State**: Uses `useAsyncData` with a consistent key to share the active trade data across multiple components (e.g., `TradingControls`, `TraderStatus`, `TradingPage`).

### 3.4. Shared Features

#### 3.4.1. Hyperliquid Integration Library

- **Centralized SDK Wrapper**: A shared library used by both the UI and Server Workers to interact with Hyperliquid via `@nktkas/hyperliquid`.
- **Class-Based Implementation**: The logic is encapsulated in a `HyperliquidClient` class within `shared/hyperliquid.ts`, providing a clean interface for data fetching and trend computation.
- **Core Features**:
  - **Get Candles**: Fetch historical candle data for a specific pair and timeframe (e.g., "D1", "W1"). The system should always request enough data to provide exactly **400 candles** for consistent visualization and analysis.
  - **Compute Current Trend**: Logic to determine the current trend (bullish/bearish) based on the **SMA 50** crossover for a given pair and timeframe. This function returns both the current status and the `since` timestamp (start of the current trend).
  - **Get Known Pairs**: Retrieve a list of all available perpetual pairs from Hyperliquid.
- **Data Fetching Utilities**: Standardized methods for fetching prices and market metadata.
- **Type Safety**: Common TypeScript interfaces and types for Hyperliquid data structures.

#### 3.4.2. UI Formatting Utilities

- **Shared Formatting Logic**: Centralized formatting functions located in `app/utils/format.ts` for consistent UI representation.
- **Price Formatting**: `formatPrice` handles USD currency formatting for asset prices.
- **Volume Formatting**: `formatVolume` uses compact notation (e.g., "1.2M") for trading volumes and open interest.
- **Time Formatting**: `formatTime` handles ISO string to "MM/DD HH:mm:ss" conversion using `dayjs`.

#### 3.4.3. Shared UI Components

- **AppHeader**: A global header component that manages the navigation menu, search bar, and user profile/wallet information. It dynamically adjusts its menu items based on the user's authentication status (changing "Profile" to "Login"), roles (admin), and wallet connection status.
- **AccountSummary**: Displays a user's Hyperliquid account metrics (Total Account Value, Margin Used, Maintenance Margin, Withdrawable) in a grid of summary cards.
- **GlobalSearch**: A search input that allows users to quickly search for any perpetual pair and navigate to its analysis page.
- **WalletInfo**: Displays the connected wallet address and basic account information. The wallet address is copyable to the clipboard on click, providing visual feedback (e.g., icon change and "Copied!" tooltip).
- **PairHeader**: A component for the Pair Analysis page that displays the asset name, percentage change since trend start, status badges, timeframe selectors with trend indicators, and the live price.
- **TrendIndicator**: A reusable component for showing bullish or bearish trend status and its duration.
- **Chart**: An interactive price chart component for visualizing historical candle data and technical indicators.
- **Private**: A utility component that conditionally renders its content or a placeholder state based on the user's privacy mode setting. This is used to hide sensitive wallet and trade information.

## 4. Database Schema (Supabase)

Tables use **Row Level Security (RLS)** to ensure appropriate data access. User-specific data is private to each user, while system-wide data is publicly readable.

### `profiles`

- `id`: uuid (references auth.users, primary key)
- `discord_webhook_url`: string (optional, for notifications)
- `hl_api_key`: string (optional, for wallet actions)
- `hl_wallet_address`: string (optional, for wallet info requests)
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
- `timestamp`: timestamp (the closing time of the last closed candle analyzed)
- `price_at_flip`: decimal (the closing price of the candle where the current trend flipped)
- **Primary Key**: `(coin, timeframe)`
- **RLS Policy**: Publicly readable. Only system-level processes can insert/update.
- **Note**: This table stores the _current_ trend for each pair and timeframe. There is only one row per coin/timeframe couple. Uniqueness is ensured by the composite primary key.

### `events`

- `id`: uuid (primary key)
- `coin`: string
- `timeframe`: string
- `status`: enum ("bullish", "bearish")
- `timestamp`: timestamp (the closing time of the latest closed candle at detection)
- `since`: timestamp (the closing time of the candle where the trend flipped)
- `price_at_flip`: decimal (the closing price of the candle where the trend flipped)
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

### `user_trades`

- `id`: uuid (references auth.users, primary key)
- `coin`: string (nullable)
- `take_profit_price`: decimal (nullable)
- `stop_loss_price`: decimal (nullable)
- `take_profit_pct`: decimal (default: 50)
- `stop_loss_pct`: decimal (default: 10)
- `status`: enum ("requested", "entry_setup", "exit_setup", "sleeping")
- `direction`: string ("long", "short", nullable)
- `created_at`: timestamp
- `updated_at`: timestamp
- **RLS Policy**: Users can only read/update their own trade configuration.
- **Initialization**: Automatically initialized for every new user with status `sleeping` via the `handle_new_user` trigger.

## 5. System Architecture

1.  **Market Data Layer**: The app uses a shared **Hyperliquid Integration Library** (wrapping `@nktkas/hyperliquid`) to poll for `allMids`, `l2Book`, and `candles` data.
2.  **Condition & Trend Engine**:
    - Uses shared trend logic from the integration library to compare data against the SMA 50.
    - Calculates bullish/bearish trends on **Daily and Weekly** timeframes.
    - Updates the `trends` table (single row per coin/timeframe) and creates an entry in `events` if a trend flip occurs.
    - **Notification Dispatcher**: A background worker that identifies new `events` for which the user hasn't been notified (based on `created_at` value comparison with last notification) and sends alerts.
    - **Trader Hook (Client-Side)**: A Nuxt composable that periodically polls for `user_trades` and executes trade actions directly from the browser using the user's API key. Activity logs are persisted in `localStorage`. Provides real-time visual feedback via toast notifications when trade steps are completed or errors occur.
    - **Active Trade Hook (Client-Side)**: A Nuxt composable (`useActiveTrade`) that provides real-time access to the current user's active trade status, including automated polling while a trade is in progress.
    - **Trade Edition**: When editing a trade (e.g., from the open orders table), the system updates the `take_profit_price` and `stop_loss_price` columns in `user_trades` and resets the `status` to `entry_setup`. The `Trader Hook` then re-processes the trade, cancelling existing trigger orders and placing new ones based on the updated configuration.
    - **UI Toasts**: Global toast notification system (via Nuxt UI `useToast`) used to provide immediate feedback on trade requests and automated trade status transitions.
3.  **Server-Side Workers**: Background processes (via Nitro/Server API) that cycle through monitored pairs (Trend Worker) and events (Dispatcher). These workers can be triggered through API endpoints or direct bash commands.
4.  **Persistence Layer**: Supabase handles all system and user-specific data, ensuring monitored states and alerts remain persistent.
5.  **Market Integration**: Uses the `InfoClient` for real-time market data retrieval.
