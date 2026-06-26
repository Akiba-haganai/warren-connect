export default function TermsPage() {
  return (
    <div className="px-4 py-10 max-w-2xl mx-auto" style={{ color: "var(--color-text)" }}>
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        By accessing Warren Connect, you agree to these terms. If you do not agree, please do not use the service.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">2. User Conduct</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        Users must not post harmful, offensive, or illegal content. We reserve the right to remove content and ban accounts at our discretion.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">3. Account Responsibility</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">4. Limitation of Liability</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        Warren Connect is provided "as is". We make no warranties regarding its availability or fitness for a particular purpose.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">5. Contact</h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        Questions? Contact us at support@warrenconnect.app
      </p>
    </div>
  );
}