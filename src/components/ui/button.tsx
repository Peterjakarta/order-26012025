import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  active?: boolean;
  rounded?: 'default' | 'full' | 'none';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading,
  active,
  rounded = 'default',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5'
  };

  const roundedStyles = {
    default: 'rounded-lg',
    full: 'rounded-full',
    none: 'rounded-none'
  };

  const variantStyles = {
    primary: `bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 
      hover:shadow-lg hover:shadow-pink-500/20 active:shadow-none active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed 
      disabled:hover:shadow-none disabled:active:scale-100`,
    
    secondary: `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900
      hover:shadow-sm active:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200`,
    
    outline: `border border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700 
      active:bg-pink-100 disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent`,
    
    ghost: `bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:hover:bg-transparent`,
    
    danger: `bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 
      hover:shadow-lg hover:shadow-red-500/20 active:shadow-none active:scale-[0.98] disabled:opacity-70`,
    
    success: `bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 
      hover:shadow-lg hover:shadow-green-500/20 active:shadow-none active:scale-[0.98] disabled:opacity-70`,
      
    gradient: `bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white
      hover:shadow-lg hover:shadow-purple-500/30 active:shadow-none active:scale-[0.98] 
      hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 disabled:opacity-70`
  };

  // Handle active state styling
  const activeStyles = active ? 'ring-2 ring-offset-2 ring-pink-500 shadow-lg' : '';

  // Loading state
  const isLoading = loading || false;
  
  // Disable button if loading
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${roundedStyles[rounded]} ${variantStyles[variant]} ${activeStyles} ${className} ${isLoading ? 'cursor-wait' : ''}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
        </span>
      )}
      
      <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {icon && iconPosition === 'left' && (
          <span className="inline-flex">{icon}</span>
        )}
        
        {children}
        
        {icon && iconPosition === 'right' && (
          <span className="inline-flex">{icon}</span>
        )}
      </span>
    </button>
  );
}