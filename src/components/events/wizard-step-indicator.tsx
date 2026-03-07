"use client";

interface Step {
  label: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function WizardStepIndicator({ steps, currentStep }: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "border-2 border-primary text-primary"
                    : "border-2 border-muted text-muted-foreground",
              ].join(" ")}
            >
              {isDone ? "✓" : index + 1}
            </div>
            <span
              className={[
                "hidden sm:block text-sm",
                isActive ? "font-medium" : "text-muted-foreground",
              ].join(" ")}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className="mx-1 hidden h-px w-8 bg-muted sm:block" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
