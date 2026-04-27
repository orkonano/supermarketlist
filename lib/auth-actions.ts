"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, deleteSession } from "./session";
import { SignupFormSchema, LoginFormSchema, FormState } from "./definitions";

export async function signup(state: FormState, formData: FormData): Promise<FormState> {
  const validated = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, hashedPassword },
  });

  await createSession(user.id);
  redirect("/");
}

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const validated = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: "Invalid email or password." };
  }

  const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordMatch) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
