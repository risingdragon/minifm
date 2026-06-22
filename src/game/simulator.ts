import type { Match, Player, PlayerGrowthChange, Team } from '../models/types';
import { settleGrowthAfterMatch } from './growth';
import { getStarters, selectAutoLineup } from './lineup';

export function simulateRound(round: number, matches: Match[], teams: Team[], players: Player[]): {
  matches: Match[];
  players: Player[];
  growthChanges: PlayerGrowthChange[];
} {
  let updatedPlayers = teams.flatMap((team) => selectAutoLineup(team, players));
  const growthChanges: PlayerGrowthChange[] = [];
  const updatedMatches = matches.map((match) => {
    if (match.round !== round || match.status === 'played') {
      return match;
    }

    const homeTeam = teams.find((team) => team.id === match.homeTeamId);
    const awayTeam = teams.find((team) => team.id === match.awayTeamId);

    if (!homeTeam || !awayTeam) {
      return match;
    }

    const homePower = calculateTeamPower(homeTeam.id, updatedPlayers) + 3;
    const awayPower = calculateTeamPower(awayTeam.id, updatedPlayers);
    const homeScore = generateScore(homePower, awayPower);
    const awayScore = generateScore(awayPower, homePower);

    return {
      ...match,
      homeScore,
      awayScore,
      status: 'played' as const,
    };
  });

  // 每轮比赛结束后统一结算成长，只执行一次
  const growthResult = settleGrowthAfterMatch(updatedPlayers);
  updatedPlayers = growthResult.players;
  growthChanges.push(...growthResult.changes);

  return { matches: updatedMatches, players: updatedPlayers, growthChanges };
}

export function calculateTeamPower(teamId: string, players: Player[]): number {
  const starters = getStarters(teamId, players);
  const activePlayers = starters.length > 0 ? starters : players.filter((player) => player.teamId === teamId).slice(0, 11);
  return activePlayers.reduce((sum, player) => sum + player.overall, 0);
}

function generateScore(ownPower: number, opponentPower: number): number {
  const baseGoals = 1.2;
  const expectedGoals = clamp(baseGoals + (ownPower - opponentPower) / 350, 0.2, 3.2);
  const randomFactor = Math.random();

  if (randomFactor < 0.18 / expectedGoals) {
    return 0;
  }

  const noisy = expectedGoals + (Math.random() - 0.45) * 1.8 + Math.random() * 0.8;
  return Math.round(clamp(noisy, 0, 5));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
