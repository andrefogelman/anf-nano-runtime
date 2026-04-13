import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatBRL, formatNumber, formatPercent, parseBRNumber } from "@/lib/format";

type CellType = "text" | "number" | "currency" | "percent" | "unit" | "readonly-currency" | "readonly-number";

export type NavigateDirection = "up" | "down" | "left" | "right" | "tab" | "shift-tab";

interface BudgetCellProps {
  value: string | number | null;
  type: CellType;
  onChange: (value: string | number) => void;
  className?: string;
  readOnly?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onNavigate?: (direction: NavigateDirection) => void;
}

export function BudgetCell({
  value,
  type,
  onChange,
  className,
  readOnly,
  focused,
  onFocus,
  onNavigate,
}: BudgetCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const isReadOnly = readOnly || type.startsWith("readonly");

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Focus cell div when focused externally
  useEffect(() => {
    if (focused && !editing && cellRef.current) {
      cellRef.current.focus();
    }
  }, [focused, editing]);

  function displayValue(): string {
    if (value === null || value === undefined || value === "") return "\u2014";
    switch (type) {
      case "currency":
      case "readonly-currency":
        return formatBRL(Number(value));
      case "number":
      case "readonly-number":
        return formatNumber(Number(value));
      case "percent":
        return formatPercent(Number(value));
      case "unit":
      case "text":
      default:
        return String(value);
    }
  }

  function startEditing() {
    if (isReadOnly) return;
    setEditing(true);
    setEditValue(value !== null && value !== undefined ? String(value) : "");
  }

  function commitValue() {
    if (type === "currency" || type === "number" || type === "percent") {
      const parsed = parseBRNumber(editValue);
      onChange(parsed);
    } else {
      onChange(editValue);
    }
  }

  function handleBlur() {
    if (editing) {
      setEditing(false);
      commitValue();
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      setEditing(false);
      commitValue();
      onNavigate?.("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      setEditing(false);
      commitValue();
      onNavigate?.(e.shiftKey ? "shift-tab" : "tab");
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  }

  // Cell div handles keyboard when focused but NOT editing
  function handleCellKeyDown(e: React.KeyboardEvent) {
    if (editing) return;

    if (e.key === "ArrowUp") { e.preventDefault(); onNavigate?.("up"); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); onNavigate?.("down"); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); onNavigate?.("left"); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); onNavigate?.("right"); return; }
    if (e.key === "Tab") { e.preventDefault(); onNavigate?.(e.shiftKey ? "shift-tab" : "tab"); return; }
    if (e.key === "Enter") { e.preventDefault(); startEditing(); return; }

    // Any printable character starts editing (like Excel)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !isReadOnly) {
      e.preventDefault();
      setEditing(true);
      setEditValue(e.key);
    }

    // Delete/Backspace clears the cell
    if ((e.key === "Delete" || e.key === "Backspace") && !isReadOnly) {
      e.preventDefault();
      setEditing(true);
      setEditValue("");
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleInputKeyDown}
        className={cn(
          "w-full border-none bg-transparent px-2 py-1 text-sm outline-none ring-2 ring-primary/50",
          className
        )}
      />
    );
  }

  return (
    <div
      ref={cellRef}
      tabIndex={focused ? 0 : -1}
      onClick={() => onFocus?.()}
      onDoubleClick={startEditing}
      onKeyDown={handleCellKeyDown}
      className={cn(
        "cursor-default select-none truncate px-2 py-1 text-sm outline-none",
        !isReadOnly && "cursor-cell",
        focused && "ring-2 ring-primary/60 bg-primary/5",
        !focused && !isReadOnly && "hover:bg-accent/30",
        className
      )}
      title={displayValue()}
    >
      {displayValue()}
    </div>
  );
}
