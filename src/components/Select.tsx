import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "./icons";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: readonly SelectOption[] | SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

type MenuBox = { top: number; left: number; width: number; maxHeight: number };

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<MenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const current =
    options.find((o) => o.value === value)?.label ?? value ?? "选择…";

  const measure = () => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(260, preferBelow ? spaceBelow : spaceAbove);
    const top = preferBelow ? r.bottom + 6 : Math.max(8, r.top - maxHeight - 6);
    setBox({
      top,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(120, maxHeight),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    measure();
    const onScroll = () => measure();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && box
      ? createPortal(
          <ul
            ref={menuRef}
            className="ui-select__menu"
            role="listbox"
            id={listId}
            style={{
              position: "fixed",
              top: box.top,
              left: box.left,
              width: box.width,
              maxHeight: box.maxHeight,
            }}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`ui-select__option ${active ? "is-active" : ""}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      className={`ui-select ${open ? "is-open" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className="ui-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ui-select__value">{current}</span>
        <IconChevronDown size={15} className="ui-select__chevron" />
      </button>
      {menu}
    </div>
  );
}
