"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_V1_PRIVATE } from "@/modules/shared/navigationV1";

export default function PrivateNav() {
  const pathname = usePathname();

  return (
    <nav className="private-nav" aria-label="Navegación principal">
      {NAV_V1_PRIVATE.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={`private-nav-link${active ? " is-active" : ""}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
