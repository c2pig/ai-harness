import type { ScenarioId } from "./scenarios.js";
import { loadFixtureJson } from "./loadFixtureJson.js";

export type PartyContactOption = {
  contactId: number;
  label: string;
};

export type PartyFixture = {
  name: string;
  contacts: PartyContactOption[];
};

export type ContactContextFixture = {
  defaultJobId: number;
  defaultMatchId: number;
  recommendedScenarioId: ScenarioId;
};

const partyData = loadFixtureJson<Record<string, PartyFixture>>("fixtureParties.json");
const contactContexts = loadFixtureJson<Record<string, ContactContextFixture>>(
  "candidateContexts.json",
);

export function getPartyFixture(partyId: number): PartyFixture | undefined {
  return partyData[String(partyId)];
}

/** @deprecated use getPartyFixture */
export function getHirerFixture(hirerId: number): PartyFixture | undefined {
  return getPartyFixture(hirerId);
}

export function getContactFixture(contactId: number): ContactContextFixture | undefined {
  return contactContexts[String(contactId)];
}

/** @deprecated use getContactFixture */
export function getCandidateFixture(
  candidateId: number,
): ContactContextFixture | undefined {
  return getContactFixture(candidateId);
}

export function listFixturePartiesForUi(): Array<{
  partyId: number;
  name: string;
  contacts: PartyContactOption[];
}> {
  return Object.entries(partyData).map(([id, p]) => ({
    partyId: Number(id),
    name: p.name,
    contacts: p.contacts,
  }));
}
