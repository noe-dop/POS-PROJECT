import React from 'react';

// Fonction utilitaire simple pour fusionner les classes
const cn = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties; // Ajouter cette ligne
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  children,
  style 
}) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200",
        className
      )}
      style={style} // Ajouter cette ligne
    >
      {children}
    </div>
  );
};

// Variantes pré-définies pour différents cas d'usage
interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ 
  lines = 1, 
  className,
  lineClassName 
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4",
            index === lines - 1 ? "w-3/4" : "w-full",
            lineClassName
          )}
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
  withImage?: boolean;
  withFooter?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  className,
  withImage = false,
  withFooter = false 
}) => {
  return (
    <div className={cn("rounded-lg border border-slate-200 p-4", className)}>
      {withImage && (
        <Skeleton className="h-40 w-full mb-4 rounded" />
      )}
      <SkeletonText lines={2} className="mb-4" />
      {withFooter && (
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      )}
    </div>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  withHeader?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ 
  rows = 5,
  columns = 4,
  className,
  withHeader = true 
}) => {
  return (
    <div className={cn("w-full", className)}>
      {withHeader && (
        <div className="flex space-x-4 mb-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-6 flex-1" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4 flex-1",
                  colIndex === columns - 1 ? "w-3/4" : "w-full"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export const SkeletonStats: React.FC<SkeletonStatsProps> = ({ 
  count = 4,
  className 
}) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface SkeletonChartProps {
  className?: string;
  height?: number;
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({ 
  className,
  height = 300 
}) => {
  return (
    <div className={cn("rounded-lg border border-slate-200 p-4", className)}>
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton 
        className="rounded w-full" 
        style={{ height: `${height}px` }} // Maintenant ça fonctionne
      />
    </div>
  );
};

interface SkeletonProductListProps {
  count?: number;
  className?: string;
}

export const SkeletonProductList: React.FC<SkeletonProductListProps> = ({ 
  count = 5,
  className 
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface SkeletonActivityListProps {
  count?: number;
  className?: string;
}

export const SkeletonActivityList: React.FC<SkeletonActivityListProps> = ({ 
  count = 5,
  className 
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Export par défaut
export default Skeleton;