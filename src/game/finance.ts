import type { FinanceLog, FinanceSummary, Match, Player, Team } from '../models/types';

const MARKET_VALUE_BASE = 1_500_000;
const MIN_MARKET_VALUE = 50_000;
const MIN_WEEKLY_WAGE = 500;
const HOME_MATCHES_PER_SEASON = 19;

const LEAGUE_REVENUE_BY_LEVEL = new Map([
  [1, { broadcast: 648_000_000, sponsorship: 216_000_000 }],
  [2, { broadcast: 402_000_000, sponsorship: 134_000_000 }],
]);

export function calculateMarketValue(player: Pick<Player, 'age' | 'overall' | 'potential'>): number {
  const overall = clamp(player.overall, 1, 200);
  const potential = clamp(player.potential, overall, 200);
  const age = clamp(player.age, 16, 35);
  const normalized = (overall - 100) / 80;
  const abilityMult = Math.pow(10, Math.max(0, normalized) * 3.2);
  const ageFactor = Math.max(0.05, calculateAgeFactor(age));
  const potBonus = calculatePotentialBonus(age, overall, potential);

  return Math.max(MIN_MARKET_VALUE, Math.round(MARKET_VALUE_BASE * abilityMult * ageFactor * potBonus));
}

export function calculateWeeklyWage(player: Pick<Player, 'age' | 'overall' | 'potential'>): number {
  return Math.max(MIN_WEEKLY_WAGE, Math.round(calculateMarketValue(player) / 2500));
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
  void players;
  return Object.fromEntries(calculateLeagueHomeIncomes(teams));
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
    const summary = summaryByTeam[teamId] ?? { revenueIncome: 0, wageExpense: 0, net: 0 };

    if (type === 'leagueIncome') {
      summary.revenueIncome += amount;
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

    const leagueIncome = seasonHomeIncomeByLeague[homeTeam.leagueId] ?? 0;
    addDelta(homeTeam.id, leagueIncome, 'leagueIncome', `${homeTeam.name} broadcast and sponsorship income`);
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

function calculateLeagueHomeIncomes(teams: Team[]): Map<string, number> {
  const leagueLevels = new Map<string, number>();

  teams.forEach((team) => {
    const leagueIdParts = team.leagueId.split('-');
    const level = Number(leagueIdParts[leagueIdParts.length - 1]);
    leagueLevels.set(team.leagueId, Number.isFinite(level) ? level : 2);
  });

  return new Map(
    Array.from(leagueLevels.entries()).map(([leagueId, level]) => [
      leagueId,
      Math.round(getLeagueAnnualRevenue(level) / HOME_MATCHES_PER_SEASON),
    ]),
  );
}

export function calculateTeamAnnualWages(teamId: string, players: Player[]): number {
  return players
    .filter((player) => player.teamId === teamId)
    .reduce((total, player) => total + player.weeklyWage * 52, 0);
}

export function getLeagueAnnualRevenue(level: number): number {
  const revenue = LEAGUE_REVENUE_BY_LEVEL.get(level) ?? LEAGUE_REVENUE_BY_LEVEL.get(2);
  return revenue ? revenue.broadcast + revenue.sponsorship : 0;
}

export function calculateWageHealthPercent(team: Team, players: Player[]): number {
  const leagueIdParts = team.leagueId.split('-');
  const annualRevenue = getLeagueAnnualRevenue(Number(leagueIdParts[leagueIdParts.length - 1]));

  if (annualRevenue <= 0) {
    return 0;
  }

  return (calculateTeamAnnualWages(team.id, players) / annualRevenue) * 100;
}

function calculateAgeFactor(age: number): number {
  if (age <= 18) {
    return 0.45 + (age - 16) * 0.08;
  }

  if (age <= 22) {
    return 0.60 + (age - 18) * 0.07;
  }

  if (age <= 27) {
    return 0.88 + (age - 22) * 0.022;
  }

  if (age <= 30) {
    return 0.99 - (age - 27) * 0.07;
  }

  if (age <= 32) {
    return 0.78 - (age - 30) * 0.10;
  }

  if (age <= 34) {
    return 0.58 - (age - 32) * 0.16;
  }

  return 0.26 - (age - 34) * 0.20;
}

function calculatePotentialBonus(age: number, overall: number, potential: number): number {
  const gap = Math.max(0, potential - overall);

  if (age <= 22) {
    return 1 + gap * 0.007;
  }

  if (age <= 26) {
    return 1 + gap * 0.003;
  }

  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
