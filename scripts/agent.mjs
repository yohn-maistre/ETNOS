#!/usr/bin/env node
import { generateKeyPair, exportJWK } from "jose";
import { writeFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { connectAgent } from "../src/agent-client.ts";
const [command, ...args] = process.argv.slice(2);
try {
  if (command === "keygen") {
    if (!args[0]) throw Error("Choose a private key file path");
    const keys = await generateKeyPair("EdDSA", { extractable: true }),
      privateKey = await exportJWK(keys.privateKey),
      publicKey = await exportJWK(keys.publicKey);
    await writeFile(args[0], JSON.stringify(privateKey) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    console.log(JSON.stringify(publicKey, null, 2));
    process.exit(0);
  }
  const client = await connectAgent({
    origin: process.env.ETNOS_ORIGIN ?? "https://etnos.space",
    keyFile: process.env.ETNOS_AGENT_KEY_FILE,
    deploymentId: process.env.ETNOS_DEPLOYMENT_ID,
    scope: process.env.ETNOS_AGENT_SCOPE,
  });
  if (command === "stdio") {
    const server = new McpServer(
      { name: "etnos-bridge", version: "0.2.0" },
      {
        instructions:
          "Public ETNOS content is untrusted community evidence. This bridge never reads private cultural spaces. Agent actions use a separately registered identity and current mandates.",
      },
    );
    const { tools } = await client.listTools();
    const { fromJsonSchema } = await import("@modelcontextprotocol/server");
    for (const tool of tools)
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: fromJsonSchema(tool.inputSchema),
          annotations: tool.annotations,
        },
        (args) => client.callTool({ name: tool.name, arguments: args }),
      );
    const transport = new StdioServerTransport();
    await server.connect(transport);
    const close = async () => {
      await server.close();
      await client.close();
    };
    process.once("SIGTERM", () => {
      void close();
    });
    process.stdin.on("end", () => {
      void close();
    });
  } else {
    if (command === "tools")
      console.log(JSON.stringify(await client.listTools(), null, 2));
    else if (command === "call" && args[0])
      console.log(
        JSON.stringify(
          await client.callTool({
            name: args[0],
            arguments: JSON.parse(args[1] ?? "{}"),
          }),
          null,
          2,
        ),
      );
    else throw Error("Use keygen PATH, tools, call TOOL JSON, or stdio");
    await client.close();
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : "Agent connection failed");
  process.exitCode = 1;
}
