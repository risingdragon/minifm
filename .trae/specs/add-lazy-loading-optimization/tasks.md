# Tasks

- [x] Task 1: 分析当前数据生成逻辑
  - [x] SubTask 1.1: 审查现有的DataGenerator、Player、Team、League类
  - [x] SubTask 1.2: 确定需要修改的数据模型
  - [x] SubTask 1.3: 设计懒加载状态管理方案

- [x] Task 2: 修改数据模型支持懒加载状态
  - [x] SubTask 2.1: 为League类添加加载状态属性
  - [x] SubTask 2.2: 为Team类添加懒加载状态属性
  - [x] SubTask 2.3: 实现懒加载状态的序列化/反序列化

- [x] Task 3: 实现懒加载数据生成逻辑
  - [x] SubTask 3.1: 修改generateAllLeagues为懒加载模式
  - [x] SubTask 3.2: 实现按需生成球员的逻辑（generatePlayersIfNeeded）
  - [x] SubTask 3.3: 实现按需生成赛程的逻辑（generateScheduleIfNeeded）

- [x] Task 4: 修改球队生成逻辑
  - [x] SubTask 4.1: 实现懒加载球队生成（只含基本信息）
  - [x] SubTask 4.2: 实现完整球队生成（包含球员）
  - [x] SubTask 4.3: 添加球队加载状态检查

- [x] Task 5: 修改联赛生成逻辑
  - [x] SubTask 5.1: 实现懒加载联赛生成（只含球队基本信息）
  - [x] SubTask 5.2: 实现完整联赛生成（包含球队、球员、赛程）
  - [x] SubTask 5.3: 添加联赛加载状态检查

- [x] Task 6: 实现升级时的联赛数据加载
  - [x] SubTask 6.1: 修改升降级逻辑，在升级时触发新联赛数据生成
  - [x] SubTask 6.2: 实现原联赛的懒加载降级
  - [x] SubTask 6.3: 测试升级流程

- [x] Task 7: 优化比赛模拟引擎
  - [x] SubTask 7.1: 添加AI联赛简化模拟模式
  - [x] SubTask 7.2: 修改比赛模拟逻辑，根据联赛状态选择模拟方式
  - [x] SubTask 7.3: 确保玩家比赛仍然生成完整事件

- [x] Task 8: 测试和验证
  - [x] SubTask 8.1: 测试初始加载速度
  - [x] SubTask 8.2: 测试懒加载触发条件
  - [x] SubTask 8.3: 测试升级流程
  - [x] SubTask 8.4: 验证数据完整性

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3, 4, 5 依赖 Task 2
- Task 6 依赖 Task 4, 5
- Task 7 依赖 Task 3, 4, 5
- Task 8 依赖所有任务