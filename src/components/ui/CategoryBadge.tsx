import { getCategoryConfig } from '@/lib/categories';

interface CategoryBadgeProps {
  category: string;
  small?: boolean;
}

export default function CategoryBadge({ category, small }: CategoryBadgeProps) {
  const cfg = getCategoryConfig(category);
  return (
    <span
      className="category-badge"
      style={{
        background: cfg.bgColor,
        color: cfg.color,
        fontSize: small ? 11 : 12,
        padding: small ? '2px 8px' : '4px 10px',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center' }}><cfg.icon size={small ? 12 : 14} /></span>
      <span>{cfg.label}</span>
    </span>
  );
}
