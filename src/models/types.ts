export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  teamId: string;
  overall: number;
  isStarter: boolean;
  isGeneratedFillIn?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  players: string[];
  isUserControlled: boolean;
  primaryColor: string;
}

export interface Match {
  id: string;
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
  season: string;
  teamIds: string[];
  matches: string[];
  currentRound: number;
  totalRounds: number;
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

export interface GameState {
  league: League;
  teams: Team[];
  players: Player[];
  matches: Match[];
}

export type View = 'dashboard' | 'squad' | 'match' | 'standings' | 'seasonEnd';
