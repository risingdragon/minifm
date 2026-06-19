# 球员能力值金字塔分布 - 实施计划（已分解的任务列表）

## [x] Task 1: 在 CONFIG 中定义各联赛能力范围常量
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 在 `js/core.js` 的 `CONFIG` 对象中新增 `LEAGUE_ABILITY_RANGES`
  - 使用 `{level: {min, max}}` 或数组结构存储 6 个级别的能力范围
  - 配置值依据 spec.md 中的设计表：L1=167-200, L2=134-166, L3=101-133, L4=68-100, L5=35-67, L6=1-34
- **接受标准关联**: AC-3, AC-6
- **测试要求**:
  - `programmatic` TR-1.1: 确认 `CONFIG.LEAGUE_ABILITY_RANGES` 中每个级别都有 `min` 和 `max`
  - `programmatic` TR-1.2: 所有范围合并后覆盖 [1, 200]，无空隙无重叠
  - `programmatic` TR-1.3: 每个级别 `min <= max`
- **Notes**: 此任务仅修改 `core.js`

## [x] Task 2: 修改 generatePlayer() 使用新能力范围
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 在 `js/data-storage.js` 的 `DataGenerator.generatePlayer(position, leagueLevel)` 中
  - 替换原来的 `minAbility = 50 + (6-leagueLevel)*10; maxAbility = 100 + (6-leagueLevel)*16`
  - 使用 `CONFIG.LEAGUE_ABILITY_RANGES[leagueLevel]` 获取能力范围
  - 使用 `Math.floor(Math.random() * (max - min + 1)) + min` 在区间内均匀采样
- **接受标准关联**: AC-1, AC-2, AC-3, AC-5
- **测试要求**:
  - `programmatic` TR-2.1: 生成 100 个 L1 球员，全部能力 ∈ [167, 200]
  - `programmatic` TR-2.2: 生成 100 个 L6 球员，全部能力 ∈ [1, 34]
  - `programmatic` TR-2.3: 生成 200 个 L3 球员，平均值接近 117（中点），误差 ±3
  - `programmatic` TR-2.4: 每级生成 500 名球员后，L1 球员平均能力 > L6 球员平均能力
- **Notes**: 此任务仅修改 `data-storage.js` 中 `generatePlayer`

## [x] Task 3: 全联赛金字塔分布验证
- **Priority**: P1
- **Depends On**: Task 2
- **Description**:
  - 运行一次完整的球员生成（6级×20队×25人=3000人），验证金字塔分布
  - 统计各联赛平均能力值
  - 验证高能力球员在总人数中占比小
- **接受标准关联**: AC-4
- **测试要求**:
  - `programmatic` TR-3.1: 全联赛 L1 平均能力 > L6 平均能力，且差值 ≥ 100
  - `programmatic` TR-3.2: 能力值 ≥ 167 的球员约占总人数 1/6（即 L1 专属）
  - `programmatic` TR-3.3: 各联赛平均能力随级别递减（L1 > L2 > L3 > L4 > L5 > L6）
- **Notes**: 此任务不修改代码，仅通过浏览器 Console 或测试脚本验证分布

## [x] Task 4: 代码可读性检查与清理
- **Priority**: P2
- **Depends On**: Task 2
- **Description**:
  - 确认 Player 构造函数中的 `ability || 50` 默认值在新系统下仍合理（降级为保险值）
  - 确认 `generatePotential()` 中 `Math.min(200, ...)` 上限仍然有效
  - 删除 `data-storage.js` 中已不再使用的旧能力范围计算注释或代码
- **接受标准关联**: AC-6
- **测试要求**:
  - `human-judgment` TR-4.1: 代码注释清晰说明金字塔设计
  - `human-judgment` TR-4.2: CONFIG 中的配置表一眼可读
- **Notes**: 保持