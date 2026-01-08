import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans selection:bg-zinc-200 p-6 sm:p-12 lg:p-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4 border-b border-zinc-100 pb-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="px-0 hover:bg-transparent text-zinc-500 hover:text-zinc-900"
              onClick={() => (window.location.href = "/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Terms of Service – Trace
          </h1>
          <p className="text-zinc-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        <div className="space-y-8 text-zinc-700 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Trace ("the Service"), you accept and agree
              to be bound by the terms and provisions of this agreement. If you
              do not agree to these Terms of Service, please do not use the
              Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              2. Description of Service
            </h2>
            <p>
              Trace is an educational productivity platform that integrates with
              Google Classroom to help students:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Organize assignments</strong> with visual timelines and
                dashboards
              </li>
              <li>
                <strong>Track attendance</strong> and academic performance
              </li>
              <li>
                <strong>Earn achievements</strong> through gamified learning
                experiences
              </li>
              <li>
                <strong>Compete on leaderboards</strong> with classmates in a
                fun, educational environment
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              3. User Accounts & Authentication
            </h2>
            <p>
              To use Trace, you must authenticate using your Google account. By
              doing so, you grant us permission to access specific Google
              Classroom data as outlined in our{" "}
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:underline font-medium"
              >
                Privacy Policy
              </a>
              .
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                You are responsible for maintaining the confidentiality of your
                account credentials.
              </li>
              <li>
                You must be a student or educator with a valid Google Classroom
                account.
              </li>
              <li>
                You agree not to share your account with others or allow
                unauthorized access.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              4. Acceptable Use Policy
            </h2>
            <p>
              You agree to use Trace only for lawful purposes. You must NOT:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Attempt to gain unauthorized access to other users' data or
                accounts
              </li>
              <li>
                Use the Service to cheat, plagiarize, or violate academic
                integrity policies
              </li>
              <li>
                Manipulate leaderboards, XP scores, or badges through fraudulent
                means
              </li>
              <li>Upload malicious code, viruses, or any harmful content</li>
              <li>Harass, abuse, or harm other users through the platform</li>
              <li>
                Scrape, copy, or redistribute data from the Service without
                permission
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              5. Gamification & Leaderboards
            </h2>
            <p>
              Trace includes gamified features such as XP points, badges, and
              leaderboards to encourage engagement and productivity. Please
              note:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>For Entertainment Only:</strong> Leaderboards and
                rankings are designed for motivational purposes and do not
                reflect official academic standings.
              </li>
              <li>
                <strong>Fair Play:</strong> We reserve the right to remove or
                reset scores that appear to be manipulated or fraudulent.
              </li>
              <li>
                <strong>No Guarantees:</strong> XP and badges do not guarantee
                academic success or any real-world rewards.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              6. Intellectual Property
            </h2>
            <p>
              All content, features, and functionality of Trace (including but
              not limited to text, graphics, logos, icons, images, and software)
              are the exclusive property of Trace and are protected by
              international copyright, trademark, and other intellectual
              property laws.
            </p>
            <p>
              You may not copy, modify, distribute, sell, or lease any part of
              our Service without explicit written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              7. Data Privacy & Security
            </h2>
            <p>
              We are committed to protecting your privacy. Please review our{" "}
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:underline font-medium"
              >
                Privacy Policy
              </a>{" "}
              to understand how we collect, use, and safeguard your data.
            </p>
            <p>
              While we implement industry-standard security measures, no system
              is 100% secure. You acknowledge that you use the Service at your
              own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              8. Limitation of Liability
            </h2>
            <p>
              Trace is provided "as is" without warranties of any kind, either
              express or implied. We do not guarantee that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The Service will be uninterrupted or error-free</li>
              <li>
                All data will be accurate, complete, or up-to-date at all times
              </li>
              <li>
                The Service will meet your specific educational or productivity
                needs
              </li>
            </ul>
            <p className="mt-4">
              To the fullest extent permitted by law, Trace shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              9. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your access to Trace
              at any time, without notice, for conduct that we believe:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Violates these Terms of Service</li>
              <li>Is harmful to other users or the Service</li>
              <li>Exposes us to legal liability</li>
            </ul>
            <p className="mt-4">
              You may also terminate your account at any time by revoking
              Trace's access to your Google account through Google Security
              settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              10. Changes to Terms
            </h2>
            <p>
              We may update these Terms of Service from time to time. When we
              do, we will revise the "Last updated" date at the top of this
              page. Continued use of the Service after changes constitutes your
              acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              11. Governing Law
            </h2>
            <p>
              These Terms of Service shall be governed by and construed in
              accordance with the laws of India, without regard to its conflict
              of law provisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              12. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <a
              href="mailto:irnakkishor4u@gmail.com"
              className="text-blue-600 hover:underline font-medium"
            >
              irnakkishor4u@gmail.com
            </a>
          </section>
        </div>

        <footer className="pt-12 mt-12 border-t border-zinc-100 text-sm text-zinc-400">
          © {new Date().getFullYear()} Trace Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
