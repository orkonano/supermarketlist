"use client";

import { useState } from "react";

const TOOLS = [
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    file: "claude_desktop_config.json",
    snippet: (url: string) => `{
  "mcpServers": {
    "supermarketlist": {
      "command": "npx",
      "args": ["-y", "mcp-remote",
        "${url}/api/mcp",
        "--header",
        "Authorization: Bearer sml_..."]
    }
  }
}`,
  },
  {
    id: "cursor",
    label: "Cursor",
    file: ".cursor/mcp.json",
    snippet: (url: string) => `{
  "mcpServers": {
    "supermarketlist": {
      "command": "npx",
      "args": ["-y", "mcp-remote",
        "${url}/api/mcp",
        "--header",
        "Authorization: Bearer sml_..."]
    }
  }
}`,
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    file: "~/.gemini/settings.json",
    snippet: (url: string) => `{
  "mcpServers": {
    "supermarketlist": {
      "command": "npx",
      "args": ["-y", "mcp-remote",
        "${url}/api/mcp",
        "--header",
        "Authorization: Bearer sml_..."]
    }
  }
}`,
  },
] as const;

export default function McpSnippets({ baseUrl }: { baseUrl: string }) {
  const [active, setActive] = useState<string>(TOOLS[0].id);
  const tool = TOOLS.find((t) => t.id === active) ?? TOOLS[0];

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              active === t.id
                ? "bg-green-500 text-black"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto leading-relaxed">
        <span className="text-gray-500">{`// ${tool.file}`}</span>
        {"\n"}
        {tool.snippet(baseUrl)}
      </pre>
    </div>
  );
}
