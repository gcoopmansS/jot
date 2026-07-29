import Link from "next/link";

/**
 * Terms of Service page.
 *
 * Accessible to all visitors (logged in or out) - same reasoning as the
 * Privacy Policy: needs to be readable before account creation.
 *
 * Uses semantic HTML for document structure (h1, h2, ul, li) and
 * the app's typography system for readability, mirroring app/privacy/page.tsx.
 */
export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>

          <p className="text-sm text-[var(--ink-soft)] mb-8">
            <em>Last updated: July 28, 2026</em>
          </p>

          {/* 1. Acceptance of these terms */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            1. Acceptance of these terms
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            By creating an account or using Jot, you agree to these Terms of
            Service and the{" "}
            <Link
              href="/privacy"
              className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
            >
              Privacy Policy
            </Link>
            . If you don&apos;t agree, please don&apos;t use the app.
          </p>

          {/* 2. Who provides this service */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            2. Who provides this service
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            Jot is provided by Gil Coopmans, based in Herentals, Belgium.
            Contact:{" "}
            <a
              href="mailto:gcoopmans@gmail.com"
              className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
            >
              gcoopmans@gmail.com
            </a>
            .
          </p>

          {/* 3. What Jot is, right now */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            3. What Jot is, right now
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            Jot is an early-stage, actively-developed notetaking application.{" "}
            <strong>
              It is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis, with no guaranteed uptime, no
              service-level agreement, and no warranty that it will be
              error-free or uninterrupted.
            </strong>{" "}
            Features may change, break, or be removed as the app continues to
            be developed. This isn&apos;t a disclaimer of convenience -
            it&apos;s an honest description of where the product actually is
            right now.
          </p>

          {/* 4. Eligibility */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            4. Eligibility
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            Jot is not intended for use by anyone under 16. By using it, you
            confirm you meet this requirement.
          </p>

          {/* 5. Your account */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            5. Your account
          </h2>
          <ul className="list-disc pl-6 space-y-3 mb-6 text-[var(--ink)]">
            <li>
              You&apos;re responsible for keeping your login credentials
              secure, and for all activity that happens under your account.
            </li>
            <li>
              You agree to provide accurate information (e.g. a real, working
              email address) when creating an account.
            </li>
            <li>
              You may delete your account at any time via Account Settings -
              this permanently and immediately removes your data, as
              described in the{" "}
              <Link
                href="/privacy"
                className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </li>
          </ul>

          {/* 6. Your content */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            6. Your content
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            <strong>You own what you write in Jot.</strong> Your notes,
            titles, and any other content you create belong to you, not to
            Jot or its provider.
          </p>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            By using the app, you grant a limited license to store, process,
            and display your content{" "}
            <strong>solely for the purpose of providing the service to you</strong>{" "}
            - e.g. saving it to the database, showing it back to you, running
            search over it. This license ends when you delete the content or
            your account.
          </p>
          <p className="text-[var(--ink)] leading-relaxed mb-2">
            You&apos;re responsible for what you put into Jot. Please
            don&apos;t use it to store or process:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-6 text-[var(--ink)]">
            <li>
              Content that&apos;s illegal, or that infringes someone
              else&apos;s rights.
            </li>
            <li>
              Highly sensitive categories of personal data about others (e.g.
              health information) without a proper legal basis to do so - see
              the note in the{" "}
              <Link
                href="/privacy"
                className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
              >
                Privacy Policy
              </Link>{" "}
              about this applying to other people&apos;s data too, not just
              your own account data.
            </li>
          </ul>

          {/* 7. Acceptable use */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            7. Acceptable use
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-2">
            Please don&apos;t:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-6 text-[var(--ink)]">
            <li>
              Attempt to disrupt, overload, or gain unauthorized access to the
              service or other users&apos; data.
            </li>
            <li>Use the service for any unlawful purpose.</li>
            <li>
              Attempt to reverse-engineer or scrape the service beyond normal
              personal use.
            </li>
          </ul>

          {/* 8. No warranty */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            8. No warranty
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            To the fullest extent permitted by law, Jot is provided without
            warranties of any kind, express or implied - including, but not
            limited to, warranties of merchantability, fitness for a
            particular purpose, or non-infringement. Given the app&apos;s
            current early stage (see Section 3), this matters in practice, not
            just as boilerplate: bugs, data issues, and downtime are
            realistically possible.
          </p>

          {/* 9. Limitation of liability */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            9. Limitation of liability
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            To the fullest extent permitted by law, the provider of Jot is not
            liable for any indirect, incidental, special, or consequential
            damages arising from your use of (or inability to use) the
            service - including but not limited to loss of data, loss of
            business, or loss of profits - even if advised of the possibility
            of such damages. Since Jot is currently provided free of charge,
            total liability for any claim is limited to the amount
            you&apos;ve paid to use the service, if any.
          </p>

          {/* 10. Termination */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            10. Termination
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            You may stop using Jot and delete your account at any time. The
            provider may suspend or terminate access to the service for
            anyone who violates these terms, or discontinue the service
            entirely, with reasonable notice where practical given the
            app&apos;s current stage.
          </p>

          {/* 11. Changes to these terms or the service */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            11. Changes to these terms or the service
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            These terms may be updated as the app develops - the &quot;last
            updated&quot; date above will reflect this. For material changes,
            reasonable efforts will be made to notify active users directly.
            The service itself (features, availability) may also change
            substantially as development continues.
          </p>

          {/* 12. Governing law */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            12. Governing law
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-6">
            These terms are governed by Belgian law. Any disputes will first
            be addressed informally by contacting{" "}
            <a
              href="mailto:gcoopmans@gmail.com"
              className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
            >
              gcoopmans@gmail.com
            </a>
            ; unresolved disputes fall under the jurisdiction of the Belgian
            courts.
          </p>

          {/* 13. Contact */}
          <h2
            className="text-2xl font-semibold text-[var(--ink)] mt-10 mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            13. Contact
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-8">
            Questions about these terms:{" "}
            <a
              href="mailto:gcoopmans@gmail.com"
              className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
            >
              gcoopmans@gmail.com
            </a>
            .
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
