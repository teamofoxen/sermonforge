import { useEffect, useRef } from "react";

// Minimal dialog accessibility for the app's overlays (audit L10):
//   • Escape closes (calls onClose).
//   • Focus moves into the dialog on open — unless something inside already
//     holds focus (respects an autoFocus'd input).
//   • Tab is trapped so focus cycles within the dialog instead of escaping to
//     the page behind the backdrop.
//   • Focus is restored to the previously-focused element on close.
//
// Returns a ref to attach to the dialog element. Pair it with
// role="dialog" aria-modal="true" aria-labelledby={titleId} on that element.
export function useModalA11y(onClose) {
  const ref = useRef(null);

  useEffect(() => {
    const prevActive = document.activeElement;
    const node = ref.current;

    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null)
        : [];

    // Move focus into the dialog only if it isn't already there (don't fight an
    // autoFocus'd field).
    if (node && !node.contains(document.activeElement)) {
      const first = focusables()[0];
      if (first) first.focus();
      else node.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prevActive && typeof prevActive.focus === "function") prevActive.focus();
    };
  }, [onClose]);

  return ref;
}
