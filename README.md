# CallDeck - Corporate Earnings Call Player

A modern, multi-tab desktop application designed for listening to corporate earnings calls while viewing presentation slides and financial reports side-by-side.

> **Note**: I originally built this tool for myself purely for personal convenience. When analyzing quarterly earnings calls, standard media players and PDF viewers felt disconnected and cumbersome. I wanted a fast, frictionless tool that lets me listen to calls, flip through slides freely, bookmark slide transition timestamps, and keep multiple companies organized in tabs without any clutter or forced metadata.

---

## Key Features

### 1. Multi-Tab Browser Interface
- Open and manage multiple earnings calls simultaneously in dedicated tabs.
- **Inline Renaming**: Double-click any tab title (or click the rename icon) to rename it freely (e.g., "Apple Q4", "NVIDIA AI Deck", "Custom Review").
- Fast tab switching with shortcuts (`Ctrl+1` through `Ctrl+9`), quick tab creation (`Ctrl+N` or `Ctrl+T`), and tab closing (`Ctrl+W`).

### 2. Unrestricted Slide Navigation
- Full freedom to move between slides at any point during audio playback.
- The player never locks or hijacks your current slide position.
- Remembers your exact slide number and playback position across sessions.

### 3. Timeline Slide Markers (YouTube-Style Scrubber Dots)
- Every time you change slides while listening, an interactive glowing marker dot is placed directly on the audio timeline scrubber.
- **Hover** on any dot to see which slide was active at that timestamp.
- **Click** any dot to immediately seek audio playback to that moment and jump to the corresponding slide.
- Access the chronological history drawer via the "Markers" button.

### 4. YouTube-Style & Ergonomic Keyboard Shortcuts
- **Playback Controls**:
  - `K` or `Space`: Play / Pause toggle
  - `J`: Seek backward 10 seconds (`Shift+J` for 5 seconds)
  - `L`: Seek forward 10 seconds (`Shift+L` for 5 seconds)
  - `Alt+Left` / `Alt+Right`: Seek backward / forward 15 seconds
  - `Alt+R`: Cycle playback speed (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x)
  - `Alt+M`: Mute / Unmute audio
  - `Ctrl+Up` / `Ctrl+Down`: Increase / Decrease volume
- **File Imports**:
  - `Ctrl+I`: Import presentation PDF
  - `Ctrl+Shift+I`: Import call audio file
- **View Modes**:
  - `Alt+H`: Switch to Horizontal Deck mode
  - `Alt+V`: Switch to Vertical Report mode
  - `Alt+S`: Toggle slide thumbnails sidebar
  - `Ctrl++` / `Ctrl+-`: Zoom in / Zoom out
  - `Ctrl+0`: Reset zoom / fit width
  - `F1` or `Ctrl+/`: Toggle keyboard shortcuts cheatsheet

### 5. Dual Report View Modes
- **Horizontal Deck Mode (`Alt+H`)**:
  - Optimized for 16:9 widescreen and 4:3 slide presentations.
  - Automatically fits the slide to the full viewport with high clarity.
- **Vertical Report Mode (`Alt+V`)**:
  - Optimized for portrait documents (10-K, 10-Q SEC filings, balance sheets, tables).
  - Includes interactive mouse hand-tool panning (click and drag), smooth `Ctrl+Wheel` zooming, and `Shift+Arrow` nudges.

### 6. Persistent Local Storage
- Built-in `IndexedDB` database engine and custom Electron file streaming protocol (`app-file://`).
- Files, playback positions, active slides, and tab configurations persist across app restarts and browser refreshes without broken blob links.

### 7. Modern Frosted Glassmorphism UI
- Clean, dark glassmorphic design system with ambient glows, translucent backdrops, refined typography, and smooth micro-animations.
- No terminal clutter or hardcoded company presets. You start with a clean workspace and configure what you need.

---

## Keyboard Shortcuts Reference

| Category | Action | Shortcut |
| :--- | :--- | :--- |
| **Audio** | Play / Pause | `K` or `Space` |
| **Audio** | Seek Backward 10s | `J` (`Shift+J` for 5s) |
| **Audio** | Seek Forward 10s | `L` (`Shift+L` for 5s) |
| **Audio** | Seek Backward 15s | `Alt+Left` |
| **Audio** | Seek Forward 15s | `Alt+Right` |
| **Audio** | Cycle Playback Speed | `Alt+R` |
| **Audio** | Mute / Unmute | `Alt+M` |
| **Audio** | Volume Up / Down | `Ctrl+Up` / `Ctrl+Down` |
| **Slides** | Next Slide | `Right Arrow` or `PageDown` |
| **Slides** | Previous Slide | `Left Arrow` or `PageUp` |
| **Slides** | Toggle Thumbnails Sidebar | `Alt+S` |
| **Slides** | Zoom In / Out / Reset | `Ctrl++` / `Ctrl+-` / `Ctrl+0` |
| **Views** | Horizontal Deck Mode | `Alt+H` |
| **Views** | Vertical Report Mode | `Alt+V` |
| **Files** | Import Presentation PDF | `Ctrl+I` |
| **Files** | Import Call Audio | `Ctrl+Shift+I` |
| **Tabs** | New Tab | `Ctrl+N` or `Ctrl+T` |
| **Tabs** | Close Tab | `Ctrl+W` |
| **Tabs** | Switch to Tab 1-9 | `Ctrl+1` ... `Ctrl+9` |
| **Help** | Shortcuts Cheatsheet | `F1` or `Ctrl+/` |

---

## Technology Stack

- **Desktop Framework**: Electron
- **Frontend Framework**: React 18 (TypeScript)
- **Bundler & Dev Server**: Vite
- **Styling**: Tailwind CSS with custom Frosted Glassmorphism tokens
- **State Management**: Zustand with persistent storage
- **PDF Engine**: PDF.js (`react-pdf`)
- **Icons**: Lucide React
- **Local Persistence**: IndexedDB & Electron IPC Streaming Bridge

---

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/earnings-calls-player.git
   cd earnings-calls-player
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

- **Run in Development Mode (Web / Vite)**:
  ```bash
  npm run dev
  ```
  Open `http://localhost:5173` in your browser.

- **Run Desktop Application (Electron + Vite)**:
  ```bash
  npm run dev:electron
  ```

### Building for Production

- **Compile and Typecheck Bundle**:
  ```bash
  npm run build
  ```

- **Build Desktop App Packages / Windows Executable**:
  ```bash
  npm run dist
  ```

---

## License

MIT License. Feel free to use and customize for your own research workflow.
