import {
  LayoutTemplate,
  CalendarRange,
  BarChart2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { SiGoogle, SiGoogleclassroom } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: SiGoogleclassroom,
    title: "Classroom Sync",
    description: "Direct 2-way integration.",
  },
  {
    icon: LayoutTemplate,
    title: "Kanban Board",
    description: "Visual assignment tracking.",
  },
  {
    icon: CalendarRange,
    title: "Linear Timeline",
    description: "Chronological deadline view.",
  },
  {
    icon: BarChart2,
    title: "Performance Metrics",
    description: "Grade & workload analytics.",
  },
];

export default function LoginPage() {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div className="h-screen w-full bg-white text-zinc-950 flex overflow-hidden font-sans selection:bg-zinc-200">
      {/* LEFT SECTION 
        - Hidden on Mobile (< lg)
        - Visible Flex on Desktop (>= lg)
      */}
      <div className="hidden lg:flex lg:w-1/2 h-full flex-col justify-between border-r border-zinc-200 bg-zinc-50/50 relative overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Desktop Brand Header */}
        <header className="px-10 py-8 z-10">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Trace Logo"
              className="h-10 w-10 object-contain rounded-md"
            />
            <div>
              <span className="font-bold tracking-tight text-lg block leading-none">
                Trace
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                by Kishor Irnak
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-16 z-10">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight text-zinc-950 leading-[1.05]">
              Google Classroom, <br />
              <span className="text-zinc-400">supercharged.</span>
            </h1>

            <p className="text-lg text-zinc-600 max-w-md leading-relaxed">
              Trace extracts your assignment data and reorganizes it into a
              professional project management workflow.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-px bg-zinc-200 border border-zinc-200 mt-6 rounded-lg overflow-hidden shadow-sm">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white p-4 hover:bg-zinc-50 transition-colors duration-200"
                >
                  <feature.icon className="h-5 w-5 text-zinc-950 mb-2" />
                  <h3 className="font-semibold text-sm text-zinc-950">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="px-10 py-6 border-t border-zinc-200/50 bg-white/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            v2.0 Stable Build
          </div>
        </div>
      </div>

      {/* RIGHT SECTION (Login)
        - Full width on Mobile
        - Half width on Desktop
      */}
      <div className="w-full lg:w-1/2 h-full flex flex-col bg-white overflow-y-auto">
        {/* Mobile-Only Header */}
        <div className="lg:hidden p-6 border-b border-zinc-100 flex items-center gap-3 bg-white sticky top-0 z-50">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Trace Logo"
            className="h-9 w-9 object-contain rounded-md"
          />
          <div>
            <span className="font-bold tracking-tight text-lg block leading-none">
              Trace
            </span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
              by Kishor Irnak
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-24">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Sign in to Trace
              </h2>
              <p className="text-sm text-zinc-500">
                Connect your academic account to sync assignments.
              </p>
            </div>

            <div className="space-y-4">
              {/* IMPORTANT NOTICE BOX */}
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-md flex gap-3">
                <AlertCircle
                  className="h-5 w-5 text-zinc-900 shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    Important
                  </p>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    You must sign in using your{" "}
                    <strong className="text-zinc-900">
                      Google Classroom Email
                    </strong>
                    . Personal Gmail accounts without classroom data will not
                    work.
                  </p>
                </div>
              </div>

              <Button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full h-12 bg-zinc-950 hover:bg-zinc-800 text-white border border-transparent rounded-md transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                data-testid="button-signin-google"
              >
                <SiGoogle className="h-4 w-4" />
                <span className="font-medium">Continue with Google</span>
              </Button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md flex gap-3 items-center">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-zinc-100">
              <div className="flex gap-4">
                <ShieldCheck
                  className="h-5 w-5 text-zinc-400 shrink-0"
                  strokeWidth={1.5}
                />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-900">
                    Privacy First
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Trace uses the official Google Classroom API with read-only
                    permission. We cannot edit or delete your coursework.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="p-6 sm:p-8 lg:p-12 border-t border-zinc-100">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-400">
            <span>© 2024 Trace Inc.</span>
            <div className="flex gap-6">
              <a
                href="/privacy-policy"
                className="hover:text-zinc-900 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-zinc-900 transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
