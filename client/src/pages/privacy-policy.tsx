import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            Privacy Policy – Trace
          </h1>
          <p className="text-zinc-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        <div className="space-y-8 text-zinc-700 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              Introduction
            </h2>
            <p>
              Trace ("we", "our", or "us") is committed to protecting your
              privacy. This Privacy Policy explains how we access, use, store,
              and protect your Google Classroom data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              Google Authentication & Data Access
            </h2>
            <p>
              Trace uses Google OAuth to authenticate users. We only request
              access to specific Google Classroom data required to provide our
              services. Specifically, we read:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Courses:</strong> To display your active classes.
              </li>
              <li>
                <strong>Coursework (Assignments):</strong> To organize deadlines
                and tasks in our dashboard.
              </li>
              <li>
                <strong>Academic Insights:</strong> To generate performance
                metrics and workload analytics.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              Data Usage & Protection
            </h2>
            <p>
              We treat your academic data with the highest level of
              confidentiality.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>No Selling of Data:</strong> We do NOT sell, trade, or
                rent your personal information to third parties.
              </li>
              <li>
                <strong>No Misuse:</strong> Your data is used strictly for
                educational organization and visualization within the Trace
                application.
              </li>
              <li>
                <strong>Secure Storage:</strong> All data is stored securely
                using industry-standard encryption protocols.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">User Rights</h2>
            <p>You retain full ownership of your data. At any time, you may:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Revoke Trace's access to your Google account via Google Security
                settings.
              </li>
              <li>Request full deletion of your data from our servers.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to
              request data deletion, please contact us at:
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
