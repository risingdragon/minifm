import { createLeagues, createSchedules, createYouthPlayer, RECOMMENDED_POSITION_COUNTS, REGULAR_PLAYERS_PER_TEAM, RETIREMENT_AGE } from '../data/seed';
import { calculateSeasonHomeIncomeByLeague } from './finance';
import type { GameState, Player, Position, Team } from '../models/types';
import { agePlayersForNewSeason } from './growth';
import { selectLineupForAllTeams } from './lineup';
import { calculateStandings } from './standings';
import { createTransferMarket } from './transfer';

export interface SeasonMovement {
  promoted: Team[];
  relegated: Team[];
}

export function getSeasonMovement(game: GameState): SeasonMovement {
  const topLeague = getLeagueByLevel(game, 1);
  const lowerLeague = getLeagueByLevel(game, game.leagueSystem.lowestLevel);
  const promotionSlots = game.leagueSystem.promotionSlots;
  const relegationSlots = game.leagueSystem.relegationSlots;
  const topStandings = calculateStandings(getLeagueTeams(game, topLeague.id), getLeagueMatches(game, topLeague.id));
  const lowerStandings = calculateStandings(getLeagueTeams(game, lowerLeague.id), getLeagueMatches(game, lowerLeague.id));
  const promoted = lowerStandings.slice(0, promotionSlots).map((standing) => findTeam(game.teams, standing.teamId));
  const relegated = topStandings.slice(-relegationSlots).map((standing) => findTeam(game.teams, standing.teamId));

  return { promoted, relegated };
}

export function createNextSeasonGame(game: GameState): GameState {
  const movement = getSeasonMovement(game);
  const topLeague = getLeagueByLevel(game, 1);
  const lowerLeague = getLeagueByLevel(game, game.leagueSystem.lowestLevel);
  const nextSeason = String(parseInt(game.leagueSystem.season, 10) + 1);
  const promotedIds = new Set(movement.promoted.map((team) => team.id));
  const relegatedIds = new Set(movement.relegated.map((team) => team.id));
  const movedTeams = game.teams.map((team) => {
    if (promotedIds.has(team.id)) {
      return { ...team, leagueId: topLeague.id };
    }

    if (relegatedIds.has(team.id)) {
      return { ...team, leagueId: lowerLeague.id };
    }

    return team;
  });
  const agedPlayers = agePlayersForNewSeason(game.players);
  const retiredPlayerIds = agedPlayers.filter((player) => player.age >= RETIREMENT_AGE).map((player) => player.id);
  const activePlayers = agedPlayers.filter((player) => player.age < RETIREMENT_AGE);
  const teamsAfterRetirement = syncTeamRosters(movedTeams, activePlayers);
  const youthResult = fillYouthPlayers(teamsAfterRetirement, activePlayers, nextSeason);
  const nextLeagues = createLeagues(nextSeason);
  const { leaguesWithSchedule, matches } = createSchedules(nextLeagues, youthResult.teams);
  const nextPlayers = selectLineupForAllTeams(youthResult.teams, youthResult.players);
  const seasonHomeIncomeByLeague = calculateSeasonHomeIncomeByLeague(youthResult.teams, nextPlayers);

  return {
      ...game,
      leagueSystem: {
        ...game.leagueSystem,
        season: nextSeason,
        leagueIds: leaguesWithSchedule.map((league) => league.id),
      },
      leagues: leaguesWithSchedule,
      teams: youthResult.teams,
      players: nextPlayers,
      matches,
      transferMarket: createTransferMarket(nextPlayers, game.userTeamId, nextSeason, 1),
      seasonHomeIncomeByLeague,
      lastFinanceSummary: { revenueIncome: 0, wageExpense: 0, net: 0 },
      lastGrowthChanges: [],
      seasonGrowthChanges: [],
      lastRetiredPlayerIds: retiredPlayerIds,
      lastYouthPlayerIds: youthResult.youthPlayerIds,
    };
}

function syncTeamRosters(teams: Team[], players: Player[]): Team[] {
  const activePlayerIds = new Set(players.map((player) => player.id));
  return teams.map((team) => ({
    ...team,
    players: team.players.filter((playerId) => activePlayerIds.has(playerId)),
  }));
}

function fillYouthPlayers(teams: Team[], players: Player[], season: string): { teams: Team[]; players: Player[]; youthPlayerIds: string[] } {
  const nextPlayers = [...players];
  const youthPlayerIds: string[] = [];
  const nextTeams = teams.map((team) => {
    const teamPlayers = nextPlayers.filter((player) => player.teamId === team.id);
    const youthPlayers: Player[] = [];

    while (teamPlayers.length + youthPlayers.length < REGULAR_PLAYERS_PER_TEAM) {
      const position = chooseYouthPosition([...teamPlayers, ...youthPlayers]);
      const youthPlayer = createYouthPlayer(team.id, position, youthPlayers.length + 1, season);
      youthPlayers.push(youthPlayer);
      nextPlayers.push(youthPlayer);
      youthPlayerIds.push(youthPlayer.id);
    }

    return {
      ...team,
      players: [...team.players, ...youthPlayers.map((player) => player.id)],
    };
  });

  return { teams: nextTeams, players: nextPlayers, youthPlayerIds };
}

function chooseYouthPosition(players: Player[]): Position {
  const counts = countPositions(players);
  const positions = Object.keys(RECOMMENDED_POSITION_COUNTS) as Position[];
  const neededPosition = positions.find((position) => counts[position] < RECOMMENDED_POSITION_COUNTS[position]);

  if (neededPosition) {
    return neededPosition;
  }

  return positions.slice().sort((a, b) => counts[a] - counts[b])[0];
}

function countPositions(players: Player[]): Record<Position, number> {
  return {
    GK: players.filter((player) => player.position === 'GK').length,
    DF: players.filter((player) => player.position === 'DF').length,
    MF: players.filter((player) => player.position === 'MF').length,
    FW: players.filter((player) => player.position === 'FW').length,
  };
}

function getLeagueByLevel(game: GameState, level: number) {
  const league = game.leagues.find((item) => item.level === level);
  if (!league) {
    throw new Error(`Missing league level ${level}`);
  }
  return league;
}

function getLeagueTeams(game: GameState, leagueId: string): Team[] {
  return game.teams.filter((team) => team.leagueId === leagueId);
}

function getLeagueMatches(game: GameState, leagueId: string) {
  return game.matches.filter((match) => match.leagueId === leagueId);
}

function findTeam(teams: Team[], id: string): Team {
  const team = teams.find((item) => item.id === id);
  if (!team) {
    throw new Error(`Missing team ${id}`);
  }
  return team;
}
