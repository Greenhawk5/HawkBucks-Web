<div align="center">

<!-- ========================================================= -->
<!-- HERO IMAGE                                                -->
<!-- Replace this image after creating the final project hero. -->
<!-- ========================================================= -->

<img src="docs/screenshots/hawkbucks-header.png" alt="HawkBucks" width="100%" />

<br />

# HawkBucks

### Fortnite Save The World V-Bucks Mission Tracker

A modern community tool for discovering today's  
**V-Bucks missions in Fortnite: Save The World.**

<br />

<p>
  <a href="#-overview">Overview</a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="#-features">Features</a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="#-screenshots">Screenshots</a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="#-architecture">Architecture</a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="#-installation">Installation</a>
</p>

<br />

![Status](https://img.shields.io/badge/status-active-36d97e?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-36d97e?style=for-the-badge)
![Frontend](https://img.shields.io/badge/frontend-React-61dafb?style=for-the-badge)
![Backend](https://img.shields.io/badge/backend-Cloudflare%20Worker-f38020?style=for-the-badge)

</div>

---

## 🌿 Overview

**HawkBucks** is a community-driven web application built around one simple goal:

> **Find today's Fortnite Save The World missions that reward V-Bucks — quickly and without unnecessary information.**

Instead of manually searching through mission data, HawkBucks processes the available Fortnite mission information, identifies missions containing V-Bucks rewards, resolves their mission type, area, zone and Power Level, and presents everything through a clean gaming-focused interface.

The project combines a modern responsive frontend with a lightweight backend worker responsible for retrieving and processing mission data.

The result is a simple experience:

**Open HawkBucks → Check today's missions → Find the V-Bucks → Play.**

---

## 🎯 Why HawkBucks?

Fortnite: Save The World periodically contains missions that reward players with V-Bucks.

Finding these missions manually can be inconvenient, especially when there are many missions available across different areas and difficulty levels.

HawkBucks focuses entirely on this problem.

### The experience is designed around three questions:

**Are there V-Bucks missions today?**

**Where are they?**

**What Power Level do I need?**

Everything else stays out of the way.

---

# ✨ Features

## 💎 V-Bucks Mission Detection

HawkBucks automatically analyzes the available mission data and identifies missions that contain V-Bucks rewards.

Each detected mission provides the important information needed by the player:

- V-Bucks reward amount
- Mission type
- Area
- Zone
- Power Level

---

## ⚡ Fast Mission Overview

The website is designed so that the user can understand the current situation within seconds.

The main dashboard prioritizes:

1. **V-Bucks reward**
2. **Area**
3. **Mission**
4. **Power Level**
5. **Zone**

No unnecessary dashboards or complicated navigation.

---

## 🌍 Multiple Mission Areas

Mission information is resolved across the major Save The World progression areas, including:

- Stonewood
- Plankerton
- Canny Valley
- Twine Peaks
- Ventures

---

## 🗺️ Mission & Zone Resolution

Raw Fortnite mission data is not always directly suitable for human-readable presentation.

HawkBucks includes resolution and mapping logic for:

- Mission types
- Mission categories
- Power Levels
- Zone themes
- Area names
- Special zone variants

This allows raw mission information to become useful player-facing information.

---

## 🌐 Multi-language Data Support

The project includes localized mission and area data.

Supported localization data currently includes languages such as:

- English
- Arabic
- German
- Spanish
- French
- Italian
- Japanese
- Korean
- Polish
- Portuguese
- Russian
- Turkish
- Chinese

The localization layer is designed so additional languages can be added without rewriting the mission-processing logic.

---

## 📱 Responsive Gaming Interface

The HawkBucks frontend is designed for both desktop and mobile devices.

The interface uses:

- Dark gaming aesthetics
- Emerald / neon-green accents
- Glass-inspired surfaces
- High-contrast typography
- Responsive layouts
- Compact mission cards
- Mobile-friendly navigation

The goal is to make the website feel closer to a **premium gaming command center** than a traditional dashboard.

---

## 🔄 Automatic Updates

Mission information is designed around the Fortnite mission rotation.

The application can display:

- Last update
- Next update
- Current mission status
- Current V-Bucks total

This allows users to quickly determine whether they should check back after the next rotation.

---

# 🖥️ Screenshots

## Home


<p align="center">
  <img
    src="docs/screenshots/home.png"
    alt="HawkBucks Home"
    width="900"
  />
</p>

The Home page is the primary mission dashboard.

It focuses on the current V-Bucks status and presents available missions in an easy-to-scan format.

---

## About


<p align="center">
  <img
    src="docs/screenshots/about.png"
    alt="HawkBucks About"
    width="900"
  />
</p>

The About page explains the project, its purpose and the technology behind HawkBucks.

---

# 🧠 How It Works

At a high level, HawkBucks follows this pipeline:

```text
                 Fortnite / Epic Games
                         │
                         ▼
                Mission World Data
                         │
                         ▼
                HawkBucks Worker
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        Mission Filtering       Data Resolution
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                  V-Bucks Missions
                         │
                         ▼
                 HawkBucks Frontend
                         │
                         ▼
                       User
```

The worker is responsible for retrieving the relevant mission information and processing it before it reaches the website.

The frontend then transforms the resulting data into a visual mission dashboard.

---

# 🏗️ Architecture

HawkBucks is divided into two primary application layers.

## Frontend

The frontend provides the user-facing experience.

It is built around:

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Router
- TanStack Query
- Radix UI
- Lucide Icons

The current repository contains the frontend under:

```text
/frontend
```

The frontend is designed as a reusable component-based application rather than a single monolithic page.

---

## Worker

The backend processing layer lives under:

```text
/worker
```

The worker is implemented using JavaScript / Node.js-compatible tooling and contains the mission processing logic.

Its responsibilities include:

- Authenticating with Epic Games
- Retrieving Fortnite world information
- Detecting V-Bucks mission alerts
- Resolving mission types
- Resolving Power Levels
- Resolving mission zones
- Handling localization
- Preparing mission information for downstream use

The worker uses packages including:

- Axios
- Chalk
- Node Fetch
- Wrangler

---

# 🧩 Mission Processing

The mission-processing pipeline can be summarized as:

```text
Raw World Data
      │
      ▼
Mission Alerts
      │
      ▼
Find V-Bucks Rewards
      │
      ▼
Match Mission Tile
      │
      ▼
Resolve Mission Type
      │
      ▼
Resolve Power Level
      │
      ▼
Resolve Zone
      │
      ▼
Localized Mission Result
```

For example, raw mission information can eventually become:

```text
50 V-Bucks

Canny Valley
Fight Category 2 Storm

Power Level: 52

Desert
```

This transformation is one of the core purposes of the HawkBucks backend.

---

# 🎨 Design Philosophy

HawkBucks follows a specific visual direction.

### Dark

The interface uses a deep dark background designed for comfortable viewing in gaming environments.

### Emerald

Green and emerald tones represent the HawkBucks identity and provide the primary visual accent.

### Futuristic

Soft glow effects, glass-inspired surfaces and subtle borders create a modern gaming atmosphere.

### Focused

The UI avoids unnecessary information.

The user should immediately understand:

> **Today's V-Bucks status.**

---

# 🛠️ Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | UI framework |
| TypeScript | Type safety |
| Vite | Development & build tooling |
| Tailwind CSS | Styling |
| TanStack Router | Routing |
| TanStack Query | Data fetching & state |
| Radix UI | Accessible UI primitives |
| Lucide React | Icons |

---

## Backend / Worker

| Technology | Purpose |
|---|---|
| JavaScript | Mission processing |
| Node.js | Runtime |
| Axios | HTTP requests |
| Node Fetch | HTTP utilities |
| Wrangler | Cloudflare tooling |

---

# 📁 Project Structure

```text
HawkBucks-Web/
│
├── frontend/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── ...
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.*
│   └── README.md
│
├── worker/
│   │
│   ├── assets/
│   ├── index.js
│   ├── localization.json
│   ├── package.json
│   ├── wrangler.toml
│   └── README.md
│
├── docs/
│   └── screenshots/
│       ├── hawkbucks-header.png
│       ├── home.png
│       └── about.png
│
├── .gitignore
└── README.md
```

> The structure above represents the major project layers. Individual source files may evolve as development continues.

---

# 🚀 Installation

## Requirements

Before running HawkBucks locally, make sure you have:

- Git
- Node.js
- npm

A modern Node.js LTS release is recommended.

---

## Clone the repository

```bash
git clone https://github.com/Greenhawk5/HawkBucks-Web.git
cd HawkBucks-Web
```

---

# 💻 Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will then be available through the local Vite development server.

---

## Production Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

You can also run linting with:

```bash
npm run lint
```

---

# ⚙️ Worker Setup

Navigate to the worker:

```bash
cd worker
```

Install dependencies:

```bash
npm install
```

The worker contains configuration and authentication values required for accessing the relevant Epic Games services.

### Important

**Never commit real Epic Games credentials, Device Auth secrets or private webhook URLs to a public repository.**

Use environment variables or deployment secrets for production credentials.

---

# 🔐 Security

HawkBucks interacts with authenticated Epic Games services.

For that reason, sensitive values must remain private.

Never expose:

- Epic Games account IDs
- Device IDs
- Device Auth secrets
- API tokens
- Webhook URLs
- Other private credentials

If credentials are accidentally exposed, revoke and regenerate them immediately.

---

# 🌐 Deployment

The HawkBucks architecture is designed around a lightweight web frontend and worker-based backend.

The frontend can be deployed to a static/serverless web platform such as:

- Cloudflare Pages
- Vercel
- Netlify

The worker can be deployed using Cloudflare's worker tooling.

The exact production configuration may evolve as the project develops.

---

# 🧭 Roadmap

HawkBucks is designed to grow beyond a simple mission viewer.

### Current

- [x] HawkBucks web interface
- [x] Home page
- [x] About page
- [x] Mission cards
- [x] V-Bucks reward detection
- [x] Mission type resolution
- [x] Power Level resolution
- [x] Zone resolution
- [x] Localization foundation
- [x] Responsive design

### Planned

- [ ] Mission history
- [ ] Daily mission archive
- [ ] Additional language support
- [ ] Public API
- [ ] User notification preferences

---

# 🤖 Future Integrations

The architecture is intentionally designed to support future HawkBucks services.

Possible integrations include:

```text
                    HawkBucks Core
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
           Web         Telegram      Discord
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                    Mission Data
```

This would allow the same mission data pipeline to power multiple HawkBucks experiences.

---

# 📊 Example Mission

A typical HawkBucks mission result can look like:

```text
┌───────────────────────────────────────┐
│                                       │
│  50 V-Bucks                           │
│                                       │
│  Canny Valley                         │
│  Fight Category 2 Storm               │
│                                       │
│  Power Level: 52                      │
│  Zone: Desert                         │
│                                       │
└───────────────────────────────────────┘
```

The goal is not to overwhelm the player with raw API data.

The goal is to turn complex mission information into something immediately useful.

---

# 🦅 About the Name

**HawkBucks** combines the project's hawk-inspired visual identity with its primary purpose:

**V-Bucks mission tracking.**

The hawk represents:

- Vision
- Speed
- Precision
- Awareness

Which matches the project's purpose:

> **See the mission. Find the reward. Play.**

---

# 🤝 Contributing

Contributions, suggestions and improvements are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test the project locally.
5. Commit your changes.
6. Open a Pull Request.

Example:

```bash
git checkout -b feature/my-feature

git add .

git commit -m "Add my feature"

git push origin feature/my-feature
```

---

# 🐛 Issues & Suggestions

Found a bug or have an idea?

Please open an issue in the GitHub repository with:

- A clear title
- Description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots when useful

---

# 📜 License

HawkBucks is released under the **MIT License**.

See the `LICENSE` file for the complete license text.

---

# ⚠️ Disclaimer

HawkBucks is an independent community project.

It is **not affiliated with, endorsed by, or sponsored by Epic Games or Fortnite**.

Fortnite and V-Bucks are trademarks of Epic Games, Inc.

HawkBucks uses publicly accessible game-related information and services to provide a community-focused mission tracking experience.

---

# 💚 Credits

### HawkBucks Project

Designed and developed as an independent community project for Fortnite: Save The World players.

Special thanks to the open-source community and everyone contributing ideas, testing the application and helping improve HawkBucks.

---

<div align="center">

### Built for Save The World players.

**Find the V-Bucks.  
Track the missions.  
Never miss a reward.**

<br />

<img src="docs/screenshots/hawkbucks-header.png" alt="HawkBucks" width="180" />

<br /><br />

**HawkBucks**

*Fortnite Save The World V-Bucks Mission Tracker*

</div>
