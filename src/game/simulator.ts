import type { FinanceLog, FinanceSummary, Match, Player, PlayerGrowthChange, Team } from '../models/types';
import { settleMatchFinances } from './finance';
import { settleGrowthAfterMatch } from './growth';
import { getStarters, selectAutoLineup } from './lineup';

export function simulateRound(
  round: number,
  matches: Match[],
  teams: Team[],
  players: Player[],
  seasonHomeIncomeByLeague: Record<string, number>,
  season = '1',
  userTeamId?: string,
): {
  matches: Match[];
  teams: Team[];
  players: Player[];
  growthChanges: PlayerGrowthChange[];
  financeLogs: FinanceLog[];
  financeSummary: FinanceSummary;
} {
  let updatedPlayers = teams.flatMap((team) => selectAutoLineup(team, players));
  let updatedTeams = teams;
  const newlyPlayedMatches: Match[] = [];
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
    const playedMatch = {
      ...match,
      homeScore: generateScore(homePower, awayPower),
      awayScore: generateScore(awayPower, homePower),
      status: 'played' as const,
    };

    newlyPlayedMatches.push(playedMatch);
    return playedMatch;
  });

  if (newlyPlayedMatches.length === 0) {
    return {
      matches: updatedMatches,
      teams: updatedTeams,
      players: updatedPlayers,
      growthChanges: [],
      financeLogs: [],
      financeSummary: { revenueIncome: 0, wageExpense: 0, net: 0 },
    };
  }

  const growthResult = settleGrowthAfterMatch(updatedPlayers);
  updatedPlayers = growthResult.players;

  const financeResult = settleMatchFinances({
    matches: newlyPlayedMatches,
    teams: updatedTeams,
    players: updatedPlayers,
    seasonHomeIncomeByLeague,
    season,
    round,
  });
  updatedTeams = financeResult.teams;

  return {
    matches: updatedMatches,
    teams: updatedTeams,
    players: updatedPlayers,
    growthChanges: growthResult.changes,
    financeLogs: financeResult.logs,
    financeSummary: userTeamId ? financeResult.summaryByTeam[userTeamId] ?? { revenueIncome: 0, wageExpense: 0, net: 0 } : { revenueIncome: 0, wageExpense: 0, net: 0 },
  };
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
