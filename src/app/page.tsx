import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">Családi Költségvetés</h1>
        <p className="text-xl mb-8">
          Egyszerűen kezelhető megoldás a családi pénzügyek követésére és tervezésére
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Kiadások Követése</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Egyszerűen rögzítse és kategorizálja kiadásait</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bevételek Kezelése</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Tartsa nyilván különböző bevételi forrásait</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Költségvetés Tervezése</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Készítsen havi vagy éves költségvetési terveket</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard">
            <Button size="lg">
              Irányítópult
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Bejelentkezés
            </Button>
          </Link>
        </div>
      </div>
      
      <footer className="mt-24 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Családi Költségvetés. Minden jog fenntartva.</p>
      </footer>
    </div>
  );
}
