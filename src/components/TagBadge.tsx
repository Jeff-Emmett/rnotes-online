interface TagBadgeProps {
  name: string;
  color?: string | null;
  onClick?: () => void;
}

export function TagBadge({ name, color, onClick }: TagBadgeProps) {
  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color || '#6b7280' }}
      />
      {name}
    </Component>
  );
}
