import { describe, it, expect } from "vitest";
import { GET } from "../route";

function makeReq(url: string) {
  return new Request(url);
}

describe("GET /docs", () => {
  it("returns 200 with Scalar HTML", async () => {
    const res = await GET(makeReq("http://localhost:3000/docs") as never);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("scalar");
    expect(html).toContain("/openapi.yaml");
  });

  it("returns 200 when ?token= is empty", async () => {
    const res = await GET(makeReq("http://localhost:3000/docs?token=") as never);
    expect(res.status).toBe(200);
  });

  it("embeds the token when ?token= is provided", async () => {
    const res = await GET(makeReq("http://localhost:3000/docs?token=sml_abc123") as never);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("sml_abc123");
  });
});
