import React from "react";
import styles from "./Logo.module.css";

/**
 * SermonForge — Rule-Flanked Wordmark
 *
 * Two voices, one humanist family:
 *   • JetBrains Mono 500 → wordmark + tagline (the structural voice)
 *   • Hairline gold rules → quietly liturgical bookends
 *
 * Sizing is driven by the parent. The component fills its container
 * width and centers itself. For the dashboard sidebar, wrap it in a
 * 220–260px container with vertical padding.
 *
 * Props:
 *   tagline    — show "Clarity Through Constraint" (default: true)
 *   size       — "sm" | "md" | "lg"  (default: "md")
 *   tone       — "gold" | "ink"      (default: "gold")
 *                "ink" is for use on light/parchment backgrounds where
 *                gold would be too loud (auth screens, print headers).
 *   className  — passthrough for layout overrides
 */
export default function Logo({
  tagline = true,
  size = "md",
  tone = "gold",
  className = "",
}) {
  const cls = [
    styles.logo,
    styles[`size-${size}`],
    styles[`tone-${tone}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} role="img" aria-label="SermonForge">
      <span className={styles.rule} aria-hidden="true" />
      <div className={styles.word}>SermonForge</div>
      {tagline && (
        <div className={styles.tag}>
          {/* Em-spaces (\u2003) keep the tracking even at small sizes */}
          Clarity{"\u2003"}Through{"\u2003"}Constraint
        </div>
      )}
      <span className={styles.rule} aria-hidden="true" />
    </div>
  );
}
