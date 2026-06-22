import { createLeagues, createSchedules } from '../data/seed';
import type { GameState, Team } from '../models/types';
import { agePlayersForNewSeason } from './growth';
import { selectLineupForAllTeams } from './lineup';
import { calculateStandings } from './standings';

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
  const nextTeams = game.teams.map((team) => {
    if (movement.promoted.some((promoted) => promoted.id === team.id)) {
      return { ...team, leagueId: topLeague.id };
    }

    if (movement.relegated.some((relegated) => relegated.id === team.id)) {
      return { ...team, leagueId: lowerLeague.id };
    }

    return team;
  });
  const nextLeagues = createLeagues(nextSeason);
  const { leaguesWithSchedule, matches } = createSchedules(nextLeagues, nextTeams);

  return {
      ...game,
      leagueSystem: {
        ...game.leagueSystem,
        season: nextSeason,
        leagueIds: leaguesWithSchedule.map((league) => league.id),
      },
      leagues: leaguesWithSchedule,
      teams: nextTeams,
      players: selectLineupForAllTeams(nextTeams, agePlayersForNewSeason(game.players.filter((player) => !player.isGeneratedFillIn))),
      matches,
      lastGrowthChanges: [],
      seasonGrowthChanges: [],
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
