import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Brand header */}
      <div className="pt-safe pt-14 pb-8 px-6 text-center">
        {/* Logo */}
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <span className="text-2xl font-bold text-white">W</span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          Warren Connect
        </h1>
        <p
          className="text-sm mt-1.5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your warren, connected
        </p>
      </div>

      {/* Page content */}
      <div className="flex-1 flex flex-col px-5 pb-safe pb-10">
        <Outlet />
      </div>
    </div>
  );
}