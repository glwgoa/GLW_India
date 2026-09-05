import type { LucideIcon } from "lucide-react";

export function PageHeaderIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-xl backdrop-blur-sm"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)`,
        boxShadow: `0 0 40px -4px color-mix(in srgb, ${color} 85%, transparent)`,
      }}
    >
      <Icon className="size-4.5" style={{ color }} />
    </div>
  );
}
