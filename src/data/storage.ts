import type { GameState } from '../models/types';
import { createNewGame } from './seed';
import { createNextSeasonGame } from '../game/season';

const STORAGE_KEY = 'minifm-save-v4';
const SEASON_KEY = 'minifm-season';

export function loadGame(): GameState {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createNewGame();
  }

  try {
    const game = JSON.parse(saved) as GameState;
    return isCompatibleSave(game) ? game : createNewGame();
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return createNewGame();
  }
}

export function saveGame(state: GameState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.localStorage.setItem(SEASON_KEY, state.leagueSystem.season);
}

export function startNewSeason(state: GameState): GameState {
  const nextGame = createNextSeasonGame(state);
  saveGame(nextGame);
  return nextGame;
}

export function resetGame(): GameState {
  window.localStorage.removeItem(SEASON_KEY);

  const freshGame = createNewGame();

  saveGame(freshGame);
  return freshGame;
}

function isCompatibleSave(state: GameState): boolean {
  return (
    Array.isArray(state.leagues) &&
    state.leagues.length === 2 &&
    Boolean(state.leagueSystem) &&
    Boolean(state.userTeamId) &&
    Boolean(state.transferMarket) &&
    state.seasonHomeIncomeByLeague &&
    Array.isArray(state.financeLogs) &&
    Array.isArray(state.players) &&
    Array.isArray(state.teams) &&
    state.players.every((player) =>
      typeof player.potential === 'number' &&
      player.overall <= player.potential &&
      typeof player.marketValue === 'number' &&
      typeof player.weeklyWage === 'number' &&
      typeof player.contractYears === 'number',
    ) &&
    state.teams.every((team) =>
      typeof team.balance === 'number' &&
      typeof team.stadiumCapacity === 'number' &&
      typeof team.ticketPrice === 'number' &&
      typeof team.fanBase === 'number',
    )
  );
}
