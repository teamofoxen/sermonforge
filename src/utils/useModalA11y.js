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
//
// The focus lifecycle is bound to the dialog's MOUNT, deliberately not to the
// identity of `onClose`. Callers pass inline arrows (new identity every parent
// render), and the workspace re-renders while its overlays are open — the
// notebook drawer re-renders the workspace on every keystroke. If this effect
// re-ran on `onClose` changes, each such render would run the close half
// (restore focus to the invoker) and then the open half (focus the first
// focusable), yanking focus out of whatever the pastor was typing in —
// exactly the drawer-goes-deaf regression the final integration review caught
// live. `onCloseRef` keeps Escape wired to the latest callback without making
// callback identity part of the dialog's lifetime.
export function useModalA11y(onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
    // autoFocus'd field). When no focusable child is found, the dialog NODE
    // takes focus — which requires a tabindex: a bare div ignores .focus()
    // (Session 6: the fallback silently no-opped before, leaving focus on the
    // obscured background).
    if (node && !node.contains(document.activeElement)) {
      const first = focusables()[0];
      if (first) {
        first.focus();
      } else {
        if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
        node.focus();
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        onCloseRef.current?.();
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
    // Mount-only by design (see the header comment): the dialog conditionally
    // renders (`{open && <Dialog/>}`), so mount/unmount IS open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
