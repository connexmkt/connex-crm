export const POST_ROLES = ["BEST", "WORST", "TOP_1", "TOP_2", "TOP_3"] as const;
export type PostRole = (typeof POST_ROLES)[number];

export const REPORT_STATUSES = ["AVAILABLE", "PARTIAL"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const INSTAGRAM_INTEGRATION_STATUSES = [
  "CONNECTED",
  "DISCONNECTED",
  "REQUIRES_RECONNECTION",
] as const;
export type InstagramIntegrationStatus =
  (typeof INSTAGRAM_INTEGRATION_STATUSES)[number];

export const REPORT_TYPES = ["WEEKLY", "MONTHLY"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
