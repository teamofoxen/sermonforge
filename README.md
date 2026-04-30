# SermonForge

A sermon preparation workspace for pastors. Built with Electron, React, Vite, and SQLite.

## Setup

1. Ensure `.env` exists in the project root with:
   ```
   ANTHROPIC_API_KEY=your-key-here
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Launch the app:
   ```
   npm start
   ```

## Features

- **Dashboard** — stats, upcoming sermons, active series
- **Sermon Workspace** — full prep workflow: Study → Outline → Manuscript → Delivery
- **Study Tab** — four-phase exegesis (Observe, Interpret, Redemptive Thread, Implications), MPT→MPS Forge, Outline Builder, Functional Elements (E/A/I)
- **Manuscript Tab** — full editor with Sermon Tune-Up Engine (AI)
- **Delivery Tab** — pre-sermon checklist, timing notes, post-sermon reflection, full-screen delivery view
- **AI Panel** — Claude-powered feedback for every stage via IPC (API key stays in main process)
- **Calendar** — visual sermon schedule
- **Illustrations** — searchable illustration library
- **Archive** — past sermons

## Database

Local-first SQLite storage. No dependency on OneDrive for the database.

- Main application database: `%APPDATA%\sermonforge\data\sermonforge.db` (sql.js)
- Theology corpus: `%APPDATA%\sermonforge\data\theology.db` (better-sqlite3 + sqlite-vec)

The data directory is created on first launch. Seeded with sample sermons on
first launch.
