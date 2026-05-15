"use client";

import type { MouseEvent, ReactNode } from "react";
import { startScan } from "@/lib/startScan";

type ScanLinkProps = {
  target: string;
  className?: string;
  children: ReactNode;
};

export function ScanLink({ target, className, children }: ScanLinkProps) {
  const href = `/scanning?target=${encodeURIComponent(target)}`;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    startScan(target);
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
