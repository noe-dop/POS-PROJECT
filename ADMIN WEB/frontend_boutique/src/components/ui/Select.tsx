// src/components/ui/Select.tsx
import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  error,
  className = ''
}) => {
  return (
    <div className="w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors bg-white
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};