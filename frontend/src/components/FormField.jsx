import { AlertCircle } from 'lucide-react';

/**
 * Form field component with error handling
 */
export default function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  required = false,
  disabled = false,
  register,
  className = '',
  ...props
}) {
  const baseInputClasses = `
    w-full px-4 py-2.5 border rounded-lg transition-colors
    focus:outline-none focus:ring-2
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    min-h-[44px]
  `;

  const errorClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-green-500 focus:ring-green-200';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseInputClasses} ${errorClasses}`}
        {...(register ? register(name) : {})}
        {...props}
      />

      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Textarea field component
 */
export function TextAreaField({
  label,
  name,
  placeholder,
  error,
  required = false,
  disabled = false,
  register,
  rows = 4,
  className = '',
  ...props
}) {
  const baseInputClasses = `
    w-full px-4 py-2.5 border rounded-lg transition-colors
    focus:outline-none focus:ring-2
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
  `;

  const errorClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-green-500 focus:ring-green-200';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`${baseInputClasses} ${errorClasses} resize-none`}
        {...(register ? register(name) : {})}
        {...props}
      />

      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Select field component
 */
export function SelectField({
  label,
  name,
  options = [],
  error,
  required = false,
  disabled = false,
  register,
  placeholder = 'Select an option',
  className = '',
  ...props
}) {
  const baseInputClasses = `
    w-full px-4 py-2.5 border rounded-lg transition-colors
    focus:outline-none focus:ring-2
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    min-h-[44px]
  `;

  const errorClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-green-500 focus:ring-green-200';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={name}
        name={name}
        disabled={disabled}
        className={`${baseInputClasses} ${errorClasses}`}
        {...(register ? register(name) : {})}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
