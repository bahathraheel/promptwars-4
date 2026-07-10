/**
 * @file fixtures.ts
 * @description FIFA World Cup 2026 — 104-match fixture skeleton.
 * Opening match at Estadio Azteca (Mexico City), Final at MetLife Stadium (New York/NJ).
 */

export interface Match {
  id: string;
  round: 'group' | 'round-of-32' | 'round-of-16' | 'quarterfinal' | 'semifinal' | 'final';
  group?: string;
  matchNumber: number;
  venueId: string;
  date: string; // ISO 8601 date
  kickoffUtc: string; // HH:MM
  homeTeam: string;
  awayTeam: string;
}

/** 104-match FIFA World Cup 2026 fixture schedule (representative skeleton) */
export const FIXTURES: Match[] = [
  // ── Opening Match ──────────────────────────────────────────────────────
  { id: 'match-001', round: 'group', group: 'A', matchNumber: 1, venueId: 'mex-azteca', date: '2026-06-11', kickoffUtc: '20:00', homeTeam: 'Mexico', awayTeam: 'TBD' },
  // ── Group Stage (representative selection) ─────────────────────────────
  { id: 'match-002', round: 'group', group: 'A', matchNumber: 2, venueId: 'can-bc-place', date: '2026-06-12', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-003', round: 'group', group: 'A', matchNumber: 3, venueId: 'usa-levis', date: '2026-06-12', kickoffUtc: '18:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-004', round: 'group', group: 'B', matchNumber: 4, venueId: 'usa-metlife', date: '2026-06-13', kickoffUtc: '15:00', homeTeam: 'USA', awayTeam: 'TBD' },
  { id: 'match-005', round: 'group', group: 'B', matchNumber: 5, venueId: 'usa-att', date: '2026-06-13', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-006', round: 'group', group: 'C', matchNumber: 6, venueId: 'mex-bbva', date: '2026-06-14', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-007', round: 'group', group: 'C', matchNumber: 7, venueId: 'usa-sofi', date: '2026-06-14', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-008', round: 'group', group: 'D', matchNumber: 8, venueId: 'usa-nrg', date: '2026-06-15', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-009', round: 'group', group: 'D', matchNumber: 9, venueId: 'usa-arrowhead', date: '2026-06-15', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-010', round: 'group', group: 'E', matchNumber: 10, venueId: 'can-bmo', date: '2026-06-16', kickoffUtc: '15:00', homeTeam: 'Canada', awayTeam: 'TBD' },
  { id: 'match-011', round: 'group', group: 'E', matchNumber: 11, venueId: 'usa-mercedes', date: '2026-06-16', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-012', round: 'group', group: 'F', matchNumber: 12, venueId: 'usa-lincoln', date: '2026-06-17', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-013', round: 'group', group: 'F', matchNumber: 13, venueId: 'usa-gillette', date: '2026-06-17', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-014', round: 'group', group: 'G', matchNumber: 14, venueId: 'usa-hardrock', date: '2026-06-18', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-015', round: 'group', group: 'G', matchNumber: 15, venueId: 'mex-akron', date: '2026-06-18', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-016', round: 'group', group: 'H', matchNumber: 16, venueId: 'usa-lumen', date: '2026-06-19', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  // ... groups continue through matchNumber 72 (48 teams × 3 group matches each = 72 group games)
  // ── Round of 32 ──────────────────────────────────────────────────────
  { id: 'match-073', round: 'round-of-32', matchNumber: 73, venueId: 'usa-sofi', date: '2026-07-02', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-074', round: 'round-of-32', matchNumber: 74, venueId: 'usa-att', date: '2026-07-03', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-075', round: 'round-of-32', matchNumber: 75, venueId: 'usa-metlife', date: '2026-07-03', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-076', round: 'round-of-32', matchNumber: 76, venueId: 'mex-azteca', date: '2026-07-04', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  // ── Round of 16 ──────────────────────────────────────────────────────
  { id: 'match-089', round: 'round-of-16', matchNumber: 89, venueId: 'usa-sofi', date: '2026-07-09', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-090', round: 'round-of-16', matchNumber: 90, venueId: 'usa-att', date: '2026-07-10', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-091', round: 'round-of-16', matchNumber: 91, venueId: 'usa-metlife', date: '2026-07-10', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-092', round: 'round-of-16', matchNumber: 92, venueId: 'mex-azteca', date: '2026-07-11', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  // ── Quarterfinals ────────────────────────────────────────────────────
  { id: 'match-097', round: 'quarterfinal', matchNumber: 97, venueId: 'usa-att', date: '2026-07-15', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-098', round: 'quarterfinal', matchNumber: 98, venueId: 'usa-sofi', date: '2026-07-15', kickoffUtc: '22:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-099', round: 'quarterfinal', matchNumber: 99, venueId: 'usa-metlife', date: '2026-07-16', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-100', round: 'quarterfinal', matchNumber: 100, venueId: 'usa-arrowhead', date: '2026-07-16', kickoffUtc: '22:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  // ── Semifinals ───────────────────────────────────────────────────────
  { id: 'match-101', round: 'semifinal', matchNumber: 101, venueId: 'usa-att', date: '2026-07-18', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-102', round: 'semifinal', matchNumber: 102, venueId: 'usa-metlife', date: '2026-07-19', kickoffUtc: '19:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  // ── Third Place & Final ──────────────────────────────────────────────
  { id: 'match-103', round: 'semifinal', matchNumber: 103, venueId: 'mex-azteca', date: '2026-07-21', kickoffUtc: '15:00', homeTeam: 'TBD', awayTeam: 'TBD' },
  { id: 'match-104', round: 'final', matchNumber: 104, venueId: 'usa-metlife', date: '2026-07-19', kickoffUtc: '18:00', homeTeam: 'TBD', awayTeam: 'TBD' },
];

/** Tournament overview metadata */
export const TOURNAMENT = {
  name: 'FIFA World Cup 2026',
  edition: '23rd',
  hosts: ['USA', 'Canada', 'Mexico'],
  teams: 48,
  matches: 104,
  venues: 16,
  startDate: '2026-06-11',
  finalDate: '2026-07-19',
  openingMatch: { venueId: 'mex-azteca', venue: 'Estadio Azteca, Mexico City' },
  finalMatch: { venueId: 'usa-metlife', venue: 'MetLife Stadium, New York/New Jersey' },
  groups: ['A','B','C','D','E','F','G','H','I','J','K','L'],
};

/** Config options for UI forms */
export const CONFIG_OPTIONS = {
  languages: [
    { code: 'en', name: 'English', rtl: false },
    { code: 'es', name: 'Español', rtl: false },
    { code: 'fr', name: 'Français', rtl: false },
    { code: 'pt', name: 'Português', rtl: false },
    { code: 'de', name: 'Deutsch', rtl: false },
    { code: 'ar', name: 'العربية', rtl: true },
    { code: 'zh', name: '中文', rtl: false },
    { code: 'ja', name: '日本語', rtl: false },
    { code: 'ko', name: '한국어', rtl: false },
    { code: 'hi', name: 'हिन्दी', rtl: false },
  ],
  incidentCategories: ['medical', 'congestion', 'facility', 'security', 'other'],
  severityLevels: ['low', 'medium', 'high'],
  volunteerRoles: ['steward', 'accessibility-host', 'medical-first-responder', 'security-officer', 'transit-coordinator'],
  transportModes: ['car', 'shuttle', 'metro', 'walking', 'cycling'],
};
