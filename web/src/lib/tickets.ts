export const TICKET_CATEGORIES = [
  { value: 'report', label: 'Report Player' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'appeal', label: 'Ban Appeal' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'name_change', label: 'Name Change' },
  { value: 'other', label: 'Other' },
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]['value'];

export const TICKET_STATUSES = [
  {
    value: 'open',
    label: 'Open',
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    className: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  },
  {
    value: 'closed',
    label: 'Closed',
    className: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  },
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number]['value'];

export const TICKET_PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    className: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  },
  {
    value: 'normal',
    label: 'Normal',
    className: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  },
  {
    value: 'high',
    label: 'High',
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    className: 'border-red-500/20 bg-red-500/10 text-red-400',
  },
] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number]['value'];

export function getTicketCategory(value: string) {
  return TICKET_CATEGORIES.find((category) => category.value === value) || TICKET_CATEGORIES[TICKET_CATEGORIES.length - 1];
}

export function getTicketStatus(value: string) {
  return TICKET_STATUSES.find((status) => status.value === value) || TICKET_STATUSES[0];
}

export function getTicketPriority(value: string) {
  return TICKET_PRIORITIES.find((priority) => priority.value === value) || TICKET_PRIORITIES[1];
}

export interface TicketRecord {
  id: number;
  account_id?: number;
  username: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  assigned_to?: number | null;
  assigned_username: string | null;
  created_at: string;
  updated_at: string;
  last_reply_at: string | null;
}

export interface TicketMessageRecord {
  id: number;
  author_username: string;
  is_staff: number | boolean;
  body: string;
  created_at: string;
}
