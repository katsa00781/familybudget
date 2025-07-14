"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Wallet 
} from "lucide-react";
import { login } from "@/app/actions/auth";
import { toast } from "sonner";

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    
    if (error === 'login_failed') {
      toast.error(
        "Bejelentkezés sikertelen! ❌", 
        {
          description: "Helytelen email cím vagy jelszó. Kérjük, próbálja újra.",
          duration: 5000,
        }
      );
    }
    
    if (error === 'email_not_confirmed') {
      toast.warning(
        "Email megerősítés szükséges! ⚠️", 
        {
          description: "Kérjük, ellenőrizze email fiókját és erősítse meg a regisztrációt a bejelentkezés előtt.",
          duration: 8000,
        }
      );
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex">
      {/* Bal oldali gradiens háttér */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-main items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wallet size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">FamilyBudget</h1>
          <p className="text-xl text-white/90 leading-relaxed">
            Kezelje családja pénzügyeit egyszerűen!
          </p>
        </div>
      </div>

      {/* Jobb oldali bejelentkezés form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo és cím mobilon */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Wallet size={24} className="text-familybudget-teal" />
              <span className="text-2xl font-bold text-gray-800">FamilyBudget</span>
            </div>
          </div>

          {/* Navigációs header */}
          <div className="flex justify-between items-center text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-familybudget-teal">Főoldal</Link>
            <Link href="/features" className="hover:text-familybudget-teal">Funkciók</Link>
            <Link href="/pricing" className="hover:text-familybudget-teal">Árak</Link>
            <Link href="/about" className="hover:text-familybudget-teal">Rólunk</Link>
            <Link href="/contact" className="hover:text-familybudget-teal">Kapcsolat</Link>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-familybudget-blue mb-2">Bejelentkezés</h2>
          </div>

          <form action={login} className="space-y-6">
            {/* Email mező */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email cím</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email címed"
                  className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
                  required
                />
              </div>
            </div>

            {/* Jelszó mező */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Jelszó</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Jelszavad"
                  className="pl-12 pr-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Jelszó megjegyzése és elfelejtett jelszó */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  Jelszó megjegyzése
                </Label>
              </div>
              <Link 
                href="/forgot-password" 
                className="text-sm text-familybudget-teal hover:underline"
              >
                Elfelejtett jelszó?
              </Link>
            </div>

            {/* Bejelentkezés gomb */}
            <Button
              type="submit"
              className="w-full h-12 bg-familybudget-teal hover:bg-familybudget-teal/90 text-white font-medium text-lg border-0"
              style={{ backgroundColor: '#00B4DB', color: 'white' }}
            >
              Bejelentkezés
            </Button>

            {/* Regisztráció link */}
            <div className="text-center">
              <span className="text-gray-600">Még nincs fiókod? </span>
              <Link 
                href="/register" 
                className="text-familybudget-green font-medium hover:underline"
              >
                Regisztrálj!
              </Link>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 mt-8">
            © 2023 FamilyBudget - Minden jog fenntartva
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Betöltés...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
