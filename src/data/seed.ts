import type { GameState, Player, Position, Team } from '../models/types';
import { createDoubleRoundRobinSchedule } from '../game/schedule';
import { selectLineupForAllTeams } from '../game/lineup';

const teamNames = [
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

const surnames = ['林', '周', '陈', '吴', '郑', '赵', '孙', '冯', '许', '高', '梁', '宋', '唐', '韩', '曹'];
const givenNames = ['远', '鸣', '澈', '峻', '南', '航', '越', '川', '熙', '辰', '枫', '然', '烨', '衡', '皓'];

export function createNewGame(): GameState {
  const teams: Team[] = teamNames.map(([name, shortName, primaryColor], index) => ({
    id: `team-${index + 1}`,
    name,
    shortName,
    players: [],
    isUserControlled: index === 0,
    primaryColor,
  }));

  const players = teams.flatMap((team, index) => createTeamPlayers(team.id, index));
  const teamsWithPlayers = teams.map((team) => ({
    ...team,
    players: players.filter((player) => player.teamId === team.id).map((player) => player.id),
  }));

  const matches = createDoubleRoundRobinSchedule(teamsWithPlayers);
  const playersWithLineups = selectLineupForAllTeams(teamsWithPlayers, players);

  return {
    league: {
      id: 'league-1',
      name: 'miniFM 超级联赛',
      season: '1',
      teamIds: teamsWithPlayers.map((team) => team.id),
      matches: matches.map((match) => match.id),
      currentRound: 1,
      totalRounds: 38,
    },
    teams: teamsWithPlayers,
    players: playersWithLineups,
    matches,
  };
}

function createTeamPlayers(teamId: string, teamIndex: number): Player[] {
  const positions: Position[] = ['GK', 'GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW'];
  const teamBias = 6 - Math.abs(teamIndex - 5) * 0.35;

  return positions.map((position, index) => {
    const abilityBase = 62 + teamBias + (position === 'GK' ? 1 : 0);
    const swing = ((teamIndex * 11 + index * 7) % 18) - 6;
    const overall = Math.max(40, Math.min(95, Math.round(abilityBase + swing)));

    return {
      id: `${teamId}-player-${index + 1}`,
      name: `${surnames[(teamIndex + index) % surnames.length]}${givenNames[(teamIndex * 3 + index) % givenNames.length]}`,
      age: 18 + ((teamIndex * 5 + index * 2) % 17),
      position,
      teamId,
      overall,
      isStarter: false,
    };
  });
}
