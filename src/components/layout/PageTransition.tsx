"use client";

import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-300 ease-out animate-in fade-in slide-in-from-bottom-4"
    >
      {children}
    </div>
  );
}
