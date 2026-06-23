# NPC 球员挂牌算法

## 概述

转会市场中的 NPC 球员挂牌算法决定了哪些 NPC 球队的球员会被放入转会市场供玩家购买。算法核心逻辑位于 `src/game/transfer.ts` 的 `selectListedPlayers` 函数。

## 算法流程

### 1. 过滤阶段

球员必须同时满足以下所有条件才能进入候选池：

| 条件 | 说明 | 代码位置 |
|------|------|----------|
| 非用户球队 | `player.teamId !== userTeamId` | 第 154 行 |
| 非生成填充球员 | `!player.isGeneratedFillIn` | 第 154 行 |
| 非首发球员 | `!player.isStarter` | 第 154 行 |

**设计意图**：
- 用户球队的球员不在转会市场中出售（用户可在阵容界面手动卖出）
- 生成填充球员（`isGeneratedFillIn`）是为了满足球队最低人数要求而自动生成的临时球员，不应被交易
- 首发球员是球队的核心成员，NPC 球队不会轻易出售

### 2. 排序阶段

候选球员按 `marketScore` 降序排列：

```typescript
function marketScore(player: Player): number {
  return player.overall * 2 + player.potential + (player.id.charCodeAt(player.id.length - 1) % 17);
}
```

**评分公式解析**：

| 组成部分 | 权重 | 说明 |
|----------|------|------|
| `overall * 2` | 2 | 能力值，权重最高 |
| `potential` | 1 | 潜力值 |
| `(player.id.charCodeAt(player.id.length - 1) % 17)` | 0-16 | 随机因子，基于球员 ID 的最后一个字符 |

**设计意图**：
- 能力值是最重要的因素，权重为潜力值的两倍
- 潜力值代表球员未来的成长空间
- 随机因子（0-16）增加了排序的随机性，避免每次生成完全相同的市场列表

### 3. 截断阶段

取排序后的前 `MARKET_SIZE`（24）名球员作为最终挂牌列表：

```typescript
const MARKET_SIZE = 24;
```

**设计意图**：
- 限制转会市场规模，保持界面简洁
- 确保市场中始终是评分最高的球员

## 算法调用时机

转会市场在以下时机刷新：

1. **每轮结束后**：`handleNextRound` 函数调用 `createTransferMarket` 更新转会市场
2. **新赛季开始时**：`startNewSeason` 函数重新生成转会市场

## 相关常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `MARKET_SIZE` | 24 | 转会市场最大容量 |
| `MAX_REGULAR_PLAYERS_PER_TEAM` | 25 | 球队最大常规球员数 |
| `MIN_REGULAR_PLAYERS_PER_TEAM` | 11 | 球队最小常规球员数 |

## 流程图

```
所有球员
    ↓
过滤：非用户球队 && 非填充球员 && 非首发
    ↓
排序：按 marketScore 降序
    ↓
截断：取前 24 名
    ↓
生成挂牌列表
```

## 代码引用

- 核心算法：`selectListedPlayers` - [transfer.ts:152-158](file:///d:/Codes/miniFM/src/game/transfer.ts#L152-L158)
- 评分函数：`marketScore` - [transfer.ts:160-162](file:///d:/Codes/miniFM/src/game/transfer.ts#L160-L162)
- 市场创建：`createTransferMarket` - [transfer.ts:7-13](file:///d:/Codes/miniFM/src/game/transfer.ts#L7-L13)