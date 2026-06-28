"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";

// Az auth-oldalakon (bejelentkezés / regisztráció) nincs sidebar — ezek
// teljes szélességű, középre igazított képernyők.
const AUTH_ROUTES = ["/login", "/register"];

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isAuthRoute) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 w-full pt-16 lg:pt-0 lg:ml-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
