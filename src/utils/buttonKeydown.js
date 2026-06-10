// Shared Enter/Space activation for clickable non-button elements
// (role="button" divs — nav items, cards, calendar chips). The Dashboard
// tiles established the pattern; this is the one copy the other surfaces
// share instead of inlining it a fourth time.
//
// The e.target === e.currentTarget guard matters when the element contains
// nested interactive controls (a card with its own buttons): keystrokes
// inside the nested control must not also activate the container.

export function buttonKeydown(onActivate) {
  return (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate?.(e);
    }
  };
}
