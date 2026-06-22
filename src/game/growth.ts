import type { Player, PlayerGrowthChange } from '../models/types';

export function normalizePlayer(player: Player): Player {
  const potential = clamp(player.potential ?? inferPotential(player), 1, 200);

  return {
    ...player,
    potential,
    overall: clamp(player.overall, 1, potential),
  };
}

export function settleGrowthAfterMatch(players: Player[]): {
  players: Player[];
  changes: PlayerGrowthChange[];
} {
  const changes: PlayerGrowthChange[] = [];
  const nextPlayers = players.map((player) => {
    const normalized = normalizePlayer(player);

    if (normalized.isGeneratedFillIn) {
      return normalized;
    }

    const previousOverall = normalized.overall;
    const delta = getAbilityDelta(normalized);
    const nextOverall = clamp(previousOverall + delta, 1, normalized.potential);

    if (nextOverall !== previousOverall) {
      changes.push({
        playerId: normalized.id,
        previousOverall,
        nextOverall,
        delta: nextOverall - previousOverall,
      });
    }

    return {
      ...normalized,
      overall: nextOverall,
    };
  });

  return { players: nextPlayers, changes };
}

export function agePlayersForNewSeason(players: Player[]): Player[] {
  return players.map((player) => {
    const normalized = normalizePlayer(player);

    if (normalized.isGeneratedFillIn) {
      return normalized;
    }

    return {
      ...normalized,
      age: normalized.age + 1,
    };
  });
}

function getAbilityDelta(player: Player): number {
  const growthRoom = Math.max(0, player.potential - player.overall);

  if (player.age <= 20) {
    return growthRoom > 0
      ? weightedRandom([
          [1, 85],
          [2, 15],
        ])
      : -1;
  }

  if (player.age <= 24) {
    return growthRoom > 0
      ? weightedRandom([
          [1, 92],
          [2, 8],
        ])
      : -1;
  }

  if (player.age <= 29) {
    return growthRoom > 0
      ? weightedRandom([
          [-1, 35],
          [1, 65],
        ])
      : -1;
  }

  if (player.age <= 32) {
    return weightedRandom([
      [-1, 85],
      [1, 15],
    ]);
  }

  return weightedRandom([
    [-2, 20],
    [-1, 80],
  ]);
}

function inferPotential(player: Player): number {
  const ageBonus = player.age <= 20 ? 22 : player.age <= 24 ? 14 : player.age <= 29 ? 7 : 0;
  return Math.min(200, player.overall + ageBonus);
}

function weightedRandom(entries: Array<[number, number]>): number {
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return value;
    }
  }

  return entries[entries.length - 1][0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
