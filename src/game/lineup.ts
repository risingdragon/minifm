import type { Player, Position, Team } from '../models/types';
import { calculateMarketValue, calculateWeeklyWage } from './finance';

const FORMATION: Record<Position, number> = {
  GK: 1,
  DF: 4,
  MF: 4,
  FW: 2,
};

export function selectAutoLineup(team: Team, players: Player[]): Player[] {
  const teamPlayers = players
    .filter((player) => player.teamId === team.id)
    .map((player) => ({ ...player, isStarter: false }));
  const existingPlayerIds = new Set(teamPlayers.map((player) => player.id));

  const selected: Player[] = [];
  const fillInPlayers: Player[] = [];

  (Object.keys(FORMATION) as Position[]).forEach((position) => {
    const candidates = teamPlayers
      .filter((player) => player.position === position && !selected.some((starter) => starter.id === player.id))
      .sort(compareLineupPriority);

    selected.push(...candidates.slice(0, FORMATION[position]));
  });

  const remainingSlots = 11 - selected.length;
  if (remainingSlots > 0) {
    const backups = teamPlayers
      .filter((player) => !selected.some((starter) => starter.id === player.id))
      .sort(compareLineupPriority)
      .slice(0, remainingSlots);
    selected.push(...backups);
  }

  while (selected.length < 11) {
    let fillInIndex = selected.length + 1;
    while (
      existingPlayerIds.has(`${team.id}-fill-${fillInIndex}`) ||
      selected.some((player) => player.id === `${team.id}-fill-${fillInIndex}`)
    ) {
      fillInIndex += 1;
    }
    const age = 18;
    const overall = 1;
    const potential = 1 + randomInt(12, 32);
    const marketValue = calculateMarketValue({ age, overall, potential });
    const fillInPlayer: Player = {
      id: `${team.id}-fill-${fillInIndex}`,
      name: `填充球员 ${fillInIndex}`,
      age,
      position: selected.length === 0 ? 'GK' : 'DF',
      teamId: team.id,
      overall,
      potential,
      marketValue,
      weeklyWage: calculateWeeklyWage({ age, overall, potential }),
      contractYears: randomInt(1, 5),
      isListed: Math.random() < 0.25,
      isStarter: true,
    };
    selected.push(fillInPlayer);
    fillInPlayers.push(fillInPlayer);
  }

  return teamPlayers
    .map((player) => ({
      ...player,
      isStarter: selected.some((starter) => starter.id === player.id),
    }))
    .concat(fillInPlayers.filter((player) => !existingPlayerIds.has(player.id)));
}

export function selectLineupForAllTeams(teams: Team[], players: Player[]): Player[] {
  return teams.flatMap((team) => selectAutoLineup(team, players));
}

export function getStarters(teamId: string, players: Player[]): Player[] {
  return players
    .filter((player) => player.teamId === teamId && player.isStarter)
    .sort((a, b) => positionOrder(a.position) - positionOrder(b.position) || compareLineupPriority(a, b))
    .slice(0, 11);
}

export interface LineupWarning {
  substitute: Player;
  starter: Player;
  position: Position;
}

export function detectLineupWarnings(team: Team, players: Player[]): LineupWarning[] {
  const teamPlayers = players
    .filter((player) => player.teamId === team.id);

  const starters = teamPlayers.filter((player) => player.isStarter);
  const substitutes = teamPlayers.filter((player) => !player.isStarter);

  const warnings: LineupWarning[] = [];

  (Object.keys(FORMATION) as Position[]).forEach((position) => {
    const positionStarters = starters
      .filter((player) => player.position === position)
      .sort((a, b) => -compareLineupPriority(a, b));

    const positionSubstitutes = substitutes
      .filter((player) => player.position === position)
      .sort(compareLineupPriority);

    for (const substitute of positionSubstitutes) {
      for (const starter of positionStarters) {
        if (compareLineupPriority(substitute, starter) < 0) {
          warnings.push({
            substitute,
            starter,
            position,
          });
          break;
        }
      }
    }
  });

  return warnings;
}

function positionOrder(position: Position): number {
  return ['GK', 'DF', 'MF', 'FW'].indexOf(position);
}

function compareLineupPriority(a: Player, b: Player): number {
  return b.overall - a.overall || a.age - b.age || a.name.localeCompare(b.name, 'zh-CN');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
