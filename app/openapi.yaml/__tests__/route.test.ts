import { describe, it, expect } from "vitest";
import { buildOpenApiYaml } from "../route";

const PLACEHOLDER = "https://tu-app.vercel.app";

describe("buildOpenApiYaml", () => {
  it("replaces the placeholder with a production URL", () => {
    const template = `url: ${PLACEHOLDER}/api/v1`;
    expect(buildOpenApiYaml(template, "https://myapp.vercel.app")).toBe(
      "url: https://myapp.vercel.app/api/v1"
    );
  });

  it("replaces with localhost when no base URL is set", () => {
    const template = `url: ${PLACEHOLDER}/api/v1`;
    expect(buildOpenApiYaml(template, "http://localhost:3000")).toBe(
      "url: http://localhost:3000/api/v1"
    );
  });

  it("replaces all occurrences (servers URL + MCP description)", () => {
    const template = `url: ${PLACEHOLDER}/api/v1\nother: ${PLACEHOLDER}/api/mcp`;
    const result = buildOpenApiYaml(template, "https://prod.app");
    expect(result).toBe("url: https://prod.app/api/v1\nother: https://prod.app/api/mcp");
  });

  it("strips trailing slash from baseUrl before substituting", () => {
    const template = `url: ${PLACEHOLDER}/api/v1`;
    expect(buildOpenApiYaml(template, "https://myapp.vercel.app/")).toBe(
      "url: https://myapp.vercel.app/api/v1"
    );
  });
});
