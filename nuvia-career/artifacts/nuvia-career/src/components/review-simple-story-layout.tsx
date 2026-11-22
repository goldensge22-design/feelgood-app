import type { ReactNode } from 'react';

export interface ReviewSimpleStoryStep {
  title: string;
  description?: string;
  content: ReactNode;
}

export function ReviewSimpleStoryLayout({ steps }: { steps: ReviewSimpleStoryStep[] }) {
  return (
    <ol className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-6" data-testid="list-review-simple-story">
      {steps.map((step, i) => {
        const n = i + 1;
        const orange = i % 2 === 0;
        return (
          <li key={i} className="relative min-w-0" data-testid={`step-review-simple-story-${n}`}>
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute bottom-[-20px] start-[27px] top-14 w-px border-s-2 border-dashed border-[hsl(var(--blue)/0.25)] sm:start-[31px]" />
            )}
            <section className="surface relative overflow-hidden" aria-labelledby={`review-simple-story-title-${n}`}>
              <span aria-hidden className={`absolute inset-y-0 start-0 w-1 ${orange ? 'bg-primary' : 'bg-blue'}`} />
              <header className="flex items-start gap-3 px-4 pt-4 sm:gap-4 sm:px-5 sm:pt-5">
                <span
                  aria-hidden
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold sm:size-9 ${orange ? 'bg-primary text-primary-foreground' : 'bg-blue text-white'}`}
                >
                  {n}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`review-simple-story-title-${n}`} className="text-lg font-bold leading-snug text-foreground sm:text-xl">
                    <span className="sr-only">{n}. </span>{step.title}
                  </h2>
                  {step.description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>}
                </div>
              </header>
              <div className="min-w-0 px-4 pb-4 pt-3 sm:ps-[4.25rem] sm:pe-5 sm:pb-5">{step.content}</div>
            </section>
          </li>
        );
      })}
    </ol>
  );
}
