import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Wallet, AlertCircle } from "lucide-react";

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-main p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wallet size={24} className="text-familybudget-teal" />
            <span className="text-2xl font-bold text-gray-800">FamilyBudget</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">Hiba történt</h1>
        <p className="text-gray-600 mb-6">
          Sajnálom, valami hiba történt a művelet során. Kérjük, próbálkozzon újra később.
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full bg-familybudget-teal hover:bg-familybudget-teal/90">
            <Link href="/login">Vissza a bejelentkezéshez</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Főoldal</Link>
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6">
          © 2023 FamilyBudget - Minden jog fenntartva
        </div>
      </div>
    </div>
  );
}
