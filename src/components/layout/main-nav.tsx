import Link from "next/link";
import { Button } from "../ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "../ui/sheet";
import { Menu } from "lucide-react";

const MainNav = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold">
        Családi Költségvetés
      </Link>

      {/* Csak Sidebar Navigation */}
      <div className="flex items-center gap-3">
        {/* Hamburger menü */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <div className="flex flex-col gap-6 mt-8">
              <div className="text-lg font-semibold border-b pb-2">
                Navigáció
              </div>
              
              <div className="flex flex-col gap-4">
                <Link href="/attekintes" className="text-lg hover:text-blue-600 transition-colors">
                  Áttekintés
                </Link>
                <Link href="/berkalkulator" className="text-lg hover:text-blue-600 transition-colors">
                  Bérkalkulátor
                </Link>
                <Link href="/koltsegvetes" className="text-lg hover:text-blue-600 transition-colors">
                  Költségvetés
                </Link>
                <Link href="/bevetelek" className="text-lg hover:text-blue-600 transition-colors">
                  Bevételek
                </Link>
                <Link href="/bevasarlas" className="text-lg hover:text-blue-600 transition-colors">
                  Bevásárlás
                </Link>
                <Link href="/befektetesek" className="text-lg hover:text-blue-600 transition-colors">
                  Befektetések
                </Link>
                <Link href="/jelentesek" className="text-lg hover:text-blue-600 transition-colors">
                  Jelentések
                </Link>
                <Link href="/receptek" className="text-lg hover:text-blue-600 transition-colors">
                  Receptek
                </Link>
                <Link href="/profil" className="text-lg hover:text-blue-600 transition-colors">
                  Profil
                </Link>
              </div>

              {/* Auth linkek */}
              <div className="border-t pt-4 mt-4">
                <div className="flex flex-col gap-3">
                  <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    Bejelentkezés
                  </Link>
                  <Link href="/register" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    Regisztráció
                  </Link>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MainNav;
