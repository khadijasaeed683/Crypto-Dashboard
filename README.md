# Real-Time Crypto Monitor & Portfolio Tracker

This repository contains a high-performance frontend web application built entirely without external UI frameworks or CSS libraries. It bridges the gap between software theory and real-world deployment by utilizing a Master-Detail architecture to stream live financial data via the Binance Public WebSocket API, alongside managing personal portfolio operations through a simulated REST API. 

The codebase emphasizes advanced asynchronous ES6 JavaScript, strict state separation, and DOM reflow optimization.

## Key Features

* **Live Market Streaming:** Maintains a persistent WebSocket connection for zero-latency price, volume, and 24h change updates.
* **Custom Canvas Rendering:** Implements a Master-Detail charting architecture with lightweight HTML5 Canvas sparklines and a primary dynamic trend chart.
* **Portfolio Management:** Full Create, Read, Update, and Delete (CRUD) capabilities synchronized with a REST API endpoint.
* **State-Separated Search:** A hybrid debounced and explicitly triggered search mechanism operating on a derived UI state to preserve immutable master data.
* **Performance Optimized:** Bypasses virtual DOM overhead by utilizing native `DocumentFragment` caching for single-paint list rendering.
* **Responsive CSS Grid:** A fluid layout utilizing `minmax()` boundaries to adapt flawlessly from ultra-wide monitors to standard laptops.
* **Theme Persistence:** A CSS-variable driven light/dark mode system stored securely in local browser storage.

## Technical Stack

| Concept | Implementation |
| :--- | :--- |
| **Core Languages** | Vanilla HTML5, CSS3, ES6 JavaScript |
| **Data Streaming** | Native `WebSocket` API |
| **REST Integration** | Native `fetch` API (Promises & Async/Await) |
| **State Management** | Centralized class properties with derived UI state |
| **Data Structures** | Bounded arrays (Queues) for charting memory limits |
| **Visual Rendering** | Native HTML5 `<canvas>` API |

## Project Architecture

```text
Crypto-Dashboard/
├── index.html
├── css/
    ├── variables.css   # CSS variables (Light/Dark theme, colors, typography)
    ├── header.css      # Top navigation and auth overlay styles
    ├── portfolio.css   # Portfolio tracker and allocation donut styles
    └── styles.css      # Main layout, grid architecture, and watchlist styles
└── js/
    ├── config.js       # Environment variables and global constants
    ├── storage.js      # Synchronous LocalStorage/SessionStorage wrapper
    ├── api.js          # REST API network interactions and error boundaries
    ├── websocket.js    # WebSocket stream management and reconnection logic
    ├── ui.js           # Centralized DOM patching and Canvas mathematics        
    ├── auth.js         # Handles user sign in and sign up 
    └── main.js         # The core Orchestrator and state management class
