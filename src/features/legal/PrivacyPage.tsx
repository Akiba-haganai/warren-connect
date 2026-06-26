export default function PrivacyPage() {
  return (
    <div className="px-4 py-10 max-w-2xl mx-auto" style={{ color: "var(--color-text)" }}>
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Information We Collect</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        We collect your name, email, university, and any content you post. We also use cookies for authentication.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        Your data helps us provide personalised content, connect you with other students, and improve our service.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">3. Data Sharing</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        We do not sell your data. Profile information is visible to other users as described in the app.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">4. Security</h2>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
        We take reasonable measures to protect your data, but no transmission is 100% secure.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">5. Contact</h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        For privacy questions, email us at privacy@warrenconnect.app
      </p>
    </div>
  );
}