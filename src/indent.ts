/** Indent helpers for textarea Tab / Shift+Tab */

const INDENT = "  ";

export type TextSelection = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function lineStartAt(value: string, index: number): number {
  const i = value.lastIndexOf("\n", Math.max(0, index - 1));
  return i === -1 ? 0 : i + 1;
}

function lineEndAt(value: string, index: number): number {
  const i = value.indexOf("\n", index);
  return i === -1 ? value.length : i;
}

/** Expand selection to full lines that contain the caret/selection */
function selectedLineRange(value: string, start: number, end: number) {
  const rangeStart = lineStartAt(value, start);
  // If selection ends at beginning of a line and is non-empty, don't include that line
  const effectiveEnd =
    end > start && end > 0 && value[end - 1] === "\n" ? end - 1 : end;
  const rangeEnd = lineEndAt(value, effectiveEnd);
  return { rangeStart, rangeEnd };
}

export function indentSelection(state: TextSelection): TextSelection {
  const { value, selectionStart, selectionEnd } = state;

  // Single caret, no selection: insert indent at cursor
  if (selectionStart === selectionEnd) {
    const next =
      value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    const pos = selectionStart + INDENT.length;
    return { value: next, selectionStart: pos, selectionEnd: pos };
  }

  const { rangeStart, rangeEnd } = selectedLineRange(
    value,
    selectionStart,
    selectionEnd,
  );
  const block = value.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");
  const indented = lines.map((line) => INDENT + line).join("\n");
  const next =
    value.slice(0, rangeStart) + indented + value.slice(rangeEnd);

  return {
    value: next,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + indented.length,
  };
}

export function outdentSelection(state: TextSelection): TextSelection {
  const { value, selectionStart, selectionEnd } = state;
  const { rangeStart, rangeEnd } = selectedLineRange(
    value,
    selectionStart,
    selectionEnd,
  );
  const block = value.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");

  let removedBeforeCursor = 0;
  let removedTotal = 0;

  const outdented = lines
    .map((line, idx) => {
      let remove = 0;
      if (line.startsWith(INDENT)) {
        remove = INDENT.length;
      } else if (line.startsWith("\t")) {
        remove = 1;
      } else if (line.startsWith(" ")) {
        // strip up to 2 leading spaces
        remove = line.startsWith("  ") ? 2 : 1;
      }
      if (remove === 0) return line;

      // track how many chars removed before original selectionStart
      const lineAbsStart =
        rangeStart +
        lines.slice(0, idx).reduce((acc, l) => acc + l.length + 1, 0);
      if (lineAbsStart < selectionStart) {
        const overlap = Math.min(remove, selectionStart - lineAbsStart);
        removedBeforeCursor += Math.max(0, overlap);
      }
      removedTotal += remove;
      return line.slice(remove);
    })
    .join("\n");

  const next =
    value.slice(0, rangeStart) + outdented + value.slice(rangeEnd);

  if (selectionStart === selectionEnd) {
    const pos = Math.max(rangeStart, selectionStart - removedBeforeCursor);
    return { value: next, selectionStart: pos, selectionEnd: pos };
  }

  return {
    value: next,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + outdented.length,
  };
}
