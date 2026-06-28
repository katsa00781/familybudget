import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bejelentkezés - Családi Költségvetés",
  description: "Bejelentkezés a családi költségvetés kezelő alkalmazásba",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
