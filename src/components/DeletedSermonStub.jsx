import { useState } from "react";
import { deleteSermon, restoreSermon } from "../core/spine";
import { TextButton } from "./primitives/TextButton";

// Soft-delete UX shared by the sermon card lists (v24): a deleted card
// swaps to this stub with Undo instead of vanishing (Mutation #3 spirit —
// lifecycle events are events, not silent disappearances; Mutation #4 —
// the undo keeps reversal cost near zero). State + handlers live in
// useSoftDelete so the lists stay in lockstep.

export function useSoftDelete() {
  const [justDeleted, setJustDeleted] = useState(() => new Set());

  async function handleDelete(sermon) {
    await deleteSermon(sermon.id);
    setJustDeleted((prev) => new Set(prev).add(sermon.id));
  }

  async function undoDelete(sermon) {
    await restoreSermon(sermon.id);
    setJustDeleted((prev) => {
      const next = new Set(prev);
      next.delete(sermon.id);
      return next;
    });
  }

  return { justDeleted, handleDelete, undoDelete };
}

export default function DeletedSermonStub({ sermon, onUndo }) {
  return (
    <div className="sermon-card">
      <p className="sermon-card-preached-stub">
        “{sermon.title}” deleted.
      </p>
      <TextButton size="sm" onClick={() => onUndo(sermon)}>
        Undo
      </TextButton>
    </div>
  );
}
