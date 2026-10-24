export type AppealStatus = 'open' | 'accepted' | 'rejected';

export function getAppealStatus(status: string) {
  switch (status) {
    case 'accepted':
      return {
        label: 'Accepted',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'border-red-500/20 bg-red-500/10 text-red-400',
      };
    default:
      return {
        label: 'Under review',
        className: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
      };
  }
}
