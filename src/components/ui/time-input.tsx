"use client";

import { useState } from "react";

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

function parse(value?: string | null) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!m) return { hour: "", minute: "", period: "AM" };
  const h24 = Number(m[1]);
  return { hour: String(h24 % 12 || 12), minute: m[2], period: h24 >= 12 ? "PM" : "AM" };
}

/**
 * 12-hour time picker (hour / minute / AM-PM) that looks the same for every
 * user, unlike <input type="time"> which follows the browser locale. Submits
 * "HH:MM" (24-hour) under `name`, or "" until an hour is picked.
 */
export function TimeInput({
  id,
  name,
  defaultValue,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
}) {
  const initial = parse(defaultValue);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  let value = "";
  if (hour) {
    const h24 = (Number(hour) % 12) + (period === "PM" ? 12 : 0);
    value = `${String(h24).padStart(2, "0")}:${minute || "00"}`;
  }

  return (
    <div className="flex items-center gap-1.5">
      <input type="hidden" name={name} value={value} />
      <select id={id} aria-label="Hour" className={selectClass} value={hour} onChange={(e) => setHour(e.target.value)}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {i + 1}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select aria-label="Minute" className={selectClass} value={minute || "00"} onChange={(e) => setMinute(e.target.value)}>
        {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        {minute && Number(minute) % 5 !== 0 && <option value={minute}>{minute}</option>}
      </select>
      <select aria-label="AM or PM" className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
