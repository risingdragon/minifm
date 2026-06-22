import type { GameState } from '../models/types';
import { createNewGame } from './seed';

const STORAGE_KEY = 'minifm-save-v1';
const SEASON_KEY = 'minifm-season';

export function loadGame(): GameState {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createNewGame();
  }

  try {
    return JSON.parse(saved) as GameState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return createNewGame();
  }
}

export function saveGame(state: GameState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.localStorage.setItem(SEASON_KEY, state.league.season);
}

export function resetGame(): GameState {
  const currentSeason = window.localStorage.getItem(SEASON_KEY);
  const nextSeason = currentSeason ? String(parseInt(currentSeason, 10) + 1) : '1';

  const freshGame = createNewGame();
  freshGame.league.season = nextSeason;

  saveGame(freshGame);
  return freshGame;
}

export function restartGame(): GameState {
  window.localStorage.removeItem(SEASON_KEY);

  const freshGame = createNewGame();
  freshGame.league.season = '1';

  saveGame(freshGame);
  return freshGame;
}
