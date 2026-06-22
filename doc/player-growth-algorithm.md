# 球员成长与衰退算法

## 概述

球员能力变化在每场比赛模拟完成后结算；年龄在赛季结束并进入新赛季时统一增加。所有球员（无论是否出场）每场比赛后都有机会产生轻微能力变化。

## 核心概念

| 概念 | 说明 |
| --- | --- |
| `overall` | 球员当前综合能力值，范围 1-200 |
| `potential` | 球员能力硬上限，范围 1-200，创建后不会变动 |
| `growthRoom` | 成长空间，计算公式：`potential - overall` |

## 算法流程

每场比赛结束后，对所有非填充球员执行以下步骤：

```
1. 归一化球员数据（确保 overall <= potential）
2. 计算成长空间 growthRoom = max(0, potential - overall)
3. 根据年龄段和 growthRoom 计算能力变化量 delta
4. 计算新能力值：newOverall = clamp(overall + delta, 1, potential)
5. 记录变化（仅当 newOverall !== previousOverall）
```

## 年龄段规则

| 年龄 | 阶段 | 单场能力变化规则 |
| --- | --- | --- |
| 16-20 | 新秀期 | growthRoom > 0 时：50% +1，50%+0 |
| 21-25 | 成长期 | growthRoom > 0 时：20% +1，80% +0 |
| 26-30 | 巅峰期 | growthRoom > 0 时：10% +1，90% +0 |
| 31-35 | 后巅峰期 | 25% -1，75% +0 |
| 36+ | 衰退期 | 50% -1，50% +0 |

## 详细算法实现

### 能力变化量计算（getAbilityDelta）

```typescript
function getAbilityDelta(player: Player): number {
  const growthRoom = Math.max(0, player.potential - player.overall);

  if (player.age <= 20) {
    return growthRoom > 0
      ? weightedRandom([[1, 50], [0, 50]])
      : 0;
  }

  if (player.age <= 25) {
    return growthRoom > 0
      ? weightedRandom([[1, 20], [0, 80]])
      : 0;
  }

  if (player.age <= 30) {
    return growthRoom > 0
      ? weightedRandom([[1, 10], [0, 90]])
      : 0;
  }

  if (player.age <= 35) {
    return weightedRandom([[-1, 25], [0, 75]]);
  }

  return weightedRandom([[-1, 50], [0, 50]]);
}

function inferPotential(player: Player): number {
  const ageBonus = player.age <= 20 ? 22 : player.age <= 25 ? 14 : player.age <= 30 ? 7 : 0;
  return Math.min(200, player.overall + ageBonus);
}
```

### 权重随机函数（weightedRandom）

```typescript
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
```

## 关键规则

1. **填充球员跳过**：`isGeneratedFillIn = true` 的球员不参与成长结算
2. **潜力上限**：`overall` 在任何情况下都不能超过 `potential`
3. **能力下限**：`overall` 最低为 1
4. **满潜力处理**：当 `growthRoom = 0`（已达到潜力上限）时，新秀期、成长期、巅峰期球员保持不变（0）
5. **重复结算防护**：同一球员同一轮最多结算 1 次
6. **年龄增长时机**：赛季结束并开启新赛季时，所有常规球员 `age + 1`

## 赛季年龄增长

```typescript
export function agePlayersForNewSeason(players: Player[]): Player[] {
  return players.map((player) => {
    const normalized = normalizePlayer(player);
    if (normalized.isGeneratedFillIn) {
      return normalized;
    }
    return { ...normalized, age: normalized.age + 1 };
  });
}
```

## 调用时机

成长结算在每轮比赛模拟时调用，位于 [simulator.ts](../src/game/simulator.ts) 的 `simulateRound` 函数中：

```typescript
const growthResult = settleGrowthAfterMatch(updatedPlayers);
updatedPlayers = growthResult.players;
growthChanges.push(...growthResult.changes);
```

## 数据模型

成长变化记录类型定义：

```typescript
interface PlayerGrowthChange {
  playerId: string;
  previousOverall: number;
  nextOverall: number;
  delta: number;
}
```