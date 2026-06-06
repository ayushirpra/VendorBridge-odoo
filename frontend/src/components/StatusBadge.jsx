/**
 * Consistent status badge component with color system
 */

const statusConfig = {
  // Vendor statuses
  active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Active' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Pending' },
  blocked: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Blocked' },
  
  // RFQ statuses
  draft: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Draft' },
  published: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Published' },
  closed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: 'Closed' },
  
  // Quotation statuses
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Submitted' },
  selected: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Selected' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Rejected' },
  
  // Approval statuses
  approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Approved' },
  
  // PO statuses
  paid: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Paid' },
  pending_payment: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Pending Payment' },
  
  // Generic statuses
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Success' },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Error' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Warning' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Info' }
};

export default function StatusBadge({ status, label, className = '' }) {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.info;
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
