import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Calendar,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem("trace-onboarding-completed");
    if (!hasSeen) {
      // Small delay to allow dashboard to load
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("trace-onboarding-completed", "true");
    setOpen(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const steps = [
    {
      title: "Welcome to Trace",
      description:
        "Your intelligent cockpit for academic success. Let's take a quick tour.",
      icon: (
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 mx-auto">
          <Zap className="h-6 w-6" />
        </div>
      ),
    },
    {
      title: "Focus on Next Actions",
      description:
        "Your most urgent assignment is always highlighted at the top-left. Click 'Start Next Task' to dive right in.",
      icon: (
        <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 mx-auto">
          <Zap className="h-6 w-6" />
        </div>
      ),
      // We could add a highlight effect here in the future
    },
    {
      title: "Plan with Timeline",
      description:
        "Use the 'Timeline' in the sidebar to visualize your semester and spot busy weeks ahead.",
      icon: (
        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 mx-auto">
          <Calendar className="h-6 w-6" />
        </div>
      ),
    },
    {
      title: "Manage in Pipeline",
      description:
        "Track assignment status (Todo, In Progress, Done) using the Kanban-style 'Pipeline' view.",
      icon: (
        <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 mx-auto">
          <LayoutGrid className="h-6 w-6" />
        </div>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleComplete()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 border-0 shadow-2xl">
        <div className="p-8 text-center bg-card">
          <div className="transition-all duration-300 ease-in-out transform">
            {steps[step].icon}
            <h2 className="text-xl font-bold mb-2 tracking-tight">
              {steps[step].title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mx-auto">
              {steps[step].description}
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t flex items-center justify-between">
          <div className="flex gap-1.5 ml-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === step ? "w-6 bg-primary" : "w-1.5 bg-primary/20"
                )}
              />
            ))}
          </div>

          <Button onClick={handleNext} size="sm" className="gap-2">
            {step === steps.length - 1 ? (
              <>
                Get Started <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
