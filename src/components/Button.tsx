import { ReactNode } from 'react';
import { BUTTON_VARIANTS, TRANSITIONS, SPACING } from '../styles/designSystem';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Reusable Button Component with Design System Integration
 * Supports multiple variants, sizes, and states
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  type = 'button',
}: ButtonProps) {
  const variantStyles = BUTTON_VARIANTS[variant];

  // Size-based padding
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-10 py-5 text-lg',
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl
    transition-all duration-${TRANSITIONS.base}
    ${variantStyles.base}
    ${variantStyles.hover}
    ${variantStyles.focus}
    ${sizeStyles[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${fullWidth ? 'w-full' : ''}
    ${variant === 'primary' ? 'shadow-lg hover:shadow-2xl hover:scale-105' : ''}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
    >
      {icon && iconPosition === 'left' && <span>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
}

export default Button;
