# 🚨 S-Report Command & Control Web Dashboard

A high-performance, real-time web interface for emergency dispatchers. Built with native web technologies to ensure zero-latency monitoring, AI-driven incident triage, and instant resource dispatching.

**Tech Stack:** Vanilla JS (ES6+), HTML5/CSS3, Leaflet.js, Power BI, SignalR.

---

## ⚙️ Core Architecture & Internal Logic

This dashboard relies on a custom-built, lightweight Client-Side Engine to process massive data streams without heavy SPA frameworks.

### 1. API & Network Engine (`apiService.js`)
* **`apiRequest()`:** A centralized interceptor handling all HTTP traffic. Features **Dynamic JWT Injection** to automatically attach tokens to headers.
* **Intelligent Parsing:** Dynamically parses `application/json` or `text/plain` based on response headers to prevent JSON parsing crashes.
* **401 Auto-Logout Catcher:** Automatically intercepts expired tokens, purges local storage, and forcefully redirects to the login gateway to enforce Zero-Trust security.

### 2. Real-Time Operations (`SignalRService.js`)
* **Smart Group Routing:** Decodes the JWT on connection. Employees are dynamically isolated to their specific `CityGroup` to minimize WebSocket payload bandwidth and ensure regional data privacy.
* **Decoupled Event Dispatching:** Emits a custom `newReportArrived` window event upon receiving server pushes, allowing the UI to silently refresh without full page reloads.

### 3. GIS Radar & Operations (`Dashboard.js`)
* **The "Exhaustive Pagination" Loop:** A custom `while(hasMore)` asynchronous algorithm that safely bypasses backend pagination limits (10 items/page) to aggregate entire governances securely.
* **State-Weighted Deduplication:** A client-side `Map` object engine that resolves real-time data racing by prioritizing advanced incident states (e.g., programmatically preserving a 'Closed' state over a delayed 'Pending' payload for the same ID).
* **AI Data Binding:** Dynamically parses the Python AI Gatekeeper outputs, converting raw fractional confidence scores into visual UI elements and rendering actionable Spam/Real validity badges.

### 4. HR & Dispatch Management (`Teams.js`, `Employees.js`, `Citizens.js`)
* **Asynchronous Lookups (`loadLookups`):** Halts data-table execution via `await` until abstract City IDs are fully mapped to readable strings via a Key-Value dictionary.
* **Unified Modals:** A single DOM modal intelligently handles both POST (new records) and PUT (updates) payloads dynamically by evaluating the entity ID state.
* **Dynamic Blocking:** The Citizen management module features a state-aware toggle that switches between Block/Unblock API endpoints seamlessly based on the user's current boolean status.

### 5. Analytics & Notifications
* **Mass Broadcasting:** Utilizes `Select2` formatting to map multiple City IDs into an array for large-scale Firebase Cloud Messaging (FCM) pushes (`CreateWarning.js`).
* **Asynchronous Power BI Injection:** Embeds heavy Microsoft Power BI analytical iframes using an `onload` event listener paired with UI spinners to prevent main-thread UI freezing (`Analytics.html`).

---

## 🚀 Quick Start
1. Clone the repository: `git clone https://github.com/mogad20/New_S-Report2.git`
2. Open the project in VS Code.
3. Launch `index.html` using the **Live Server** extension.

---

## 👨‍💻 Developed By
**Mohammad Gad** (Frontend Web Dashboard Developer & .NET Integrator) alongside the S-Report Engineering Team.
