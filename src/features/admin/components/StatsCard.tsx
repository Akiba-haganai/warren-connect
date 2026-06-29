interface Props {
  icon: React.FC<{ size?: number }>;
  label: string;
  value: number;
  color: string;
}

export default function StatsCard({ icon: Icon, label, value, color }: Props) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color }}>{value || 0}</p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      </div>
    </div>
  );
}