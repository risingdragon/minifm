# 球员成长系统 - 实现计划

## [ ] Task 1: 更新 Player 类型定义，增加潜力值字段
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 在 Player 接口中添加 potential 字段（范围 0-200）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - programmatic TR-1.1: Player 类型包含 potential 字段，类型为 number
  - human-judgement TR-1.2: 类型定义符合 TypeScript 最佳实践

## [ ] Task 2: 修改球员生成逻辑，初始化潜力值
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 在 createTeamPlayers 函数中为每个新球员生成潜力值
  - 潜力值应与 overall 相关联（通常略高于当前能力）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - programmatic TR-2.1: 新生成的球员包含有效的 potential 值（0-200）
  - programmatic TR-2.2: 潜力值通常不低于当前 overall

## [ ] Task 3: 实现球员成长计算函数
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 创建 calculatePlayerGrowth 函数
  - 23岁以下：成长阶段，overall 向 potential 靠近，成长速度快
  - 23-29岁：黄金年龄，成长速度较慢
  - 30岁以上：衰退阶段，overall 下降
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - programmatic TR-3.1: 年轻球员（<23岁）overall 增加
  - programmatic TR-3.2: 黄金年龄球员（23-29岁）overall 增加但幅度较小
  - programmatic TR-3.3: 高龄球员（≥30岁）overall 下降

## [ ] Task 4: 每场比赛结束后应用球员成长
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 在 simulateRound 函数中调用成长计算
  - 更新参赛球员的 overall
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - programmatic TR-4.1: 比赛结束后球员按成长规则更新

## [ ] Task 5: 赛季结束时更新球员年龄
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 在 createNextSeasonGame 函数中更新所有球员年龄
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - programmatic TR-5.1: 赛季结束后球员年龄增加1岁