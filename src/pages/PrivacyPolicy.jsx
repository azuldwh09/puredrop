export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 max-w-2xl mx-auto">
      <h1 className="font-pixel text-primary text-lg mb-6">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-6">Last updated: April 27, 2026</p>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">1. Overview</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          PureDrop ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we handle information when you use our web and mobile application PureDrop (the "App"). By using the App, you agree to the collection and use of information in accordance with this policy.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">2. Information We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We collect only the minimum information necessary to provide the App's functionality:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Email address (for account creation and login)</li>
          <li>Game progress data (level scores, cup count, selected skin)</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          We do <strong>not</strong> directly collect any sensitive personal data such as location, contacts, or financial information.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">3. Advertising & Third-Party Services</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          PureDrop uses <strong>Google AdSense</strong> to display advertisements. Google AdSense may use cookies, web beacons, and similar tracking technologies to serve ads based on your prior visits to this App and other websites.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our App and/or other sites on the Internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Ads Settings</a>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          For more information on how Google uses data when you use our App, please visit: <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-primary underline">How Google uses information from sites or apps that use our services</a>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We also use rewarded ad breaks (H5 Games Ads API) to allow users to earn in-game items by voluntarily watching short video advertisements.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">4. Cookies & Tracking Technologies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          Our App uses cookies and similar tracking technologies. Cookies are small data files placed on your device. We use:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><strong>Essential cookies:</strong> Required for login, session management, and core app functionality.</li>
          <li><strong>Advertising cookies:</strong> Set by Google AdSense to deliver relevant advertisements and measure ad performance.</li>
          <li><strong>Preference cookies:</strong> Store your in-app preferences such as sound settings and dark/light mode.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          You can control or disable cookies through your browser or device settings. Note that disabling cookies may affect App functionality.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">5. Camera Permission</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The App may request the <strong>android.permission.CAMERA</strong> permission as part of the underlying platform used to build the App. However, <strong>PureDrop does not use your camera in any way</strong>. We do not access, capture, store, or transmit any camera data or images. This permission is not actively used by the App.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">6. How We Use Your Information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The information we collect is used to:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
          <li>Authenticate your account</li>
          <li>Save and restore your game progress</li>
          <li>Display the global leaderboard</li>
          <li>Improve the App experience</li>
          <li>Serve advertisements through Google AdSense</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">7. Data Sharing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We do not sell your personal data. We may share information in the following limited circumstances:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><strong>Google AdSense:</strong> Advertising data (including cookies and usage data) is shared with Google to serve and measure ads. See Google's <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Privacy Policy</a>.</li>
          <li><strong>Legal requirements:</strong> We may disclose data if required by law or to protect our legal rights.</li>
          <li><strong>Service providers:</strong> We use Base44 as our backend platform, which processes data on our behalf under appropriate data protection agreements.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">8. Data Retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your data is retained as long as your account is active. You may delete your account at any time via the Settings menu within the App, which will remove all associated data.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">9. Children's Privacy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          PureDrop is intended for users aged <strong>13 and older</strong>. The App is not directed at children under the age of 13, and we do not knowingly collect personal information from children under 13.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are a parent or guardian and believe your child under 13 has provided us with personal information, please contact us immediately at the address below and we will delete such information promptly.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">10. Your Rights</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          Depending on your jurisdiction, you may have the right to:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Opt out of personalized advertising</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          To exercise these rights, please contact us at the address in Section 13.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">11. Changes to This Policy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. Any changes will be posted within the App with an updated "Last updated" date. Continued use of the App after changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="mb-6 border border-destructive/30 rounded-xl p-4 bg-destructive/5">
        <h2 className="font-semibold text-base mb-2 text-destructive" id="deletion">12. Account & Data Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          You have the right to request deletion of your account and all associated data at any time. You can do this in two ways:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
          <li><strong>In-app:</strong> Go to Settings → Delete Account inside the PureDrop app.</li>
          <li><strong>By email:</strong> Send a deletion request to <strong>puredropgame@gmail.com</strong> and we will process it within 30 days.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upon deletion, we will permanently remove your email address, game progress, level scores, and all other associated data from our systems.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-base mb-2">13. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have any questions about this Privacy Policy, wish to exercise your data rights, or need to report a privacy concern, please contact us at:
        </p>
        <p className="text-sm text-primary mt-2 font-semibold">puredropgame@gmail.com</p>
      </section>
    </div>
  );
}