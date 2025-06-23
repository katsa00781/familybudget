import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Bejelentkezés</CardTitle>
          <CardDescription>
            Add meg az email címed és jelszavad a bejelentkezéshez
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="pelda@email.hu" />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Jelszó</Label>
              <Link
                href="/reset-password"
                className="text-sm text-muted-foreground hover:underline"
              >
                Elfelejtetted?
              </Link>
            </div>
            <Input id="password" type="password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full">Bejelentkezés</Button>
          <div className="flex justify-center text-sm text-muted-foreground">
            Nincs még fiókod?{" "}
            <Link href="/register" className="ml-1 text-primary hover:underline">
              Regisztráció
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
