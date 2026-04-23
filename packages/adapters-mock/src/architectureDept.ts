import { loadFixtureJson } from "./loadFixtureJson.js";

export type ArchitectureDeptFixture = {
  department: string;
  organization: string;
  people: Array<{
    id: string;
    name: string;
    role: string;
    primaryPrograms: string[];
  }>;
  projects: Array<{
    id: string;
    name: string;
    summary: string;
    programPm: { name: string; email: string };
    stack?: string[];
    pendingDecisions?: string[];
  }>;
};

/** Loads TechCorp architecture department demo fixture (people, projects, PMs). */
export function getArchitectureDeptFixture(): ArchitectureDeptFixture {
  return loadFixtureJson<ArchitectureDeptFixture>("architectureDept.json");
}
