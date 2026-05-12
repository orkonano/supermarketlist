import { z } from "zod";

export const SignupFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100, { message: "El nombre no puede superar los 100 caracteres." }).trim(),
  email: z.email({ message: "Ingresá un correo electrónico válido." }).trim(),
  password: z
    .string()
    .min(8, { message: "Debe tener al menos 8 caracteres." })
    .max(72, { message: "La contraseña no puede superar los 72 caracteres." })
    .regex(/[a-zA-Z]/, { message: "Debe contener al menos una letra." })
    .regex(/[0-9]/, { message: "Debe contener al menos un número." })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.email({ message: "Ingresá un correo electrónico válido." }).trim(),
  password: z.string().min(1, { message: "La contraseña es obligatoria." }).trim(),
});

export type FormState =
  | { errors?: { name?: string[]; email?: string[]; password?: string[] }; message?: string }
  | undefined;

export type SessionPayload = {
  userId: string;
  expiresAt: Date;
};
