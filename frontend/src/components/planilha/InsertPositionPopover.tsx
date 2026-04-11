import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  buildInsertPositionOptions,
  type EapLevel,
  type InsertPositionOption,
} from "@/lib/eap";
import type { OrcamentoItem } from "@/types/orcamento";

interface InsertPositionPopoverProps {
  level: EapLevel;
  items: OrcamentoItem[];
  onSelect: (parentPrefix: string, atPosition: number) => void;
  children: React.ReactNode;
}

export function InsertPositionPopover({
  level,
  items,
  onSelect,
  children,
}: InsertPositionPopoverProps) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => buildInsertPositionOptions(items, level), [items, level]);

  // If there are no options (empty spreadsheet or no valid parent for this level),
  // insert directly at start without opening the popover
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (options.length === 0) {
      e.preventDefault();
      onSelect("", 1);
      return;
    }
  };

  const handlePick = (opt: InsertPositionOption) => {
    setOpen(false);
    onSelect(opt.parentPrefix, opt.atPosition);
  };

  // Group options by `group` (then subgroup) for rendering
  const grouped = useMemo(() => {
    const map = new Map<string, InsertPositionOption[]>();
    for (const opt of options) {
      const key = opt.group ?? "__ungrouped__";
      const arr = map.get(key) ?? [];
      arr.push(opt);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={handleTriggerClick}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput placeholder="Onde inserir?" />
          <CommandList>
            <CommandEmpty>Nenhuma posição</CommandEmpty>
            {grouped.map(([groupLabel, opts]) => (
              <CommandGroup
                key={groupLabel}
                heading={groupLabel === "__ungrouped__" ? undefined : groupLabel}
              >
                {opts.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={`${opt.group ?? ""}|${opt.subgroup ?? ""}|${opt.label}`}
                    onSelect={() => handlePick(opt)}
                    className={opt.highlighted ? "font-semibold" : undefined}
                  >
                    {opt.subgroup && (
                      <span className="text-xs text-muted-foreground mr-2">
                        {opt.subgroup}
                      </span>
                    )}
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
