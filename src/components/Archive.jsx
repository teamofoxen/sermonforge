// Re-export shim. The canonical "Completed Sermons" page (formerly "Archive")
// now lives at `src/components/CompletedSermons.jsx`. Pilot B.2 of the audit
// triage renamed it because "Archive" was a stale alias for the post-v16
// `complete` state value (State #5: one name per concept). This file is
// preserved only so any lingering imports keep compiling. New code should
// import `CompletedSermons` from `./CompletedSermons` directly.
export { default } from "./CompletedSermons";
