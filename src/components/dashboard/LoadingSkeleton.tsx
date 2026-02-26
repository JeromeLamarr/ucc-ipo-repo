interface LoadingSkeletonProps {
  color?: string;
}

export function LoadingSkeleton({ color = '#3b82f6' }: LoadingSkeletonProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2"
        style={{ borderBottomColor: color }}
      ></div>
    </div>
  );
}
