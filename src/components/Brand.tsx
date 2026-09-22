"use client";

import Link from "next/link";

/** Shared ACE logo brand mark. */
export function Brand({
  href = "/calc",
  subtitle = "CALC",
  size = 40,
}: {
  href?: string;
  subtitle?: string;
  size?: number;
}) {
  return (
    <Link href={href} className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ace-logo.png"
        alt=""
        className="brand-logo"
        width={size}
        height={size}
      />
      <span className="brand-word">ACE</span>
      {subtitle ? <span className="brand-sub">{subtitle}</span> : null}
    </Link>
  );
}

export function BrandMark({ size = 72 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ace-logo.png"
      alt="ACE"
      className="brand-logo brand-logo-lg"
      width={size}
      height={size}
    />
  );
}
