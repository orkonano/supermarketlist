import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@napi-rs/keyring",
    "@vercel/oidc",
    "@vercel/queue",
    "@workflow/world-vercel",
  ],
};

export default withWorkflow(nextConfig);
