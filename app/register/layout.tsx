import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regisztráció - Családi Költségvetés",
  description: "Regisztráció a családi költségvetés kezelő alkalmazásba",
};

export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
