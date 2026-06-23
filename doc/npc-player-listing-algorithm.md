# NPC 球员挂牌算法

## 概述

转会市场中的 NPC 球员挂牌算法决定了哪些 NPC 球队的球员会被放入转会市场供玩家购买。算法核心逻辑位于 `src/game/transfer.ts` 的 `selectListedPlayers` 函数。

核心规则：

- 每个 NPC 球队最多挑选 1 名最不需要的球员挂牌
- 如果 NPC 球队只有 11 人或更少，则不挂牌球员
- 玩家球队不参与 NPC 挂牌
- 转会市场最多 39 人

## 算法流程

### 1. 按球队分组

先遍历所有球员，将非玩家球队的球员按 `teamId` 分组。

```typescript
const playersByTeam = players.reduce<Record<string, Player[]>>((groups, player) => {
  if (player.teamId === userTeamId) {
    return groups;
  }

  groups[player.teamId] = [...(groups[player.teamId] ?? []), player];
  return groups;
}, {});
```

设计意图：

- 保证每个 NPC 球队都有独立挂牌机会
- 避免强队或球员多的球队占满整个市场
- 排除玩家球队，玩家球队球员由阵容界面的卖出功能处理

### 2. 跳过人数不足球队

只有球员数大于 `MIN_REGULAR_PLAYERS_PER_TEAM` 的 NPC 球队才允许挂牌。

```typescript
.filter((teamPlayers) => teamPlayers.length > MIN_REGULAR_PLAYERS_PER_TEAM)
```

设计意图：

- `MIN_REGULAR_PLAYERS_PER_TEAM = 11`
- NPC 球队只有 11 人时必须保留完整首发阵容
- 球队人数不足时不应继续削弱阵容

### 3. 选择最不需要的球员

每个可挂牌 NPC 球队内部按 `compareLeastNeeded` 排序，取第 1 名作为挂牌球员。

```typescript
.map((teamPlayers) => teamPlayers.slice().sort(compareLeastNeeded)[0])
```

排序规则：

1. 非首发球员优先挂牌
2. 同为首发或同为非首发时，按 `leastNeededScore` 从低到高排序
3. 分数相同时按姓名排序，保证结果稳定

```typescript
function compareLeastNeeded(a: Player, b: Player): number {
  if (a.isStarter !== b.isStarter) {
    return a.isStarter ? 1 : -1;
  }

  return leastNeededScore(a) - leastNeededScore(b) || a.name.localeCompare(b.name, 'zh-CN');
}
```

### 4. 最不需要评分

```typescript
function leastNeededScore(player: Player): number {
  return player.overall * 3 + player.potential + player.marketValue / 10000;
}
```

评分含义：

| 组成部分 | 权重 | 说明 |
| --- | --- | --- |
| `overall * 3` | 高 | 当前能力越低，越容易被挂牌 |
| `potential` | 中 | 潜力越低，越容易被挂牌 |
| `marketValue / 10000` | 低 | 身价作为轻微参考 |

设计意图：

- NPC 优先出售替补中的低能力、低潜力球员
- 高潜力年轻球员即使当前能力低，也不一定最先被卖
- 首发球员只有在球队没有替补选择时才可能被挂牌

### 5. 市场容量限制

最终列表最多保留 `MARKET_SIZE` 名球员。

```typescript
const MARKET_SIZE = 39;
```

在两级联赛共 40 支球队、其中 1 支为玩家球队的情况下，最多有 39 支 NPC 球队，因此市场最多 39 人。

## 算法调用时机

转会市场在以下时机刷新：

1. 每轮结束后：`handleNextRound` 调用 `createTransferMarket` 更新转会市场
2. 新赛季开始时：`startNewSeason` 重新生成转会市场
3. 新游戏初始化时：`createNewGame` 创建初始转会市场

## 相关常量

| 常量 | 值 | 说明 |
| --- | --- | --- |
| `MARKET_SIZE` | 39 | 转会市场最大容量 |
| `MAX_REGULAR_PLAYERS_PER_TEAM` | 25 | 球队最大常规球员数 |
| `MIN_REGULAR_PLAYERS_PER_TEAM` | 11 | 球队最小常规球员数 |

## 流程图

```text
所有球员
    ↓
排除玩家球队球员
    ↓
按 NPC 球队分组
    ↓
跳过人数 <= 11 的球队
    ↓
每队按最不需要程度排序
    ↓
每队取 1 名球员
    ↓
截断到最多 39 人
    ↓
生成挂牌列表
```

## 代码引用

- 核心算法：`selectListedPlayers` - `src/game/transfer.ts`
- 排序函数：`compareLeastNeeded` - `src/game/transfer.ts`
- 评分函数：`leastNeededScore` - `src/game/transfer.ts`
- 市场创建：`createTransferMarket` - `src/game/transfer.ts`
