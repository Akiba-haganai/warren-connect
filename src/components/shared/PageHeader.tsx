type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({
  title,
  subtitle,
}: Props) {
  return (
    <div className="mb-5">
      <h1
        className="text-xl font-bold"
        style={{
          color: "var(--color-text)",
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          className="text-sm mt-1"
          style={{
            color:
              "var(--color-text-secondary)",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}