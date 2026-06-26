import { InternStatus } from '../types';

const config: Record<InternStatus, string> = {
  Applied: 'bg-blue-100 text-blue-700',
  Matched: 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-green-100 text-green-700',
  Waitlisted: 'bg-orange-100 text-orange-700',
  Allotted: 'bg-gray-100 text-gray-600',
  YetToJoin: 'bg-purple-100 text-purple-700',
  Left: 'bg-pink-100 text-pink-700',
};

export default function StatusBadge({ status }: { status: InternStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config[status]}`}>
      {status}
    </span>
  );
}
