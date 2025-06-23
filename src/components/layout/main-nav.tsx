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
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold">
          Családi Költségvetés
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          <Link href="/dashboard" className="hover:underline">
            Áttekintés
          </Link>
          <Link href="/expenses" className="hover:underline">
            Kiadások
          </Link>
          <Link href="/income" className="hover:underline">
            Bevételek
          </Link>
          <Link href="/budgets" className="hover:underline">
            Költségvetések
          </Link>
          <Link href="/settings" className="hover:underline">
            Beállítások
          </Link>
        </nav>
      </div>

      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <div className="flex flex-col gap-4 mt-8">
            <Link href="/dashboard" className="text-lg">
              Áttekintés
            </Link>
            <Link href="/expenses" className="text-lg">
              Kiadások
            </Link>
            <Link href="/income" className="text-lg">
              Bevételek
            </Link>
            <Link href="/budgets" className="text-lg">
              Költségvetések
            </Link>
            <Link href="/settings" className="text-lg">
              Beállítások
            </Link>
          </div>
        </SheetContent>
      </Sheet>
      
      <div className="flex items-center gap-2">
        <Button variant="outline">Bejelentkezés</Button>
      </div>
    </div>
  );
};

export default MainNav;
