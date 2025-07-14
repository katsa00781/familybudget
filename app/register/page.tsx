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
  Wallet,
  User,
  Calendar,
  Building,
  Home,
  MapPin
} from "lucide-react";
import { signup } from "@/app/actions/auth";
import { toast } from "sonner";

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'confirmation_sent') {
      toast.success(
        "Regisztráció sikeres! 📧", 
        {
          description: "Kérjük, ellenőrizze email fiókját és erősítse meg a regisztrációt a bejelentkezés előtt.",
          duration: 8000,
        }
      );
    }
    
    if (error === 'signup_failed') {
      toast.error(
        "Regisztráció sikertelen! ❌", 
        {
          description: "Hiba történt a regisztráció során. Kérjük, próbálja újra.",
          duration: 5000,
        }
      );
    }
  }, [searchParams]);

  const handleSubmit = async (formData: FormData) => {
    if (!acceptTerms) {
      toast.error("Elfogadás szükséges!", {
        description: "Kérjük, fogadja el a felhasználási feltételeket!",
        duration: 3000,
      });
      return;
    }
    await signup(formData);
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Személyes adatok szekció */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">Személyes adatok</h3>
        
        {/* Email mező */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="email" className="text-gray-700">Email cím</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Email cím"
              className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
              required
            />
          </div>
        </div>

        {/* Teljes név */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="fullName" className="text-gray-700">Teljes név</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Teljes név"
              className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
              required
            />
          </div>
        </div>

        {/* Születési dátum */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="birthDate" className="text-gray-700">Születési dátum</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              placeholder="yyyy / mm / dd"
              className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
              required
            />
          </div>
        </div>
      </div>

      {/* Lakcím adatok szekció */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">Lakcím adatok</h3>
        
        {/* Irányítószám */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="zipCode" className="text-gray-700">Irányítószám</Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
            <Input
              id="zipCode"
              name="zipCode"
              type="text"
              placeholder="Irányítószám"
              className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
              required
            />
          </div>
        </div>

        {/* Város */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="city" className="text-gray-700">Város</Label>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
            <Input
              id="city"
              name="city"
              type="text"
              placeholder="Város"
              className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
              required
            />
          </div>
        </div>

        {/* Cím */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="address" className="text-gray-700">Cím</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-familybudget-teal" size={20} />
            <Input
              id="address"
              name="address"
              type="text"
              placeholder="Cím"
              className="pl-12 h-12 border-2 border-familybudget-teal focus:border-familybudget-teal focus:ring-familybudget-teal/20"
              required
            />
          </div>
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
            placeholder="Jelszó"
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

      {/* Feltételek elfogadása */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={acceptTerms}
          onCheckedChange={(checked: boolean) => setAcceptTerms(checked)}
          className="mt-1"
        />
        <Label htmlFor="terms" className="text-sm text-gray-600 leading-5">
          Elfogadom a felhasználási feltételeket
        </Label>
      </div>

      {/* Regisztráció gomb */}
      <Button
        type="submit"
        className="w-full h-12 bg-familybudget-teal hover:bg-familybudget-teal/90 text-white font-medium text-lg border-0"
        style={{ backgroundColor: '#00B4DB', color: 'white' }}
      >
        Regisztráció
      </Button>

      {/* Bejelentkezés link */}
      <div className="text-center">
        <span className="text-gray-600">Már van fiókod? </span>
        <Link 
          href="/login" 
          className="text-familybudget-green font-medium hover:underline"
        >
          Jelentkezz be!
        </Link>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Betöltés...</p>
        </div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
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

      {/* Jobb oldali regisztrációs form */}
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
            <h2 className="text-2xl font-bold text-familybudget-blue mb-2">Regisztráció</h2>
          </div>

          <RegisterForm />

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 mt-8">
            © 2023 FamilyBudget - Minden jog fenntartva
          </div>
        </div>
      </div>
    </div>
  );
}
