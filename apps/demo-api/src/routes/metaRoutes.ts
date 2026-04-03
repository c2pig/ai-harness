import type { Express } from "express";
import path from "node:path";
import { buildSkillIndex } from "@agent-harness/skill-loader";
import type { DemoApiDeps } from "./deps.js";

export function registerMetaRoutes(app: Express, deps: DemoApiDeps): void {
  const { cataloguePath, skillsCatalog, publicDir } = deps;

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/meta/catalogue", (_req, res) => {
    res.json({
      skills: buildSkillIndex(skillsCatalog),
      path: cataloguePath,
    });
  });

  app.get("/ui", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}
