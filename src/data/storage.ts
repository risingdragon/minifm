import type { GameState } from '../models/types';
import { createNewGame } from './seed';

const STORAGE_KEY = 'minifm-save-v1';

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
}

export function resetGame(): GameState {
  const freshGame = createNewGame();
  saveGame(freshGame);
  return freshGame;
}
