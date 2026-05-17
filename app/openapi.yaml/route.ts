import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const PLACEHOLDER = "https://tu-app.vercel.app";

export function buildOpenApiYaml(template: string, baseUrl: string): string {
  return template.replaceAll(PLACEHOLDER, baseUrl.replace(/\/$/, ""));
}

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const template = readFileSync(join(process.cwd(), "docs", "openapi-template.yaml"), "utf-8");
  return new Response(buildOpenApiYaml(template, baseUrl), {
    headers: { "Content-Type": "application/yaml; charset=utf-8" },
  });
}
