 # Live Stream Interactive Gaming Platform

 A desktop application that bridges live streaming platforms with **Warcraft III** to create real-time interactive gameplay. Viewers influence the game through chat commands, gifts, and likes — all processed in real time and injected into the running game.

 ## Features

 - **Multi-platform live stream monitoring** — Connect to Douyin, Bilibili, Douyu, or TikTok live rooms and capture danmaku, gifts, and likes in real time.
 - **Danmaku command system** — Viewers type predefined commands (e.g. `1`, `2`) in the chat, which are forwarded to Warcraft III as in-game actions.
 - **Gift integration** — Virtual gifts trigger game effects: stat buffs, unit spawns, item drops, and special abilities across platforms.
 - **Like integration** — Viewer likes trigger lightweight in-game responses with resource rewards.
 - **Real-time OBS overlay** — Chroma-key overlay window showing live rankings, gift notifications, entrance animations, and world leaderboards for broadcast.
 - **Warcraft III auto-launcher** — Launches War3 with YDWE DLL injection, auto-resizes the window, and manages the full lifecycle.
 - **Game summary parsing** — Reads match results from War3's JASS file output after each round and syncs them to the backend.
 - **JWT authentication** — User registration and login with persistent token management across sessions.
 - **Bilibili QR authentication** — QR code login flow for Bilibili live room monitoring.
 - **Internationalization** — Full Chinese and English UI via Vue I18n.
 - **Virtual scrolling** — High-performance danmaku list rendering via vue3-virtual-scroller.
 - **Cross-platform packaging** — Build for Windows (NSIS/zip), macOS (DMG), and Linux (AppImage) via electron-builder.

 ## Tech Stack

 | Layer | Technology |
 | --- | --- |
 | **Frontend** | Vue 3 (Composition API + `<script setup>`), TypeScript, Pinia, Vue Router, Vue I18n, Axios, Sass |
 | **Build** | Vite, vue-tsc |
 | **Desktop** | Electron, electron-builder (NSIS / DMG / AppImage) |
 | **Live Stream** | bilibili-live-danmaku / bilibili-live-ws, custom Douyin WebSocket relay, blivechat Python relay |
 | **Warcraft III** | JASS file injection, YDWE DLL plugin system, C# injector (War3Injector.exe), AHK bridge |
 | **Backend** | ASP.NET Core 8, Entity Framework Core, SQL Server |
 | **DevOps** | GitHub Actions, Docker |

 ## Architecture

 ```
 ┌──────────────────────────────────────────────────────────────┐
 │                   Electron Main Process                      │
 │  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
 │  │ WindowManager│ │NetworkService│ │ BilibiliLiveService  │  │
 │  │  (2 windows) │ │  (ttwid/ua)  │ │ (WebSocket monitor) │  │
 │  └──────┬───────┘ └──────┬───────┘ └──────────┬──────────┘  │
 │         │                │                     │             │
 │  ┌──────┴────────────────┴─────────────────────┴──────────┐ │
 │  │                    ipcHandlers                          │ │
 │  │   (command/gift/like to War3, launch, overlay, auth)   │ │
 │  └──────┬─────────────────────────────────────────────────┘ │
 │         │                                                    │
 │  ┌──────┴──────────────────────┐  ┌──────────────────────┐  │
 │  │        war3.js              │  │    server.js          │  │
 │  │  JASS injection, launch     │  │  (Express SPA fallback)│  │
 │  │  injector, summary parser   │  └──────────────────────┘  │
 │  └──────┬──────────────────────┘                            │
 └─────────┼────────────────────────────────────────────────────┘
           │ IPC (contextBridge)
 ┌─────────┼────────────────────────────────────────────────────┐
 │         │           Renderer Process (Vue 3)                  │
 │  ┌──────┴──────────────────────────────────────────────────┐ │
 │  │                    Router                                │ │
 │  │   /       LoginForm.vue                                 │ │
 │  │   /main   MainView.vue                                  │ │
 │  │   /overlay Overlay.vue (chroma-key green screen)        │ │
 │  └──────┬──────────────────┬───────────────────────────────┘ │
 │         │                  │                                  │
 │  ┌──────┴──────┐   ┌──────┴──────────────┐                  │
 │  │ TopControl   │   │   Overlay           │                  │
 │  │ Panel        │   │  GiftSlideNotify    │                  │
 │  │ room, listen,│   │  RankEntryEffect    │                  │
 │  │ launch game  │   │  Top 3 + leaderboard│                  │
 │  │ manual gift  │   └─────────────────────┘                  │
 │  └──────┬───────┘                                             │
 │         │                                                     │
 │  ┌──────┴──────────────────────────────────────────────────┐ │
 │  │  Core Modules                                           │ │
 │  │  dycast, blivechat-relay, emitter, actionRequests,      │ │
 │  │  livePlatforms, model, emoji, relay, signature           │ │
 │  └─────────────────────────────────────────────────────────┘ │
 │  ┌─────────────────────────────────────────────────────────┐ │
 │  │  State & API                                            │ │
 │  │  Pinia (Auth, DanmuData) / Axios to Backend :5150       │ │
 │  └─────────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────────┘
 ```

 ### Routes

 - **`/`** — Login / register page with JWT auth. Auto-redirects to `/main` if a valid token is present.
 - **`/main`** — Primary control interface: game selector, platform control panel, danmaku list, gift records, attribute uploads.
 - **`/overlay`** — Chroma-key green screen overlay designed for OBS capture: top 3 rankings, leaderboard, gift slide notifications, entrance animations.

 ## Project Structure

 ```
 electron-vite-vue-ts/
 ├── AHK/                        # AutoHotkey War3 bridge
 │   ├── war3_bridge.ahk
 │   └── war3_bridge.exe
 ├── build/                      # electron-builder resources
 │   └── icon.png
 ├── electron/                   # Electron main process
 │   ├── main.js                 # App entry point
 │   ├── preload.js              # Context bridge (electronAPI)
 │   ├── windowManager.js        # Main + overlay windows
 │   ├── networkService.js       # Douyin ttwid / request interception
 │   ├── server.js               # Express SPA fallback
 │   ├── ipcHandlers.js          # All IPC handlers
 │   ├── war3.js                 # JASS bridge, launcher, summary parser
 │   ├── war3plugin/             # YDWE plugin DLLs
 │   │   ├── bin/                # Plugin binaries
 │   │   ├── copyDLL/            # DLL files copied to War3 dir
 │   │   └── plugin/             # yd_loader plugin root
 │   ├── bin/
 │   │   └── War3Injector.exe    # C# injector
 │   ├── services/
 │   │   ├── BiliAuthManager.js  # Bilibili QR auth
 │   │   ├── BilibiliLiveService.js  # WebSocket monitor
 │   │   └── BufferService.js    # Data buffer layer
 │   ├── ipc/
 │   │   └── command.ipc.cjs     # Command IPC module
 │   └── until/
 │       └── tools.js            # Utilities
 ├── scripts/
 │   └── dev.js                  # Custom dev runner (Vite + Electron)
 ├── src/                        # Vue 3 renderer
 │   ├── main.ts                 # App bootstrap
 │   ├── App.vue                 # Root component
 │   ├── i18n.ts                 # Vue I18n configuration
 │   ├── style.css / global.css  # Global styles
 │   ├── api/                    # Axios API layer
 │   │   ├── index.ts            # Client with JWT interceptors
 │   │   ├── auth.ts             # Login, register, currentUser
 │   │   ├── gift.ts             # Gift record push
 │   │   ├── player.ts           # Rank sync, game summary, leaderboard
 │   │   └── dto/                # TypeScript DTOs
 │   ├── assets/                 # Images, rank frames, global CSS
 │   ├── components/
 │   │   ├── CastTypeBtn/        # Danmu type toggle icons
 │   │   └── composables/
 │   │       ├── DanmuData.ts    # Danmu state composable
 │   │       ├── useBiliMonitor.ts
 │   │       └── useCrossWindowSync.ts
 │   ├── constants/
 │   │   ├── index.ts            # Shared constants
 │   │   ├── legion-war.ts       # Command/gift maps
 │   │   └── syncChannels.ts     # BroadcastChannel names
 │   ├── core/                   # Domain logic
 │   │   ├── actionRequests.ts   # Danmu/IPC bridge
 │   │   ├── blivechat-relay.ts  # Bilibili relay client
 │   │   ├── dycast.ts           # Douyin protocol
 │   │   ├── emitter.ts          # Event emitter
 │   │   ├── emoji.ts            # Emoji utilities
 │   │   ├── livePlatforms.ts    # Multi-platform room fetcher
 │   │   ├── model.ts            # Data models
 │   │   ├── relay.ts            # Message relay
 │   │   ├── request.ts          # Request helpers
 │   │   ├── util.ts             # Utilities
 │   │   ├── Long.ts             # Long integer handling
 │   │   └── signature.js        # Douyin signature
 │   ├── locales/
 │   │   ├── zh.ts               # Chinese
 │   │   └── en.ts               # English
 │   ├── router/
 │   │   └── index.ts            # Routes + auth guard
 │   ├── stores/
 │   │   └── auth.ts             # Auth store (Pinia)
 │   ├── types/
 │   │   └── danmu.ts            # Danmu type definitions
 │   ├── utils/
 │   │   ├── debugUtil.ts
 │   │   ├── DyCastClient.ts     # Douyin WS client
 │   │   ├── idUtil.ts
 │   │   ├── loashUtil.ts
 │   │   └── logUtil.ts
 │   └── views/
 │       ├── LoginForm.vue
 │       ├── MainView.vue
 │       ├── Overlay.vue
 │       ├── sidebar/
 │       │   └── MainSelector.vue
 │       └── panels/
 │           ├── TopControlPanel.vue
 │           ├── RecordTable.vue
 │           ├── DanmuList.vue
 │           ├── CastItem.vue
 │           └── UploadAttrList.vue
 └── vite.config.ts              # Aliases + dev proxies
 ```

 ## Getting Started

 ### Prerequisites

 - Node.js 18+
 - npm or pnpm
 - Python 3.x (for blivechat relay — optional, Bilibili only)

 ### Install

 ```bash
 npm install
 ```

 ### Development

 Start both Vite dev server and Electron with hot-reload:

 ```bash
 npm run dev
 ```

 Or use the custom dev script (avoids electronmon compatibility issues with Node.js 22):

 ```bash
 node scripts/dev.js
 ```

 This launches two windows:
 1. Main window at `http://localhost:5173`
 2. Overlay window at `/#/overlay` (green screen for OBS)

 ### Backend

 The app expects an ASP.NET Core 8 backend at `http://localhost:5150`. Override with `VITE_API_BASE_URL`.

 ### Build & Package

 ```bash
 npm run build
 ```

 Runs vue-tsc type check, Vite production build, then electron-builder. Produces:

 - **Windows**: NSIS installer + portable ZIP
 - **macOS**: DMG
 - **Linux**: AppImage

 ## Configuration

 ### Command & Gift Maps

 Danmu text and gift IDs are mapped to game actions in `constants/legion-war.ts`. Each map entry links a platform-specific ID to a War3 action string. Human-readable gift descriptions with their effects live in the locale files.

 ### Vite Dev Proxy

 | Prefix | Target | Use |
 | --- | --- | --- |
 | `/dylive` | `https://live.douyin.com` | Douyin live API proxy with cookie rewriting |
 | `/socket` | `wss://webcast5-ws-web-lf.douyin.com` | Douyin WebSocket proxy with UA injection |

 ## How It Works

 1. **Connect** — Enter a live room ID and start listening on any supported platform.
 2. **Monitor** — The app connects via WebSocket or HTTP polling and receives danmaku, gift, and like messages in real time.
 3. **Map** — Messages are matched against command maps. Commands like `1` or `2` assign viewers to teams; gift IDs trigger specific game effects.
 4. **Inject** — Matched messages are sent via Electron IPC to the main process, which writes them into Warcraft III JASS trigger files.
 5. **React** — War3 reads the files and executes commands: spawning units, buffing heroes, adding gold, etc.
 6. **Overlay** — Gift notifications and ranking changes broadcast to the overlay window via `BroadcastChannel` for OBS capture.
 7. **Settle** — At round end, War3 writes a summary file. The app parses it and syncs results to the ASP.NET backend.

 ## License

 MIT
