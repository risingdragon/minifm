# 球员成长系统 - 产品需求文档

## Overview
- **Summary**: 为 miniFM 足球经理游戏增加球员成长系统，包括潜力值属性和基于年龄的成长/衰退机制。
- **Purpose**: 增加游戏的策略深度和长期可玩性，让玩家体验球员从年轻新秀成长为超级球星，再到职业生涯末期衰退的完整过程。
- **Target Users**: 足球经理游戏玩家，希望体验真实的球员发展过程。

## Goals
- 为每位球员增加潜力值属性，决定其成长上限
- 实现基于年龄的成长曲线：年轻球员成长，高龄球员衰退
- 每场比赛结束后自动更新球员属性

## Non-Goals (Out of Scope)
- 训练系统（后续迭代）
- 伤病影响（后续迭代）
- 转会市场（后续迭代）
- 球员性格/士气系统（后续迭代）

## Background & Context
当前游戏中球员只有固定的 overall 属性，没有成长机制。玩家无法体验培养年轻球员的乐趣，也看不到老球员的状态下滑。

## Functional Requirements
- **FR-1**: 球员属性增加 potential（潜力值）字段，范围 0-200
- **FR-2**: 年轻球员（23岁以下）在比赛结束后获得成长，overall 向潜力值靠近
- **FR-3**: 高龄球员（30岁以上）在比赛结束后出现衰退，overall 下降
- **FR-4**: 23-29岁的球员在比赛结束后也获得成长，但不如年轻球员涨得快

## Non-Functional Requirements
- **NFR-1**: 成长计算应平滑且符合现实逻辑
- **NFR-2**: 成长系统不应破坏现有游戏平衡

## Constraints
- **Technical**: TypeScript/React 技术栈
- **Dependencies**: 现有球员数据结构

## Assumptions
- 赛季结束时统一处理球员成长
- 潜力值在球员生成时随机分配
- 成长/衰退幅度受年龄和潜力值共同影响

## Acceptance Criteria

### AC-1: 球员属性增加潜力值
- **Given**: 游戏中有球员数据
- **When**: 创建或查看球员信息
- **Then**: 球员包含 potential 字段，范围 0-200
- **Verification**: programmatic

### AC-2: 年轻球员成长（23岁以下）
- **Given**: 球员年龄 < 23 岁，且 overall < potential
- **When**: 比赛结束
- **Then**: 球员 overall 数值增加，向潜力值靠近
- **Verification**: programmatic

### AC-3: 黄金年龄球员成长（23-29岁）
- **Given**: 球员年龄在 23-29 岁之间，且 overall < potential
- **When**: 比赛结束
- **Then**: 球员 overall 数值增加，但增幅小于23岁以下球员
- **Verification**: programmatic

### AC-4: 高龄球员衰退
- **Given**: 球员年龄 ≥ 30 岁
- **When**: 比赛结束
- **Then**: 球员 overall 数值下降
- **Verification**: programmatic

## Open Questions
- [ ] 是否需要限制单个赛季的最大成长幅度？
- [ ] 是否需要在UI中显示潜力值？