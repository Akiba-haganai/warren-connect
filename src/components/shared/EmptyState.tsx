type Props = {
  icon: string;
  title: string;
  text: string;
};

export default function EmptyState({
  icon,
  title,
  text,
}: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon}
      </div>

      <div className="empty-state-title">
        {title}
      </div>

      <div className="empty-state-text">
        {text}
      </div>
    </div>
  );
}