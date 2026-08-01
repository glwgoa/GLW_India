export const LOW_STOCK_THRESHOLD = 10;

export const PROJECT_STATUSES = ["active", "in_progress", "completed", "on_hold"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
