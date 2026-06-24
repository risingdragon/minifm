export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  teamId: string;
  overall: number;
  potential: number;
  marketValue: number;
  weeklyWage: number;
  contractYears: number;
  isListed: boolean;
  isStarter: boolean;
}

export interface PlayerGrowthChange {
  playerId: string;
  previousOverall: number;
  nextOverall: number;
  delta: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  leagueId: string;
  players: string[];
  balance: number;
  stadiumCapacity: number;
  ticketPrice: number;
  fanBase: number;
  isUserControlled: boolean;
  primaryColor: string;
}

export interface Match {
  id: string;
  leagueId: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'played';
}

export interface League {
  id: string;
  name: string;
  level: number;
  season: string;
  teamIds: string[];
  matches: string[];
  currentRound: number;
  totalRounds: number;
}

export interface LeagueSystem {
  id: string;
  season: string;
  leagueIds: string[];
  promotionSlots: number;
  relegationSlots: number;
  lowestLevel: number;
}

export interface Standing {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TransferMarket {
  listedPlayerIds: string[];
  lastRefreshRound: number;
  lastRefreshSeason: string;
}

export type FinanceLogType = 'ticketIncome' | 'wageExpense' | 'transferFee';

export interface FinanceLog {
  id: string;
  season: string;
  round: number | null;
  teamId: string;
  type: FinanceLogType;
  amount: number;
  description: string;
}

export interface FinanceSummary {
  ticketIncome: number;
  wageExpense: number;
  net: number;
}

export interface GameState {
  leagueSystem: LeagueSystem;
  leagues: League[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  userTeamId: string;
  transferMarket: TransferMarket;
  financeLogs: FinanceLog[];
  seasonHomeIncomeByLeague: Record<string, number>;
  lastFinanceSummary?: FinanceSummary;
  lastGrowthChanges?: PlayerGrowthChange[];
  seasonGrowthChanges?: PlayerGrowthChange[];
  lastRetiredPlayerIds?: string[];
  lastYouthPlayerIds?: string[];
}

export type View = 'dashboard' | 'squad' | 'match' | 'standings' | 'transfers' | 'seasonEnd';
