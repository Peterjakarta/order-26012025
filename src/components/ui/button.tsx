import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'relative flex items-center gap-2 font-medium transition-all duration-300 rounded-lg';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const variantStyles = {
    primary: `bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 
      hover:shadow-glass hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed 
      disabled:transform-none disabled:hover:shadow-none overflow-hidden after:absolute after:inset-0 
      after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full 
      hover:after:translate-x-full after:transition-transform after:duration-500`,
    
    secondary: `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50/80 transition-all duration-300 
      hover:shadow-soft hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm bg-white/50`,
    
    outline: `border border-gray-200 hover:bg-gray-50 text-gray-600`,
    
    ghost: `text-gray-600 hover:bg-gray-50 hover:text-gray-900`,
    
    danger: `bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 
      hover:shadow-glass hover:scale-[1.02] active:scale-[0.98]`,
    
    success: `bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 
      hover:shadow-glass hover:scale-[1.02] active:scale-[0.98]`
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
    </button>
  );
}