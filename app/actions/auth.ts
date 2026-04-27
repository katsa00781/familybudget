"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/utils/supabase/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function login(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !isValidEmail(email) || !password) {
    redirect("/login?error=login_failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      redirect("/login?error=email_not_confirmed");
    } else {
      redirect("/login?error=login_failed");
    }
  }

  revalidatePath("/", "layout");
  redirect("/attekintes");
}

export async function signup(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const birthDate = (formData.get("birthDate") as string)?.trim();
  const zipCode = (formData.get("zipCode") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();

  if (!email || !isValidEmail(email)) {
    redirect("/register?error=invalid_email");
  }
  if (!password || password.length < 8) {
    redirect("/register?error=weak_password");
  }
  if (!fullName || fullName.length < 2) {
    redirect("/register?error=invalid_name");
  }

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        birth_date: birthDate || null,
        zip_code: zipCode || null,
        city: city || null,
        address: address || null,
      },
    },
  });

  if (error) {
    redirect("/register?error=signup_failed");
  }

  if (authData.user && !authData.user.email_confirmed_at) {
    redirect("/register?success=confirmation_sent");
  }

  revalidatePath("/", "layout");
  redirect("/attekintes");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
