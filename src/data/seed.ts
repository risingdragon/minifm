import type { GameState, League, Match, Player, Position, Team } from '../models/types';
import { createDoubleRoundRobinSchedule } from '../game/schedule';
import { selectLineupForAllTeams } from '../game/lineup';
import { calculateMarketValue, calculateSeasonHomeIncomeByLeague, calculateWeeklyWage } from '../game/finance';
import { createTransferMarket } from '../game/transfer';

const LEAGUE_DEFINITIONS = [
  { id: 'league-1', name: 'miniFM 一级联赛', level: 1 },
  { id: 'league-2', name: 'miniFM 二级联赛', level: 2 },
] as const;

const topTeamNames = [
  ['海港城', 'HGC', '#1f7a8c'],
  ['山麓联', 'SLU', '#34623f'],
  ['星河竞技', 'XHA', '#7c3aed'],
  ['北门骑士', 'BMK', '#c2410c'],
  ['银湾', 'YWB', '#64748b'],
  ['东岸运动', 'DYA', '#0f766e'],
  ['赤峰城', 'CFC', '#b91c1c'],
  ['云岭', 'YNL', '#2563eb'],
  ['黑石流浪', 'HSL', '#334155'],
  ['南湖', 'NHL', '#16a34a'],
  ['风帆联', 'FFU', '#0284c7'],
  ['金谷', 'JVG', '#ca8a04'],
  ['白塔', 'BTA', '#475569'],
  ['临江竞技', 'LJA', '#db2777'],
  ['松原', 'SYO', '#65a30d'],
  ['西桥', 'XQO', '#9333ea'],
  ['蓝山市', 'LSC', '#1d4ed8'],
  ['铁路人', 'TLR', '#57534e'],
  ['绿洲', 'LZO', '#059669'],
  ['新月', 'XYU', '#0891b2'],
];

const lowerTeamNames = [
  ['湖心镇', 'HXT', '#0d9488'],
  ['北原', 'BYU', '#4d7c0f'],
  ['清泉', 'QQN', '#0369a1'],
  ['红叶城', 'HYC', '#be123c'],
  ['石桥竞技', 'SQA', '#4338ca'],
  ['远帆', 'YFN', '#0f766e'],
  ['高岭', 'GLG', '#854d0e'],
  ['林港', 'LGN', '#15803d'],
  ['溪谷联', 'XGU', '#7e22ce'],
  ['铜山', 'TSN', '#a16207'],
  ['东塔', 'DTA', '#2563eb'],
  ['青川', 'QCN', '#059669'],
  ['白鹭', 'BLU', '#64748b'],
  ['南桥联', 'NQU', '#dc2626'],
  ['晨星', 'CXS', '#0891b2'],
  ['柏林湾', 'BLW', '#65a30d'],
  ['西岭', 'XLG', '#9333ea'],
  ['江北', 'JBE', '#1d4ed8'],
  ['金帆', 'JFN', '#ca8a04'],
  ['云松', 'YSG', '#475569'],
];

const surnames = ['林', '周', '陈', '吴', '郑', '赵', '孙', '冯', '许', '高', '梁', '宋', '唐', '韩', '曹'];
const givenNames = ['远', '鸣', '澈', '峻', '南', '航', '越', '川', '熙', '辰', '枫', '然', '烨', '衡', '皓'];

const POSITION_COUNTS: Record<Position, number> = {
  GK: 3,
  DF: 8,
  MF: 9,
  FW: 5,
};

const ABILITY_BANDS = [
  { min: 191, max: 200, count: 1 },
  { min: 181, max: 190, count: 3 },
  { min: 171, max: 180, count: 6 },
  { min: 161, max: 170, count: 10 },
  { min: 151, max: 160, count: 15 },
  { min: 141, max: 150, count: 21 },
  { min: 131, max: 140, count: 28 },
  { min: 121, max: 130, count: 35 },
  { min: 111, max: 120, count: 42 },
  { min: 101, max: 110, count: 49 },
  { min: 91, max: 100, count: 56 },
  { min: 81, max: 90, count: 63 },
  { min: 71, max: 80, count: 70 },
  { min: 61, max: 70, count: 77 },
  { min: 51, max: 60, count: 84 },
  { min: 41, max: 50, count: 91 },
  { min: 31, max: 40, count: 98 },
  { min: 21, max: 30, count: 105 },
  { min: 11, max: 20, count: 112 },
  { min: 1, max: 10, count: 34 },
];

interface PlayerCandidate {
  name: string;
  age: number;
  position: Position;
  overall: number;
  potential: number;
  marketValue: number;
  weeklyWage: number;
  contractYears: number;
  isListed: boolean;
}

export function createNewGame(): GameState {
  const leagues = createLeagues('1');
  const teams = createTeams(leagues);
  const lowestLeague = leagues.reduce((lowest, league) => (league.level > lowest.level ? league : lowest), leagues[0]);
  const lowestTeams = teams.filter((team) => team.leagueId === lowestLeague.id);
  const userTeam = lowestTeams[Math.floor(Math.random() * lowestTeams.length)];
  const teamsWithUser = teams.map((team) => ({ ...team, isUserControlled: team.id === userTeam.id }));
  const players = createInitialPlayers(teamsWithUser);
  const teamsWithPlayers = teamsWithUser.map((team) => ({
    ...team,
    players: players.filter((player) => player.teamId === team.id).map((player) => player.id),
  }));
  const { leaguesWithSchedule, matches } = createSchedules(leagues, teamsWithPlayers);
  const playersWithLineups = selectLineupForAllTeams(teamsWithPlayers, players);
  const transferMarket = createTransferMarket(playersWithLineups, userTeam.id, '1', 1);
  const seasonHomeIncomeByLeague = calculateSeasonHomeIncomeByLeague(teamsWithPlayers, playersWithLineups);

  return {
    leagueSystem: {
      id: 'system-1',
      season: '1',
      leagueIds: leaguesWithSchedule.map((league) => league.id),
      promotionSlots: 3,
      relegationSlots: 3,
      lowestLevel: 2,
    },
    leagues: leaguesWithSchedule,
    teams: teamsWithPlayers,
    players: playersWithLineups,
    matches,
    userTeamId: userTeam.id,
    transferMarket,
    financeLogs: [],
    seasonHomeIncomeByLeague,
    lastFinanceSummary: { ticketIncome: 0, wageExpense: 0, net: 0 },
    lastGrowthChanges: [],
    seasonGrowthChanges: [],
  };
}

export function createLeagues(season: string): League[] {
  return LEAGUE_DEFINITIONS.map((league) => ({
    ...league,
    season,
    teamIds: [],
    matches: [],
    currentRound: 1,
    totalRounds: 38,
  }));
}

export function createSchedules(leagues: League[], teams: Team[]): { leaguesWithSchedule: League[]; matches: Match[] } {
  const matches = leagues.flatMap((league) => createDoubleRoundRobinSchedule(league.id, teams.filter((team) => team.leagueId === league.id)));
  const leaguesWithSchedule = leagues.map((league) => ({
    ...league,
    teamIds: teams.filter((team) => team.leagueId === league.id).map((team) => team.id),
    matches: matches.filter((match) => match.leagueId === league.id).map((match) => match.id),
    currentRound: 1,
    totalRounds: 38,
  }));

  return { leaguesWithSchedule, matches };
}

function createTeams(leagues: League[]): Team[] {
  const namesByLeague = [topTeamNames, lowerTeamNames];

  return leagues.flatMap((league, leagueIndex) =>
    namesByLeague[leagueIndex].map(([name, shortName, primaryColor], teamIndex) => ({
      id: `team-${league.level}-${teamIndex + 1}`,
      name,
      shortName,
      leagueId: league.id,
      players: [],
      balance: league.level === 1 ? 5000000 + teamIndex * 120000 : 1800000 + teamIndex * 70000,
      stadiumCapacity: league.level === 1 ? 22000 + teamIndex * 450 : 12000 + teamIndex * 320,
      ticketPrice: league.level === 1 ? 38 : 24,
      fanBase: Math.min(100, league.level === 1 ? 58 + teamIndex : 34 + teamIndex),
      isUserControlled: false,
      primaryColor,
    })),
  );
}

function createInitialPlayers(teams: Team[]): Player[] {
  const candidatesByPosition = createPlayerPoolByPosition();
  const topTeams = teams.filter((team) => team.leagueId === 'league-1');
  const lowerTeams = teams.filter((team) => team.leagueId === 'league-2');
  const players = assignPlayersToLeagues(candidatesByPosition, topTeams, lowerTeams, 0.12);
  const topAverage = averageOverall(players, topTeams);
  const lowerAverage = averageOverall(players, lowerTeams);

  if (topAverage - lowerAverage < 8) {
    return assignPlayersToLeagues(candidatesByPosition, topTeams, lowerTeams, 0);
  }

  return players;
}

function createPlayerPoolByPosition(): Record<Position, PlayerCandidate[]> {
  const positions: Position[] = ['GK', 'DF', 'MF', 'FW'];
  const positionSlots = positions.flatMap((position) => Array.from({ length: POSITION_COUNTS[position] * 40 }, () => position));
  const shuffledPositions = shuffle(positionSlots);
  const candidates = ABILITY_BANDS.flatMap((band) =>
    Array.from({ length: band.count }, () => {
      const position = shuffledPositions.pop();
      if (!position) {
        throw new Error('Not enough position slots for player pool.');
      }
      return createPlayerCandidate(position, band.min, band.max);
    }),
  );

  return {
    GK: candidates.filter((player) => player.position === 'GK').sort(byOverallDesc),
    DF: candidates.filter((player) => player.position === 'DF').sort(byOverallDesc),
    MF: candidates.filter((player) => player.position === 'MF').sort(byOverallDesc),
    FW: candidates.filter((player) => player.position === 'FW').sort(byOverallDesc),
  };
}

function createPlayerCandidate(position: Position, minOverall: number, maxOverall: number): PlayerCandidate {
  const overall = clamp(randomInt(minOverall, maxOverall) + randomInt(-4, 4), 1, 200);
  const age = createAge();
  const potential = clamp(overall + createPotentialGap(age), overall, 200);
  const marketValue = calculateMarketValue({ age, overall, potential });
  const nameIndex = randomInt(0, surnames.length * givenNames.length - 1);

  return {
    name: `${surnames[nameIndex % surnames.length]}${givenNames[Math.floor(nameIndex / surnames.length) % givenNames.length]}`,
    age,
    position,
    overall,
    potential,
    marketValue,
    weeklyWage: calculateWeeklyWage({ overall }),
    contractYears: randomInt(1, 5),
    isListed: Math.random() < 0.25,
  };
}

function assignPlayersToLeagues(
  candidatesByPosition: Record<Position, PlayerCandidate[]>,
  topTeams: Team[],
  lowerTeams: Team[],
  swapRatio: number,
): Player[] {
  const leaguePools = splitLeaguePools(candidatesByPosition, swapRatio);

  return [
    ...assignPlayersToTeams(leaguePools.top, topTeams),
    ...assignPlayersToTeams(leaguePools.lower, lowerTeams),
  ];
}

function splitLeaguePools(
  candidatesByPosition: Record<Position, PlayerCandidate[]>,
  swapRatio: number,
): { top: Record<Position, PlayerCandidate[]>; lower: Record<Position, PlayerCandidate[]> } {
  const top = clonePositionPools(candidatesByPosition, 0, 20);
  const lower = clonePositionPools(candidatesByPosition, 20, 40);

  (Object.keys(POSITION_COUNTS) as Position[]).forEach((position) => {
    const swapCount = Math.floor(POSITION_COUNTS[position] * 20 * swapRatio);

    for (let index = 0; index < swapCount; index += 1) {
      const topIndex = top[position].length - 1 - index;
      const lowerIndex = index;
      const topPlayer = top[position][topIndex];
      const lowerPlayer = lower[position][lowerIndex];
      top[position][topIndex] = lowerPlayer;
      lower[position][lowerIndex] = topPlayer;
    }

    top[position].sort(byOverallDesc);
    lower[position].sort(byOverallDesc);
  });

  return { top, lower };
}

function clonePositionPools(candidatesByPosition: Record<Position, PlayerCandidate[]>, teamStart: number, teamEnd: number): Record<Position, PlayerCandidate[]> {
  return {
    GK: candidatesByPosition.GK.slice(teamStart * POSITION_COUNTS.GK, teamEnd * POSITION_COUNTS.GK),
    DF: candidatesByPosition.DF.slice(teamStart * POSITION_COUNTS.DF, teamEnd * POSITION_COUNTS.DF),
    MF: candidatesByPosition.MF.slice(teamStart * POSITION_COUNTS.MF, teamEnd * POSITION_COUNTS.MF),
    FW: candidatesByPosition.FW.slice(teamStart * POSITION_COUNTS.FW, teamEnd * POSITION_COUNTS.FW),
  };
}

function assignPlayersToTeams(pools: Record<Position, PlayerCandidate[]>, teams: Team[]): Player[] {
  const orderedTeams = teams.slice().sort((a, b) => teamStrengthRank(a) - teamStrengthRank(b));
  const players: Player[] = [];

  orderedTeams.forEach((team, teamIndex) => {
    let playerNumber = 1;

    (Object.keys(POSITION_COUNTS) as Position[]).forEach((position) => {
      const count = POSITION_COUNTS[position];
      const start = teamIndex * count;
      const teamCandidates = pools[position].slice(start, start + count);

      teamCandidates.forEach((candidate) => {
        players.push({
          id: `${team.id}-player-${playerNumber}`,
          ...candidate,
          teamId: team.id,
          isStarter: false,
        });
        playerNumber += 1;
      });
    });
  });

  return players;
}

function createAge(): number {
  const roll = Math.random();

  if (roll < 0.15) {
    return randomInt(18, 20);
  }

  if (roll < 0.45) {
    return randomInt(21, 24);
  }

  if (roll < 0.8) {
    return randomInt(25, 29);
  }

  if (roll < 0.95) {
    return randomInt(30, 32);
  }

  return randomInt(33, 36);
}

function createPotentialGap(age: number): number {
  if (age <= 20) {
    return randomInt(12, 32);
  }

  if (age <= 24) {
    return randomInt(6, 22);
  }

  if (age <= 29) {
    return randomInt(0, 12);
  }

  if (age <= 32) {
    return randomInt(0, 6);
  }

  return randomInt(0, 3);
}

function averageOverall(players: Player[], teams: Team[]): number {
  const teamIds = new Set(teams.map((team) => team.id));
  const leaguePlayers = players.filter((player) => teamIds.has(player.teamId));

  return leaguePlayers.reduce((total, player) => total + player.overall, 0) / leaguePlayers.length;
}

function teamStrengthRank(team: Team): number {
  const parts = team.id.split('-');
  return Number(parts[parts.length - 1] ?? 0);
}

function byOverallDesc(a: PlayerCandidate, b: PlayerCandidate): number {
  return b.overall - a.overall || b.potential - a.potential;
}

function shuffle<T>(items: T[]): T[] {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
