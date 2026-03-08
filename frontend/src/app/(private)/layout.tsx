import type { ReactNode } from "react";

import AccountMenu from "@/modules/shared/AccountMenu";
import ThemeToggle from "@/modules/shared/ThemeToggle";
import RequireAuth from "@/modules/shared/RequireAuth";
import PrivateNav from "@/modules/shared/PrivateNav";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="private-layout">
        <div className="private-account-anchor">
          <div className="private-theme-toggle">
            <ThemeToggle />
          </div>
          <AccountMenu />
        </div>
        <div className="private-content">
          <PrivateNav />
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
