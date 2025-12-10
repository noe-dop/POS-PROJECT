import React from 'react';

// Fonction utilitaire pour fusionner les classes
const cn = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Types des variants
export type BadgeVariant = 
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}

// Configuration des variants
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200',
  secondary: 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200',
  destructive: 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200',
  outline: 'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50',
  success: 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200',
  info: 'bg-cyan-100 text-cyan-800 border border-cyan-200 hover:bg-cyan-200'
};

// Configuration des tailles
const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  onClick,
  title,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const badgeClass = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    onClick && 'cursor-pointer',
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={badgeClass}
        onClick={onClick}
        title={title}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={badgeClass}
      title={title}
      {...props}
    >
      {children}
    </span>
  );
};

// Composant Badge avec icône
interface BadgeWithIconProps extends BadgeProps {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const BadgeWithIcon: React.FC<BadgeWithIconProps> = ({
  icon,
  iconPosition = 'left',
  children,
  ...badgeProps
}) => {
  return (
    <Badge {...badgeProps}>
      <div className={cn(
        'flex items-center gap-1',
        iconPosition === 'right' && 'flex-row-reverse'
      )}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </div>
    </Badge>
  );
};

// Badge de statut prédéfini
interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  ...badgeProps
}) => {
  const statusConfig = {
    active: {
      label: 'Actif',
      variant: 'success' as BadgeVariant,
      icon: '🟢'
    },
    inactive: {
      label: 'Inactif',
      variant: 'secondary' as BadgeVariant,
      icon: '⚫'
    },
    pending: {
      label: 'En attente',
      variant: 'warning' as BadgeVariant,
      icon: '🟡'
    },
    approved: {
      label: 'Approuvé',
      variant: 'success' as BadgeVariant,
      icon: '✅'
    },
    rejected: {
      label: 'Rejeté',
      variant: 'destructive' as BadgeVariant,
      icon: '❌'
    },
    completed: {
      label: 'Terminé',
      variant: 'success' as BadgeVariant,
      icon: '✅'
    },
    cancelled: {
      label: 'Annulé',
      variant: 'destructive' as BadgeVariant,
      icon: '🚫'
    }
  };

  const config = statusConfig[status];

  return (
    <BadgeWithIcon
      variant={config.variant}
      icon={showIcon ? config.icon : undefined}
      {...badgeProps}
    >
      {config.label}
    </BadgeWithIcon>
  );
};

// Badge de stock
interface StockBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  stock: number;
  lowStockThreshold?: number;
  showText?: boolean;
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  stock,
  lowStockThreshold = 5,
  showText = true,
  ...badgeProps
}) => {
  const getStockConfig = (stock: number) => {
    if (stock === 0) {
      return {
        variant: 'destructive' as BadgeVariant,
        icon: '❌',
        text: 'Rupture'
      };
    }
    if (stock < lowStockThreshold) {
      return {
        variant: 'warning' as BadgeVariant,
        icon: '⚠️',
        text: `Stock faible (${stock})`
      };
    }
    return {
      variant: 'success' as BadgeVariant,
      icon: '✅',
      text: `En stock (${stock})`
    };
  };

  const config = getStockConfig(stock);

  return (
    <BadgeWithIcon
      variant={config.variant}
      icon={config.icon}
      {...badgeProps}
    >
      {showText ? config.text : stock.toString()}
    </BadgeWithIcon>
  );
};

// Badge de priorité
interface PriorityBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  priority: 'low' | 'medium' | 'high' | 'critical';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  ...badgeProps
}) => {
  const priorityConfig = {
    low: {
      label: 'Basse',
      variant: 'secondary' as BadgeVariant,
      icon: '🔵'
    },
    medium: {
      label: 'Moyenne',
      variant: 'info' as BadgeVariant,
      icon: '🟡'
    },
    high: {
      label: 'Haute',
      variant: 'warning' as BadgeVariant,
      icon: '🟠'
    },
    critical: {
      label: 'Critique',
      variant: 'destructive' as BadgeVariant,
      icon: '🔴'
    }
  };

  const config = priorityConfig[priority];

  return (
    <BadgeWithIcon
      variant={config.variant}
      icon={showIcon ? config.icon : undefined}
      {...badgeProps}
    >
      {config.label}
    </BadgeWithIcon>
  );
};

// Export composé pour une utilisation facile
export const BadgeCompound = {
  Base: Badge,
  WithIcon: BadgeWithIcon,
  Status: StatusBadge,
  Stock: StockBadge,
  Priority: PriorityBadge,
};

export default Badge;