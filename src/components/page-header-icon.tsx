import type { LucideIcon } from "lucide-react";

export function PageHeaderIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <Icon className="size-4.5" style={{ color }} />
    </div>
  );
}
