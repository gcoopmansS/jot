import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Edit3,
  FolderOpen,
  CheckCircle,
  Repeat,
} from "lucide-react";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { AccountDeletedNotification } from "@/components/landing/account-deleted-notification";

/**
 * Public landing page shown to logged-out visitors.
 *
 * If a user is already authenticated, they're redirected to /everything.
 * Otherwise, this page introduces Jot's core concept and value proposition.
 */
export default async function LandingPage() {
  const user = await getUser();

  // If logged in, redirect to the app
  if (user) {
    redirect("/everything");
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Account deletion notification */}
      <Suspense fallback={null}>
        <AccountDeletedNotification />
      </Suspense>
      {/* Header */}
      <header className="border-b border-[var(--line)] bg-[var(--paper-raised)]">
        <div className="max-w-6xl mx-auto px-10 h-16 flex items-center justify-between">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Jot
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/sign-in"
              className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors text-sm font-medium"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-in?mode=sign-up"
              className="px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors text-sm font-medium"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-10 pt-20 pb-16 text-center">
        <h2
          className="text-5xl font-semibold text-[var(--ink)] mb-6 leading-tight"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          You only realize you need to take notes{" "}
          <span className="text-[var(--accent)]">after</span> the meeting has
          started
        </h2>
        <p
          className="text-xl text-[var(--ink-soft)] mb-10 max-w-2xl mx-auto"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          Traditional note-taking tools make you organize <em>before</em> you
          write. Jot flips that:{" "}
          <strong>
            capture first, categorize after — and categorizing is always
            optional.
          </strong>
        </p>
        <Link
          href="/auth/sign-in?mode=sign-up"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors text-base font-medium"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          Get started
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-10 py-16">
        <h3
          className="text-3xl font-semibold text-[var(--ink)] mb-12 text-center"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          How it works
        </h3>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] p-8 border border-[var(--line)]">
            <div className="w-12 h-12 mb-4 flex items-center justify-center">
              <Edit3
                className="h-8 w-8 text-[var(--accent)]"
                strokeWidth={1.5}
              />
            </div>
            <h4
              className="text-lg font-semibold text-[var(--ink)] mb-3"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              1. Hit "New note"
            </h4>
            <p
              className="text-[var(--ink-soft)] text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Writing starts instantly. No setup, no required fields, no
              deciding where it goes first.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] p-8 border border-[var(--line)]">
            <div className="w-12 h-12 mb-4 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-8 w-8 text-[var(--accent)]"
              >
                <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
              </svg>
            </div>
            <h4
              className="text-lg font-semibold text-[var(--ink)] mb-3"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              2. Write, uninterrupted
            </h4>
            <p
              className="text-[var(--ink-soft)] text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Your cursor is active immediately. Capture what matters while
              it&apos;s happening.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] p-8 border border-[var(--line)]">
            <div className="w-12 h-12 mb-4 flex items-center justify-center">
              <FolderOpen
                className="h-8 w-8 text-[var(--accent)]"
                strokeWidth={1.5}
              />
            </div>
            <h4
              className="text-lg font-semibold text-[var(--ink)] mb-3"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              3. Categorize later (or never)
            </h4>
            <p
              className="text-[var(--ink-soft)] text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Only after writing, optionally say what it&apos;s about. Skip it
              entirely if you want — nothing is lost.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="max-w-6xl mx-auto px-10 py-16">
        <h3
          className="text-3xl font-semibold text-[var(--ink)] mb-8 text-center"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Try it yourself
        </h3>
        <InteractiveDemo />
      </section>

      {/* Meetings vs Notes */}
      <section className="max-w-4xl mx-auto px-10 py-16">
        <h3
          className="text-3xl font-semibold text-[var(--ink)] mb-6 text-center"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Two types of content, one simple system
        </h3>
        <p
          className="text-center text-[var(--ink-soft)] mb-12 max-w-2xl mx-auto"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          Jot recognizes that stakeholder syncs and your own analysis are
          fundamentally different — so it treats them differently.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Meetings */}
          <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] p-8 border border-[var(--line)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-[var(--accent)] text-white text-xs font-semibold rounded-full uppercase">
                Meeting
              </div>
              <Repeat className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <h4
              className="text-xl font-semibold text-[var(--ink)] mb-3"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Recurring stakeholder syncs
            </h4>
            <p
              className="text-[var(--ink-soft)] text-sm leading-relaxed mb-4"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Named threads that can be marked recurring. Built for regular
              check-ins, standups, and client calls. Notes accumulate
              chronologically in the same thread, with quick access to the last
              session.
            </p>
            <ul
              className="space-y-2 text-sm text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                <span>Optional cadence (e.g. &quot;Every 3 weeks&quot;)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                <span>Track attendees</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                <span>Reference previous sessions instantly</span>
              </li>
            </ul>
          </div>

          {/* Notes */}
          <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] p-8 border border-[var(--line)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-[var(--purple)] text-white text-xs font-semibold rounded-full uppercase">
                General
              </div>
            </div>
            <h4
              className="text-xl font-semibold text-[var(--ink)] mb-3"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Your own analysis and drafts
            </h4>
            <p
              className="text-[var(--ink-soft)] text-sm leading-relaxed mb-4"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              General content organized by Topic. Your reasoning, findings,
              sketches — anything that isn&apos;t tied to a recurring meeting.
              Topics are optional groupings, never required.
            </p>
            <ul
              className="space-y-2 text-sm text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--purple)] mt-0.5 flex-shrink-0" />
                <span>Flat, topic-based organization</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--purple)] mt-0.5 flex-shrink-0" />
                <span>No recurring concept — just content</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--purple)] mt-0.5 flex-shrink-0" />
                <span>Topics are always optional</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-5xl mx-auto px-10 py-16">
        <h3
          className="text-3xl font-semibold text-[var(--ink)] mb-12 text-center"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          How is Jot different?
        </h3>
        <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] border border-[var(--line)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  {/* Empty corner cell */}
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Traditional tools
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Jot
                </th>
              </tr>
            </thead>
            <tbody
              className="text-sm"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              <tr className="border-b border-[var(--line)]">
                <td className="px-6 py-4 font-medium text-[var(--ink)]">
                  When do you organize?
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Before writing — pick a folder, template, or structure first
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  After writing (or never) — capture immediately, file later
                </td>
              </tr>
              <tr className="border-b border-[var(--line)]">
                <td className="px-6 py-4 font-medium text-[var(--ink)]">
                  What if you skip organizing?
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Note gets lost in a default page or never gets created
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Goes to Unsorted inbox — you can file it anytime, or never
                </td>
              </tr>
              <tr className="border-b border-[var(--line)]">
                <td className="px-6 py-4 font-medium text-[var(--ink)]">
                  Recurring meetings
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Manual duplication or complex database views
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  First-class: mark as recurring, reference last session
                  instantly
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-[var(--ink)]">
                  Optimized for
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Knowledge bases, wikis, long-term structure
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Busy professionals capturing in the moment
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--paper-raised)] mt-20">
        <div className="max-w-6xl mx-auto px-10 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4
                className="text-2xl font-semibold text-[var(--ink)]"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Jot
              </h4>
              <p
                className="text-sm text-[var(--ink-soft)] mt-1"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Capture first, file later
              </p>
              <Link
                href="/privacy"
                className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors underline mt-2 inline-block"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Privacy Policy
              </Link>
            </div>
            <Link
              href="/auth/sign-in?mode=sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors text-base font-medium"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Get started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
