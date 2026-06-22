import type { Player, Position, Team } from '../models/types';

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

  const selected: Player[] = [];

  (Object.keys(FORMATION) as Position[]).forEach((position) => {
    const candidates = teamPlayers
      .filter((player) => player.position === position && !selected.some((starter) => starter.id === player.id))
      .sort((a, b) => b.overall - a.overall);

    selected.push(...candidates.slice(0, FORMATION[position]));
  });

  const remainingSlots = 11 - selected.length;
  if (remainingSlots > 0) {
    const backups = teamPlayers
      .filter((player) => !selected.some((starter) => starter.id === player.id))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, remainingSlots);
    selected.push(...backups);
  }

  while (selected.length < 11) {
    const fillInIndex = selected.length + 1;
    selected.push({
      id: `${team.id}-fill-${fillInIndex}`,
      name: `补位球员 ${fillInIndex}`,
      age: 18,
      position: selected.length === 0 ? 'GK' : 'DF',
      teamId: team.id,
      overall: 1,
      potential: 1,
      isStarter: true,
      isGeneratedFillIn: true,
    });
  }

  return teamPlayers
    .map((player) => ({
      ...player,
      isStarter: selected.some((starter) => starter.id === player.id),
    }))
    .concat(selected.filter((player) => player.isGeneratedFillIn));
}

export function selectLineupForAllTeams(teams: Team[], players: Player[]): Player[] {
  return teams.flatMap((team) => selectAutoLineup(team, players));
}

export function getStarters(teamId: string, players: Player[]): Player[] {
  return players
    .filter((player) => player.teamId === teamId && player.isStarter)
    .sort((a, b) => positionOrder(a.position) - positionOrder(b.position) || b.overall - a.overall)
    .slice(0, 11);
}

export interface LineupWarning {
  substitute: Player;
  starter: Player;
  position: Position;
}

export function detectLineupWarnings(team: Team, players: Player[]): LineupWarning[] {
  const teamPlayers = players
    .filter((player) => player.teamId === team.id && !player.isGeneratedFillIn);

  const starters = teamPlayers.filter((player) => player.isStarter);
  const substitutes = teamPlayers.filter((player) => !player.isStarter);

  const warnings: LineupWarning[] = [];

  (Object.keys(FORMATION) as Position[]).forEach((position) => {
    const positionStarters = starters
      .filter((player) => player.position === position)
      .sort((a, b) => a.overall - b.overall);

    const positionSubstitutes = substitutes
      .filter((player) => player.position === position)
      .sort((a, b) => b.overall - a.overall);

    for (const substitute of positionSubstitutes) {
      for (const starter of positionStarters) {
        if (substitute.overall > starter.overall) {
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
