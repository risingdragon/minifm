import type { FinanceLog, FinanceSummary, Match, Player, Team } from '../models/types';

export function calculateMarketValue(player: Pick<Player, 'age' | 'overall' | 'potential'>): number {
  const baseValue = player.overall * player.overall * 100;
  const potentialBonus = Math.max(0, player.potential - player.overall) * 5000;
  const ageModifier = player.age <= 21 ? 1.25 : player.age <= 25 ? 1.15 : player.age <= 29 ? 1 : player.age <= 32 ? 0.75 : 0.45;

  return Math.max(1000, Math.round((baseValue + potentialBonus) * ageModifier));
}

export function calculateWeeklyWage(player: Pick<Player, 'overall'>): number {
  const abilityBand = Math.ceil(clamp(player.overall, 1, 200) / 10);
  return abilityBand * 1000;
}

export function refreshPlayerFinance(player: Player): Player {
  const marketValue = calculateMarketValue(player);

  return {
    ...player,
    marketValue,
    weeklyWage: calculateWeeklyWage(player),
  };
}

export function calculateSeasonHomeIncomeByLeague(teams: Team[], players: Player[]): Record<string, number> {
  const wageByTeam = calculateTeamWages(teams, players);
  return Object.fromEntries(calculateLeagueHomeIncomes(teams, wageByTeam));
}

export function settleMatchFinances({
  matches,
  teams,
  players,
  seasonHomeIncomeByLeague,
  season,
  round,
}: {
  matches: Match[];
  teams: Team[];
  players: Player[];
  seasonHomeIncomeByLeague: Record<string, number>;
  season: string;
  round: number;
}): { teams: Team[]; logs: FinanceLog[]; summaryByTeam: Record<string, FinanceSummary> } {
  const teamDeltas = new Map<string, number>();
  const logs: FinanceLog[] = [];
  const summaryByTeam: Record<string, FinanceSummary> = {};
  const wageByTeam = calculateTeamWages(teams, players);

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

    const ticketIncome = seasonHomeIncomeByLeague[homeTeam.leagueId] ?? 0;
    addDelta(homeTeam.id, ticketIncome, 'ticketIncome', `${homeTeam.name} home ticket income`);
  });

  teams.forEach((team) => {
    const wageExpense = wageByTeam.get(team.id) ?? 0;

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

function calculateTeamWages(teams: Team[], players: Player[]): Map<string, number> {
  const wages = new Map(teams.map((team) => [team.id, 0]));

  players.forEach((player) => {
    wages.set(player.teamId, (wages.get(player.teamId) ?? 0) + player.weeklyWage);
  });

  return wages;
}

function calculateLeagueHomeIncomes(teams: Team[], wageByTeam: Map<string, number>): Map<string, number> {
  const maxWageByLeague = new Map<string, number>();

  teams.forEach((team) => {
    const teamWage = wageByTeam.get(team.id) ?? 0;
    maxWageByLeague.set(team.leagueId, Math.max(maxWageByLeague.get(team.leagueId) ?? 0, teamWage));
  });

  return new Map(
    Array.from(maxWageByLeague.entries()).map(([leagueId, maxWage]) => [leagueId, Math.round(maxWage * 2.5)]),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
