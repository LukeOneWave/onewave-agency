"use client";

export function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
    </span>
  );
}
