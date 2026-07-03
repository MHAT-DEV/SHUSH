# SHUSH 🤫 | แชทปลอดภัยขั้นสุด

A privacy-first social platform designed for absolute security, zero-knowledge architecture, and customizable zero-trust environments.

---

## 🌟 Project Overview

**SHUSH** is an experimental, privacy-focused social workspace designed for absolute anonymity and secure social bonding. It allows users to create isolated relationship "Circles" (such as BFF Groups or Couples) and maintain multiple identity profiles ("Lenses") to separate their professional, public, and private lives. Everything is securely connected via zero-knowledge authentication, WebAuthn (Passkeys), and client-side end-to-end encryption.

---

## 🛠️ Features

- **Zero-Knowledge WebAuthn Architecture:** Passwordless authentication using secure Passkeys (FIDO2/WebAuthn) and TOTP multi-factor enforcements. No central password storage.
- **Multi-Profile "Lenses" Isolation:** Instantly switch between custom identities (e.g., Professional, Partner, Anon) to keep social bubbles completely decoupled.
- **E2EE Personal Enclave & Vault:** Client-side End-to-End Encryption (E2EE) using Web Crypto API (`AES-256-GCM`). Your private keys and vaulted data never leave your device unencrypted.
- **Interactive Relationship Sandboxes:**
  - **Couple Space:** Shared secure calendar, anniversaries, memories, shared vault, and a real-time drawing canvas (Whiteboard).
  - **BFF Groups:** Private chat groups with granular controls, self-destructing messages, and custom group whiteboards.
- **PET (Privacy Entity Token) Companion:** An interactive digital companion that lives inside your workspace, growing and thriving as you participate in secure privacy activities.
- **Honey Me (Proximity Discovery):** A permission-based, real-time discovery engine to find nearby friends without storing continuous location history on any server.
- **Privacy Missions & Achievements:** A gamified onboarding pipeline that guides users through essential security setups (e.g., setting up a Vault, enabling Passkeys) to claim privacy badges.
- **Optimized Mobile UX:** Pre-configured with native-like scrolling physics, preventing browser pull-to-refresh gestures and limiting rubber-band elastic bouncing for a seamless mobile feel.

---

## 💻 Technology Stack

### Frontend (SPA)
- **Framework:** React 19
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4 (with native CSS imports)
- **Animations:** Motion (Framer Motion v12)
- **Icons:** Lucide React

### Backend (Full-Stack)
- **Runtime:** Node.js, TypeScript (`tsx`)
- **Web Server:** Express
- **Real-Time Engine:** Native WebSockets (`ws` library) with custom state-tracked connections (e.g., active chat matching to suppress notifications during active view)
- **Auth Standards:** FIDO2 WebAuthn (`@simplewebauthn/server` & `@simplewebauthn/browser`), OTPLib (for TOTP)

### Infrastructure & Operations
- **Containerization:** Docker & Docker Compose
- **Web Server Proxy:** Nginx with WebSocket upgrade support, strict security headers, and compression
- **SSL Support:** Let's Encrypt / Certbot integration
- **Target OS:** Linux (Ubuntu/Debian) or Containerized environments (e.g., Cloud Run)

---

## 📂 Project Structure

```
/
├── src/                      # Frontend Application & Shared Logic
│   ├── components/           # Modular React components and workspaces
│   │   ├── AuthScreen.tsx    # Passkey & TOTP security gate
│   │   ├── VaultSpace.tsx    # Client-side AES-GCM Enclave
│   │   ├── BffSpace.tsx      # BFF relationship space & group config
│   │   ├── CoupleSpace.tsx   # Couple relationship space & timeline
│   │   ├── PetSpace.tsx      # Interactive PET digital companion
│   │   ├── Whiteboard.tsx    # Real-time drawing canvas
│   │   ├── DiscoverySpace.tsx# Honey Me proximity discovery
│   │   └── ...               # Additional features & subcomponents
│   ├── db/                   # Local stores and mock schemas
│   │   └── local_store.ts    # Secure in-memory data state & relationships
│   ├── lib/                  # Utilities (cryptography, layout utility, etc.)
│   ├── main.tsx              # App main mounting entry point
│   ├── useRouteSync.ts       # Synchronization hook between React router and state
│   ├── App.tsx               # Main application component & WebSocket router
│   └── index.css             # Tailwind CSS & global mobile-optimized styles
├── server.ts                 # Express & WebSocket Server Entry Point
├── package.json              # App dependencies, scripts, and build workflows
├── tsconfig.json             # TypeScript configuration
├── Dockerfile                # Multi-stage production container build
├── docker-compose.yml        # Multi-container orchestration config
├── install.sh                # Automated setup script for Ubuntu
└── .env.example              # Template environment variables
```

---

## 🚀 Installation & Local Development

### Prerequisites
- **Node.js** v20 or newer
- **npm** or equivalent package manager

### 1. Local Setup
Clone the workspace files or extract them to your working directory, then install the package dependencies:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
# Server configuration
PORT=3000
JWT_SECRET=your_32_byte_hex_string

# WebAuthn settings (Critical for Passkeys)
RP_ID=localhost
ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`. 
*Note: Passkeys (WebAuthn) require a secure context (HTTPS or localhost) to function correctly.*

---

## 🐳 Production Deployment

### 1. Docker Compose
To run SHUSH inside an isolated production container:
```bash
docker-compose up --build -d
```

### 2. Manual Build & Run
To compile and start the full-stack server manually:
```bash
# Build the client and bundle the backend server using esbuild
npm run build

# Start the bundled server
npm run start
```

### 3. Automated Setup (Ubuntu Server)
For dedicated deployment, run the included `install.sh` script to configure Docker, Nginx reverse proxy, and automate Let's Encrypt SSL certificates setup:
```bash
sudo chmod +x install.sh
sudo ./install.sh
```

---

## 🔒 Security Architecture

- **End-to-End Encryption (E2EE):** All personal vaults, chat messages, and shared files are encrypted client-side using `crypto.subtle`. The Express server only stores the encrypted payloads and IVs. The plain-text data or private master keys are never sent to the network.
- **Anti-Tracking Discovery:** The "Honey Me" proximity feature calculates distances on the fly to help nearby friends connect. No historical coordinates or precise tracks are ever logged persistently.
- **Sandbox Relationship Partitioning:** Each BFF group or couple relationship receives unique ID hashes. User data stays strictly sandboxed within that group's database scope.

---

## 🔄 Recent Enhancements

1. **Native-Like Mobile Scrolling Experience:** Prevents browser-default pull-to-refresh pull-downs and limits rubber-band elastic bouncing on iOS/Android devices using optimized `overscroll-behavior: none` styling rules.
2. **Advanced Presence & "Last Online" State Machine:**
   - **Smart Automatic Presence:** Automatically marks users as "online" when connected to the WebSocket server, and "offline" when disconnected (with multi-tab synchronization to prevent premature offline marking).
   - **Persistent Custom Statuses:** Allows manual override to statuses like "ไม่ว่าง (Busy)" or "ไม่อยู่ (Away)" and persists them within the active browser session or tab lifecycle (sessionStorage).
   - **Real-Time Relative Time Display:** Renders exact relative-time statuses (e.g. "Online: 5 minutes ago") in 1-on-1 chat headers and user lenses using a precise timestamp system.
   - **Granular Privacy Toggle:** Includes a high-contrast settings switch to toggle Last Online visibility on/off dynamically.
3. **WebSocket Real-Time Chat Sync:** Enhanced direct messaging (DM) alerts so that the recipient's sidebar counts unread messages and displays latest previews instantly across active WebSocket connections.
4. **Robust Routing & Navigation State:** Refined relationship and profile syncing via URL paths to prevent redundant re-renders and secure context consistency.

---

## 📄 License

All rights reserved. SHUSH is a proprietary experimental platform.
