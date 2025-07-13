"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error("Login error:", error);
    
    // Speciális kezelés az email megerősítés hiányára
    if (error.message.includes("Email not confirmed")) {
      redirect("/login?error=email_not_confirmed");
    } else {
      redirect("/login?error=login_failed");
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        full_name: formData.get("fullName") as string,
        birth_date: formData.get("birthDate") as string,
        zip_code: formData.get("zipCode") as string,
        city: formData.get("city") as string,
        address: formData.get("address") as string,
      },
    },
  };

  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    console.error("Signup error:", error);
    redirect("/register?error=signup_failed");
  }

  // Ha a felhasználó létrejött, de még nem erősítette meg az email-jét
  if (authData.user && !authData.user.email_confirmed_at) {
    redirect("/register?success=confirmation_sent");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
