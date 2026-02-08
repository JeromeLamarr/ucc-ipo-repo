import { ReactNode } from 'react';
import { CARD_VARIANTS } from '../styles/designSystem';

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  flexCol?: boolean;
}

/**
 * Reusable Card Component with Design System Integration
 * Supports multiple variants and hover states
 */
export function Card({
  variant = 'default',
  children,
  className = '',
  onClick,
  hoverable = false,
  flexCol = false,
}: CardProps) {
  const cardVariant = CARD_VARIANTS[variant];

  const baseClasses = `
    group
    ${flexCol ? 'h-full flex flex-col' : ''}
    ${cardVariant.base}
    ${cardVariant.shadow}
    ${hoverable ? cardVariant.hoverShadow : ''}
    ${hoverable ? 'hover:-translate-y-2' : ''}
    p-8 transition-all duration-300
    ${onClick ? 'cursor-pointer' : ''}
    focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500
    ${className}
  `.trim();

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );
}

// ============================================================================
// Card Header Component
// ============================================================================

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function CardHeader({ title, subtitle, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
}

// ============================================================================
// Card Content Component
// ============================================================================

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`flex-grow ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Card Footer Component
// ============================================================================

interface CardFooterProps {
  children: ReactNode;
  className?: string;
  withBorder?: boolean;
}

export function CardFooter({ children, className = '', withBorder = true }: CardFooterProps) {
  return (
    <div className={`
      ${withBorder ? 'mt-6 pt-6 border-t border-gray-100 group-hover:border-blue-300' : 'mt-6'}
      transition-colors
      ${className}
    `}>
      {children}
    </div>
  );
}

export default Card;
