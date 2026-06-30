import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeriodKey, PeriodRange } from "@/lib/primor";

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mês atual" },
  { key: "all", label: "Tudo" },
];

export function PeriodFilter({
  value,
  onChange,
  custom,
  onCustomChange,
}: {
  value: PeriodKey;
  onChange: (k: PeriodKey) => void;
  custom: PeriodRange;
  onCustomChange: (r: PeriodRange) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          size="sm"
          variant={value === p.key ? "default" : "outline"}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={value === "custom" ? "default" : "outline"}
            className={cn("gap-2")}
          >
            <CalendarIcon className="h-4 w-4" />
            {value === "custom" && custom.from && custom.to
              ? `${custom.from.toLocaleDateString("pt-BR")} – ${custom.to.toLocaleDateString("pt-BR")}`
              : "Personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from: custom.from ?? undefined, to: custom.to ?? undefined }}
            onSelect={(range) => {
              onCustomChange({ from: range?.from ?? null, to: range?.to ?? null });
              if (range?.from && range?.to) {
                onChange("custom");
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
