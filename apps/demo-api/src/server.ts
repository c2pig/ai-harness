import { createApp } from "./createApp.js";

const port = Number(process.env.PORT ?? 4010);

let shuttingDown = false;

createApp()
  .then(({ app, mcpPool }) => {
    const server = app.listen(port, () => {
      console.log(`demo-api listening on http://localhost:${port}`);
    });

    const shutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`Shutting down (${signal})…`);
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }).catch((err) => {
        console.error("HTTP server close error:", err);
      });
      await mcpPool.releaseAll().catch((err) => {
        console.error("MCP pool release error:", err);
      });
      console.warn(
        "[harness] In-memory run store was not persisted; active runs are lost.",
      );
      process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
