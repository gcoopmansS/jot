import Link from "next/link";

/**
 * Privacy Policy page.
 *
 * Accessible to all visitors (logged in or out) per GDPR requirements —
 * privacy policies must be readable before account creation.
 *
 * Uses semantic HTML for document structure (h1, h2, ul, li) and
 * the app's typography system for readability.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header - minimal, just branding + back link */}
      <header className="border-b border-[var(--line)] bg-[var(--paper-raised)]">
        <div className="max-w-3xl mx-auto px-10 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Jot
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors underline"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Back to home
          </Link>
        </div>
      </header>

      {/* Main content - constrained width for readability */}
      <main className="max-w-3xl mx-auto px-10 py-12">
        <article
          className="prose prose-ink"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          {/* Document title */}
          <h1
            className="text-4xl font-semibold text-[var(--ink)] mb-2"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Privacy Policy
          </h1>

          <p className="text-sm text-[var(--ink-soft)] mb-8">
            <em>Last updated: July 17, 2026</em>
          </p>

          {/* Who we are */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Who we are
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            Jot is provided by Gil Coopmans, based in Herentals, Belgium. If you
            have questions about this policy or how your data is handled,
            contact:{" "}
            <a
              href="mailto:gcoopmans@gmail.com"
              className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
            >
              gcoopmans@gmail.com
            </a>
            .
          </p>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            For the purposes of data protection law, Gil Coopmans is the
            &quot;data controller&quot; for the personal data described below.
          </p>

          {/* What data we collect */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            What data we collect
          </h2>
          <ul className="list-disc pl-6 space-y-3 mb-6 text-[var(--ink)]">
            <li>
              <strong>Account information</strong>: your email address and
              password (the password itself is never stored in readable form —
              Supabase Auth handles this using industry-standard hashing).
            </li>
            <li>
              <strong>Content you create</strong>: notes, titles, project names,
              meeting/topic names, and any text you write within the app.
            </li>
            <li>
              <strong>Basic technical data</strong>: standard web server logs
              (e.g. IP address, browser type, request timestamps) generated
              automatically by our hosting provider (Vercel) as part of normal
              operation — not used for tracking or profiling.
            </li>
          </ul>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            We do not currently use any analytics or advertising cookies. If
            this changes in the future, this policy — and the cookie consent
            mechanism on the site — will be updated before any such tool is
            added.
          </p>

          {/* Why we process this data */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Why we process this data (legal basis)
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            We process your account and note data because it&apos;s necessary to
            provide the service you&apos;ve signed up for (performance of a
            contract, under Article 6(1)(b) GDPR) — in plain terms: we
            can&apos;t let you use a notetaking app without storing your notes.
          </p>

          {/* Where your data is stored */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Where your data is stored
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            Your account and note data is stored in a Supabase database located
            in the <strong>eu-west-1 (Ireland)</strong> AWS region — within the
            European Union. [Confirm: if your Vercel deployment&apos;s function
            region is also within the EU, your data does not need to leave the
            EU at any point in normal operation. If any part of your
            infrastructure sits outside the EU, add a short paragraph here
            noting that Supabase and Vercel, as our processors, rely on Standard
            Contractual Clauses for any such transfer, which is a standard,
            GDPR-recognized safeguard.]
          </p>

          {/* Who else processes your data */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Who else processes your data (our processors)
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            We use the following third-party services to run Jot, each of which
            processes data on our behalf under their own data processing
            agreements:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-6 text-[var(--ink)]">
            <li>
              <strong>Supabase</strong> — database hosting and authentication
            </li>
            <li>
              <strong>Vercel</strong> — application hosting
            </li>
          </ul>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            Neither of these companies uses your data for their own purposes —
            they act strictly as processors on our instructions.
          </p>

          {/* How long we keep your data */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            How long we keep your data
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            We keep your account and note data for as long as your account
            remains active. If you delete your account, all of your data —
            account details and every note, project, meeting, and topic
            you&apos;ve created — is permanently deleted immediately. This
            action cannot be undone.
          </p>

          {/* Your rights */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Your rights
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            Under GDPR, you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4 text-[var(--ink)]">
            <li>
              <strong>Access</strong> the personal data we hold about you
            </li>
            <li>
              <strong>Correct</strong> inaccurate data
            </li>
            <li>
              <strong>Delete </strong> your data (&quot;right to be
              forgotten&quot;)
            </li>
            <li>
              <strong>Export</strong> your data in a portable format
            </li>
            <li>
              <strong>Object to or restrict</strong> certain processing
            </li>
            <li>
              <strong>Withdraw consent</strong> at any time, where processing is
              based on consent
            </li>
            <li>
              <strong>Lodge a complaint</strong> with your national data
              protection authority — in Belgium, this is the{" "}
              <a
                href="https://www.autoriteprotectiondonnees.be"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
              >
                Autorité de protection des données /
                Gegevensbeschermingsautoriteit
              </a>
            </li>
          </ul>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            To exercise any of these rights, contact{" "}
            <a
              href="mailto:gcoopmans@gmail.com"
              className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
            >
              gcoopmans@gmail.com
            </a>
            .
          </p>

          {/* Children's privacy */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Children&apos;s privacy
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            Jot is not intended for use by children. We do not knowingly collect
            data from anyone under 16.
          </p>

          {/* Security */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Security
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            We rely on Supabase&apos;s built-in security features, including
            encrypted connections (HTTPS) and Row Level Security policies that
            restrict each user&apos;s access to only their own data.
          </p>

          {/* Changes to this policy */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Changes to this policy
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-8">
            If this policy changes, we&apos;ll update the &quot;last
            updated&quot; date above. For material changes, we&apos;ll make
            reasonable efforts to notify active users directly (e.g. by email).
          </p>
        </article>
      </main>

      {/* Footer - simple, just back link */}
      <footer className="border-t border-[var(--line)] bg-[var(--paper-raised)] mt-12">
        <div className="max-w-3xl mx-auto px-10 py-8 text-center">
          <Link
            href="/"
            className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors underline"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Back to Jot
          </Link>
        </div>
      </footer>
    </div>
  );
}
