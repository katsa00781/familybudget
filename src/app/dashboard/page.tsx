import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Áttekintés</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes Kiadás</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127 500 Ft</div>
            <p className="text-xs text-muted-foreground">
              +12% az előző hónaphoz képest
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes Bevétel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">315 000 Ft</div>
            <p className="text-xs text-muted-foreground">
              +5% az előző hónaphoz képest
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Különbözet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+187 500 Ft</div>
            <p className="text-xs text-muted-foreground">
              +1% az előző hónaphoz képest
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Költségvetési Terv</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground">
              Költségvetés kihasználtság
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="expenses" className="mb-6">
        <TabsList>
          <TabsTrigger value="expenses">Kiadások</TabsTrigger>
          <TabsTrigger value="income">Bevételek</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="space-y-4">
          <h2 className="text-xl font-semibold">Legutóbbi Kiadások</h2>
          <div className="rounded-md border">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Nincs még rögzített kiadás</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="income" className="space-y-4">
          <h2 className="text-xl font-semibold">Legutóbbi Bevételek</h2>
          <div className="rounded-md border">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Nincs még rögzített bevétel</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button>Új tranzakció</Button>
      </div>
    </div>
  );
}
