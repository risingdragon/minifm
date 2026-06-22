import type { GameState, League, Match, Player, Position, Team } from '../models/types';
import { createDoubleRoundRobinSchedule } from '../game/schedule';
import { selectLineupForAllTeams } from '../game/lineup';
import { calculateMarketValue, calculateWeeklyWage } from '../game/finance';
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

export function createNewGame(): GameState {
  const leagues = createLeagues('1');
  const teams = createTeams(leagues);
  const lowestLeague = leagues.reduce((lowest, league) => (league.level > lowest.level ? league : lowest), leagues[0]);
  const lowestTeams = teams.filter((team) => team.leagueId === lowestLeague.id);
  const userTeam = lowestTeams[Math.floor(Math.random() * lowestTeams.length)];
  const teamsWithUser = teams.map((team) => ({ ...team, isUserControlled: team.id === userTeam.id }));
  const players = teamsWithUser.flatMap((team, index) => createTeamPlayers(team.id, index, team.leagueId));
  const teamsWithPlayers = teamsWithUser.map((team) => ({
    ...team,
    players: players.filter((player) => player.teamId === team.id).map((player) => player.id),
  }));
  const { leaguesWithSchedule, matches } = createSchedules(leagues, teamsWithPlayers);
  const playersWithLineups = selectLineupForAllTeams(teamsWithPlayers, players);
  const transferMarket = createTransferMarket(playersWithLineups, userTeam.id, '1', 1);

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

function createTeamPlayers(teamId: string, teamIndex: number, leagueId: string): Player[] {
  const positions: Position[] = ['GK', 'GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW'];
  const leagueBias = leagueId === 'league-1' ? 8 : 0;
  const teamBias = 6 - Math.abs((teamIndex % 20) - 5) * 0.35;

  return positions.map((position, index) => {
    const abilityBase = 56 + leagueBias + teamBias + (position === 'GK' ? 1 : 0);
    const swing = ((teamIndex * 11 + index * 7) % 18) - 6;
    const overall = Math.max(38, Math.min(96, Math.round(abilityBase + swing)));
    const age = 18 + ((teamIndex * 5 + index * 2) % 17);
    const potentialBase = overall + (age <= 20 ? 24 : age <= 24 ? 16 : age <= 29 ? 8 : 2);
    const potentialSwing = (teamIndex * 5 + index * 3) % 10;
    const potential = Math.max(overall, Math.min(200, potentialBase + potentialSwing));
    const marketValue = calculateMarketValue({ age, overall, potential });

    return {
      id: `${teamId}-player-${index + 1}`,
      name: `${surnames[(teamIndex + index) % surnames.length]}${givenNames[(teamIndex * 3 + index) % givenNames.length]}`,
      age,
      position,
      teamId,
      overall,
      potential,
      marketValue,
      weeklyWage: calculateWeeklyWage(marketValue),
      contractYears: 1 + ((teamIndex + index) % 5),
      isListed: (teamIndex * 3 + index) % 4 === 0,
      isStarter: false,
    };
  });
}
