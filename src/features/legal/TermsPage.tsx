export default function TermsPage() {
  return (
    <div className="px-4 py-10 max-w-2xl mx-auto space-y-6" style={{ color: "var(--color-text)" }}>
      <div>
        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Last updated: August 13, 2026</p>
      </div>

      <section>
        <h2 className="text-base font-bold mb-2">1. Acceptance of Terms</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          By creating an account or accessing Warren Connect, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must immediately cease using the platform.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">2. Eligibility & Age Restriction</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          You must be at least 18 years of age or an enrolled tertiary student to register and use Warren Connect. By registering, you warrant that you meet these eligibility criteria.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">3. User Conduct & Prohibited Items</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Users agree not to post, list, or transmit any content or items that are illegal, fraudulent, harmful, or offensive. Prohibited items on the marketplace include weapons, illegal substances, counterfeit goods, stolen property, and adult content. We reserve the right to remove any content and ban accounts at our sole discretion.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">4. Marketplace & Housing Disclaimer</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Warren Connect is a communications platform facilitating peer-to-peer listings. We do not own, inspect, guarantee, or warrant any products, goods, or accommodation listings offered by users. All peer-to-peer transactions, sublets, and agreements are conducted entirely at your own risk. Users are advised to inspect items and premises in person before sending payments.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">5. User-Generated Content & Licensing</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          You retain ownership of all photos, text, and data you submit. By uploading content to Warren Connect, you grant us a worldwide, non-exclusive, royalty-free licence to store, display, and distribute your content solely for operating and promoting the platform.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">6. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Warren Connect is provided on an "as is" and "as available" basis without warranties of any kind. To the maximum extent permitted by law, Warren Connect shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the platform.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">7. Governing Law & Jurisdiction</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          These terms are governed by and construed in accordance with the laws of the Republic of Zambia. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Zambia.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold mb-2">8. Contact Us</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          If you have questions regarding these Terms of Service, please contact us at support@warrenconnect.app
        </p>
      </section>
    </div>
  );
}