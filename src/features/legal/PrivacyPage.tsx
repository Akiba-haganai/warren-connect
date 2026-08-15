export default function PrivacyPage() {
  return (
    <div className="px-4 py-10 max-w-2xl mx-auto space-y-6" style={{ color: "var(--color-text)" }}>
      <div>
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Last updated: August 13, 2026</p>
      </div>

      <section>
        <h2 className="text-base font-bold mb-2">1. Information We Collect</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          We collect personal data provided directly by you, including your name, email address, phone number, university, course, profile bio, avatar image, and content you create (posts, listings, messages). We also automatically store technical session tokens in local browser storage required for authentication.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">2. Legal Basis for Data Processing</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          We process your personal data under the following legal bases:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mt-1" style={{ color: "var(--color-text-secondary)" }}>
          <li><strong>Contractual Necessity:</strong> To provide account authentication, peer-to-peer messaging, and marketplace features.</li>
          <li><strong>Legitimate Interests:</strong> To moderate content, prevent fraud, and ensure platform safety.</li>
          <li><strong>Consent:</strong> When you voluntarily submit verification documents or opt into notifications.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">3. Third-Party Data Processors & Automated Moderation</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          We do not sell your personal data. We utilize trusted third-party infrastructure providers to operate the service:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mt-1" style={{ color: "var(--color-text-secondary)" }}>
          <li><strong>Supabase Inc.:</strong> Database, user authentication, and secure file storage (hosted on EU/US cloud servers).</li>
          <li><strong>OpenAI LLC:</strong> Automated text and image moderation scanning to block harmful or illegal content. Content sent for moderation scanning is processed transiently and is not stored or used by OpenAI to train AI models.</li>
          <li><strong>Payment Providers (Airtel / MTN):</strong> Processing mobile money escrow transactions directly through encrypted APIs.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">4. Verification Documents & Sensitive Personal Data</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          When you upload a student ID or national document for verification, the file is stored in a private, encrypted storage bucket. Document files are accessible exclusively to authorized platform administrators via temporary signed access links and are never publicly indexed or accessible by other users.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">5. Data Retention & Right to Erasure (GDPR Art. 17)</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Your data is retained for as long as your account remains active. You have the right to request full account deletion at any time via the "Request Account Deletion" option in Settings. Account deletion requests are processed within 30 days, purging your personal profile, listings, and messages.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">6. Your Data Rights</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Under applicable data protection laws, you have the right to access, rectify, port, or request erasure of your personal data, as well as the right to object to or restrict certain processing activities. To exercise any of these rights, please contact our Data Protection Officer at privacy@plawza.com.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">7. Contact & Complaints</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          If you have questions or concerns regarding this Privacy Policy, email us at privacy@plawza.com.
        </p>
      </section>
    </div>
  );
}