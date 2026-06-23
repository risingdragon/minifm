import type { FinanceLog, FinanceSummary, Match, Player, Team } from '../models/types';

export function calculateMarketValue(player: Pick<Player, 'age' | 'overall' | 'potential'>): number {
  const baseValue = player.overall * player.overall * 100;
  const potentialBonus = Math.max(0, player.potential - player.overall) * 5000;
  const ageModifier = player.age <= 21 ? 1.25 : player.age <= 25 ? 1.15 : player.age <= 29 ? 1 : player.age <= 32 ? 0.75 : 0.45;

  return Math.max(1000, Math.round((baseValue + potentialBonus) * ageModifier));
}

export function calculateWeeklyWage(marketValue: number): number {
  return clamp(Math.round(marketValue * 0.002), 100, 200000);
}

export function refreshPlayerFinance(player: Player): Player {
  const marketValue = calculateMarketValue(player);

  return {
    ...player,
    marketValue,
    weeklyWage: calculateWeeklyWage(marketValue),
  };
}

export function settleMatchFinances({
  matches,
  teams,
  players,
  season,
  round,
}: {
  matches: Match[];
  teams: Team[];
  players: Player[];
  season: string;
  round: number;
}): { teams: Team[]; logs: FinanceLog[]; summaryByTeam: Record<string, FinanceSummary> } {
  const teamDeltas = new Map<string, number>();
  const logs: FinanceLog[] = [];
  const summaryByTeam: Record<string, FinanceSummary> = {};

  const addDelta = (teamId: string, amount: number, type: FinanceLog['type'], description: string) => {
    teamDeltas.set(teamId, (teamDeltas.get(teamId) ?? 0) + amount);
    const summary = summaryByTeam[teamId] ?? { ticketIncome: 0, wageExpense: 0, net: 0 };

    if (type === 'ticketIncome') {
      summary.ticketIncome += amount;
    }

    if (type === 'wageExpense') {
      summary.wageExpense += Math.abs(amount);
    }

    summary.net += amount;
    summaryByTeam[teamId] = summary;
    logs.push({
      id: `finance-${season}-${round}-${logs.length + 1}`,
      season,
      round,
      teamId,
      type,
      amount,
      description,
    });
  };

  matches.forEach((match) => {
    const homeTeam = teams.find((team) => team.id === match.homeTeamId);
    if (!homeTeam || match.status !== 'played') {
      return;
    }

    const ticketIncome = calculateTicketIncome(homeTeam);
    addDelta(homeTeam.id, ticketIncome, 'ticketIncome', `${homeTeam.name} home ticket income`);
  });

  teams.forEach((team) => {
    const wageExpense = players
      .filter((player) => player.teamId === team.id)
      .reduce((total, player) => total + player.weeklyWage, 0);

    addDelta(team.id, -wageExpense, 'wageExpense', `${team.name} weekly wages`);
  });

  return {
    teams: teams.map((team) => ({
      ...team,
      balance: team.balance + (teamDeltas.get(team.id) ?? 0),
    })),
    logs,
    summaryByTeam,
  };
}

function calculateTicketIncome(team: Team): number {
  const attendanceRate = clamp(0.45 + team.fanBase / 200, 0.35, 1);
  const attendance = Math.round(team.stadiumCapacity * attendanceRate);
  return attendance * team.ticketPrice;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
