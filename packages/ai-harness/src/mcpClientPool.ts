import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** Stdio MCP spawn config (same shape as McpServerLauncher in types.ts). */
export type McpLauncherConfig = {
  command: string;
  args: string[];
};

type PoolEntry = {
  client: Client;
  transport: StdioClientTransport;
};

/**
 * Reuses stdio MCP client connections across skill invocations (one subprocess per server id).
 */
export class McpClientPool {
  private readonly launchers: Record<string, McpLauncherConfig>;

  private readonly clients = new Map<string, Promise<PoolEntry>>();

  constructor(launchers: Record<string, McpLauncherConfig>) {
    this.launchers = launchers;
  }

  async acquire(serverId: string): Promise<Client> {
    let pending = this.clients.get(serverId);
    if (!pending) {
      pending = this.spawn(serverId);
      this.clients.set(serverId, pending);
    }
    const { client } = await pending;
    return client;
  }

  private async spawn(serverId: string): Promise<PoolEntry> {
    const launcher = this.launchers[serverId];
    if (!launcher) {
      throw new Error(`No MCP launcher configured for server id "${serverId}"`);
    }
    const transport = new StdioClientTransport({
      command: launcher.command,
      args: launcher.args,
    });
    const client = new Client({
      name: "ai-harness",
      version: "0.2.0",
    });
    await client.connect(transport);
    return { client, transport };
  }

  async releaseAll(): Promise<void> {
    const entries = [...this.clients.values()];
    this.clients.clear();
    await Promise.all(
      entries.map(async (p) => {
        try {
          const { client } = await p;
          await client.close();
        } catch {
          /* ignore */
        }
      }),
    );
  }
}
