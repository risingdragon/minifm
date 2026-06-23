# 球员工资、身价及俱乐部收入算法

## 一、球员身价算法 (calculateMarketValue)

### 计算公式

```text
基础价值 = overall² × 100
潜力奖励 = MAX(0, potential - overall) × 5000
年龄调整系数 = 根据年龄区间确定
最终价值 = MAX(1000, ROUND((基础价值 + 潜力奖励) × 年龄调整系数))
```

### 年龄调整系数表

| 年龄区间 | 调整系数 |
| --- | --- |
| ≤ 21 岁 | 1.25 |
| 22-25 岁 | 1.15 |
| 26-29 岁 | 1.0 |
| 30-32 岁 | 0.75 |
| > 32 岁 | 0.45 |

### 算法说明

- 基础价值与球员能力值的平方成正比，能力值越高，身价增长越快
- 潜力奖励仅在潜力高于当前能力时生效
- 年龄调整体现市场规律：26-29 岁是球员黄金期，超过 32 岁后身价下降
- 最低身价为 1000，避免出现零身价或负身价

---

## 二、球员工资算法 (calculateWeeklyWage)

### 设计目标

周薪先于俱乐部收入计算。系统在每个赛季开始时根据当时所有球员能力计算周薪，再汇总每支球队工资总额，最后用各联赛最高工资队的工资总额推导本赛季固定主场收入。

### 计算公式

```text
能力档 = CEIL(CLAMP(overall, 1, 200) / 10)
周薪 = 能力档 × 1000
```

### 能力档示例

| 能力范围 | 周薪 |
| --- | --- |
| 1-10 | 1000 |
| 11-20 | 2000 |
| 21-30 | 3000 |
| 91-100 | 10000 |
| 191-200 | 20000 |

### 算法说明

- 能力 `1-10` 的最低档球员周薪为 `1000`
- 能力段越高，周薪越高
- 周薪只由当前能力决定，不直接由身价决定
- 球员成长或衰退后，周薪会随能力档变化重新计算

---

## 三、俱乐部收入算法

### 3.1 球队工资总额

每个赛季开始时，先计算每支球队所有球员的周薪总和。

```text
teamWeeklyWage = SUM(team.players.weeklyWage)
```

### 3.2 联赛主场收入基准

每个联赛在赛季开始时独立计算收入基准。该收入基准写入赛季状态后，在整个赛季内保持不变。

```text
leagueMaxWeeklyWage = MAX(该联赛所有球队 teamWeeklyWage)
leagueHomeIncome = ROUND(leagueMaxWeeklyWage × 2.5)
```

两级联赛会分别找出本联赛工资总额最高的球队：

- 一级联赛最高工资队决定一级联赛单场主场收入
- 二级联赛最高工资队决定二级联赛单场主场收入

### 3.3 单场主场收入

```text
homeMatchIncome = leagueHomeIncome
```

即：某支球队每个主场比赛获得的收入，等于赛季初锁定的所在联赛主场收入基准。

### 算法说明

- 收入先由工资结构反推，保证联赛收入水平能覆盖该联赛最高工资球队的支出
- `2.5` 倍系数表示主场比赛收入应明显高于单轮工资支出
- 不同级别联赛独立计算，因此低级别联赛不会直接套用高级别联赛收入
- 赛季中即使球员成长、衰退、转会或工资变化，本赛季主场收入也不重新计算
- `stadiumCapacity`、`ticketPrice`、`fanBase` 暂时不参与 MVP 主场收入计算，可作为后续扩展参数

### 3.4 赛季初始化流程

赛季开始时：

1. 根据球员能力档刷新或读取球员周薪
2. 汇总每支球队所有球员的周薪总额
3. 找出每个联赛工资总额最高的球队
4. 计算每个联赛的单场主场收入：`最高工资总额 × 2.5`
5. 将结果保存为 `seasonHomeIncomeByLeague`

### 3.5 财务结算流程 (settleMatchFinances)

每场比赛后：

1. 遍历本轮已完成比赛，为主场球队发放 `seasonHomeIncomeByLeague[leagueId]`
2. 遍历所有球队，扣除该队当前所有球员周薪总额
3. 更新球队余额并记录财务日志

#### 数据结构

**FinanceSummary（财务摘要）**：

- `ticketIncome`: 主场收入总额
- `wageExpense`: 工资支出总额
- `net`: 净收支

---

## 四、函数调用关系

```text
refreshPlayerFinance
├── calculateMarketValue (计算身价)
└── calculateWeeklyWage (按能力档计算周薪)

settleMatchFinances
└── seasonHomeIncomeByLeague (读取赛季初锁定的联赛主场收入)

createNewGame / createNextSeasonGame
├── calculateTeamWages (计算赛季初球队工资总额)
└── calculateLeagueHomeIncomes (计算并锁定联赛主场收入基准)
```

---

## 五、核心数据模型

### Player 接口字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `age` | number | 年龄 |
| `overall` | number | 当前能力 |
| `potential` | number | 潜力 |
| `marketValue` | number | 市场价值 |
| `weeklyWage` | number | 周薪 |

### Team 接口字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `leagueId` | string | 所属联赛 |
| `balance` | number | 账户余额 |
| `stadiumCapacity` | number | 球场容量，后续扩展用 |
| `ticketPrice` | number | 门票单价，后续扩展用 |
| `fanBase` | number | 球迷基数，后续扩展用 |
