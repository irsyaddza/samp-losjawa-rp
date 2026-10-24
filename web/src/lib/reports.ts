export const REPORT_CATEGORIES = [
  { value: 'cheating', label: 'Cheating / Exploiting' },
  { value: 'harassment', label: 'Harassment / Toxicity' },
  { value: 'scam', label: 'Scamming' },
  { value: 'deathmatch', label: 'Deathmatching' },
  { value: 'bug_abuse', label: 'Bug Abuse' },
  { value: 'advertising', label: 'Advertising / Spam' },
  { value: 'other', label: 'Other' },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['value'];

export const REPORT_STATUSES = [
  {
    value: 'open',
    label: 'Open',
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  },
  {
    value: 'investigating',
    label: 'Investigating',
    className: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    className: 'border-red-500/20 bg-red-500/10 text-red-400',
  },
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number]['value'];

export function getReportCategory(value: string) {
  return REPORT_CATEGORIES.find((category) => category.value === value) || REPORT_CATEGORIES[REPORT_CATEGORIES.length - 1];
}

export function getReportStatus(value: string) {
  return REPORT_STATUSES.find((status) => status.value === value) || REPORT_STATUSES[0];
}
