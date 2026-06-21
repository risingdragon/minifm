/**
 * 极简足球经理 - 主入口文件
 * 负责初始化游戏和协调各模块
 */

// ========================================
// 游戏配置
// ========================================
const CONFIG = {
    STORAGE_KEY: 'miniFM_save',
    LEAGUE_LEVELS: 6,
    TEAMS_PER_LEAGUE: 20,
    MATCHES_PER_SEASON: 38,
    PLAYER_POSITIONS: ['GK', 'DF', 'MF', 'CF'],
    POSITION_NAMES: {
        'GK': '门将',
        'DF': '后卫',
        'MF': '中场',
        'CF': '前锋'
    },
    // 首发阵容配置 (4-4-2阵型)
    STARTING_LINEUP: {
        'GK': 1,
        'DF': 4,
        'MF': 4,
        'CF': 2
    },
    // 阵容最小人数
    SQUAD_MIN_PLAYERS: {
        'GK': 2,
        'DF': 5,
        'MF': 5,
        'CF': 3
    },
    // 阵容最大人数
    SQUAD_MAX_SIZE: 25,
    // 自动保存间隔（毫秒）
    AUTO_SAVE_INTERVAL: 30000,
    // 各级联赛球员能力值范围（滑动区间：每级 50 个取值，相邻联赛有重叠）
    // 联赛内部按金字塔分布：能力越高，球员人数越少
    LEAGUE_ABILITY_RANGES: {
        "1": { min: 151, max: 200 },
        "2": { min: 121, max: 170 },
        "3": { min: 91, max: 140 },
        "4": { min: 61, max: 110 },
        "5": { min: 31, max: 80 },
        "6": { min: 1, max: 50 }
    },
    // 各级联赛球员潜力上限
    LEAGUE_POTENTIAL_CAP: {
        "1": 200,
        "2": 180,
        "3": 150,
        "4": 120,
        "5": 90,
        "6": 60
    },
    ECONOMY: {
        MATCH_INCOME: {
            1: { home: 640, away: 320 },
            2: { home: 320, away: 160 },
            3: { home: 160, away: 80 },
            4: { home: 80, away: 40 },
            5: { home: 40, away: 20 },
            6: { home: 20, away: 10 }
        },
        RANK_BONUS_BASE: [
            { maxRank: 1, amount: 1000 },
            { maxRank: 2, amount: 800 },
            { maxRank: 3, amount: 600 },
            { maxRank: 4, amount: 500 },
            { maxRank: 5, amount: 400 },
            { maxRank: 10, amount: 200 },
            { maxRank: 20, amount: 100 }
        ],
        LEAGUE_BONUS_MULTIPLIER: {
            1: 8,
            2: 4,
            3: 2,
            4: 1,
            5: 0.5,
            6: 0.25
        },
        INITIAL_CASH: {
            1: 10000,
            2: 6000,
            3: 3000,
            4: 1500,
            5: 700,
            6: 300
        },
        AI_STYLES: [
            { key: 'conservative', name: '保守型', weight: 35, salaryLimit: 0.50 },
            { key: 'balanced', name: '平衡型', weight: 40, salaryLimit: 0.65 },
            { key: 'promotion', name: '冲级型', weight: 20, salaryLimit: 0.85 },
            { key: 'rich', name: '土豪型', weight: 5, salaryLimit: 1.20 }
        ]
    }
};

// ========================================
// 球员数据模型
// ========================================
class Player {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '未知球员';
        this.position = data.position || 'DF';
        this.ability = data.ability || 50;
        this.age = data.age || 20;
        this.potential = Number.isFinite(data.potential) ? data.potential : this.generatePotential();
        this.potential = Math.max(this.potential, this.ability);
        this.potential = Math.min(200, this.potential);
        const savedContractYears = Number.isFinite(data.contractYears) ? data.contractYears : data.contractYearsRemaining;
        this.contractYears = Number.isFinite(savedContractYears) ? savedContractYears : Player.generateContractYears(this.age);
        this.contractYearsRemaining = this.contractYears;
        this.shirtNumber = Number.isInteger(data.shirtNumber) ? data.shirtNumber : null;
        this.value = data.value && data.value < 100000 ? data.value : this.calculateValue();
        const legacyWage = data.wage && data.wage < 1000 ? data.wage : null;
        this.salary = data.salary && data.salary < 1000 ? data.salary : (legacyWage || this.calculateSalary());
        this.wage = this.salary;
        this.goals = data.goals || 0;
        this.assists = data.assists || 0;
        this.appearances = data.appearances || 0;
    }

    generateId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generatePotential(minPotential = 1, maxPotential = 200) {
        // 潜力的实际上下界：不能低于当前能力（潜力表示"未来巅峰"），不能超出 maxPotential
        const floor = Math.max(this.ability, minPotential);
        const ceiling = Math.min(200, Math.max(floor, maxPotential));

        // 原有的分层分布（40-120、100-150、140-175、170-190、190-200），
        // 但每一层的 min 被限制为 ≥ floor，max 被限制为 ≤ ceiling
        // 当 ceiling 较低时，高端区间会被挤掉
        const tiers = [
            { max: Math.min(120, ceiling), min: Math.max(floor, 1), prob: 0.60 },
            { max: Math.min(150, ceiling), min: Math.max(floor, 100), prob: 0.25 },
            { max: Math.min(175, ceiling), min: Math.max(floor, 140), prob: 0.11 },
            { max: Math.min(190, ceiling), min: Math.max(floor, 170), prob: 0.03 },
            { max: Math.min(200, ceiling), min: Math.max(floor, 190), prob: 0.01 }
        ];

        // 过滤掉 min >= max 的分段，并归一化概率
        const valid = [];
        for (const t of tiers) {
            if (t.min < t.max) valid.push(t);
        }
        const totalProb = valid.reduce((sum, t) => sum + t.prob, 0) || 1;

        let roll = Math.random() * totalProb;
        let potential = Player.randomInt(floor, ceiling);
        for (const t of valid) {
            roll -= t.prob;
            if (roll <= 0) {
                potential = Player.randomInt(t.min, t.max);
                break;
            }
        }

        potential = Math.max(floor, potential);
        potential = Math.min(ceiling, potential);
        return potential;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static generateContractYears(age) {
        if (age <= 20) return Player.randomInt(4, 5);
        if (age <= 27) return Player.randomInt(3, 5);
        if (age <= 32) return Player.randomInt(2, 4);
        return Player.randomInt(1, 2);
    }

    static testPotentialDistribution(count = 10000) {
        const total = Math.max(1, Math.floor(count));
        const stats = {
            total,
            potential180Plus: 0,
            potential190Plus: 0,
            lowAbilityHighPotential: 0,
            oldPlayerHighPotential: 0
        };

        for (let i = 0; i < total; i++) {
            const player = new Player({
                name: `测试球员${i + 1}`,
                position: CONFIG.PLAYER_POSITIONS[i % CONFIG.PLAYER_POSITIONS.length],
                ability: Player.randomInt(1, 200),
                age: Player.randomInt(16, 40)
            });

            if (player.potential >= 180) stats.potential180Plus++;
            if (player.potential >= 190) stats.potential190Plus++;
            if (player.ability <= 50 && player.potential >= 180) stats.lowAbilityHighPotential++;
            if (player.age >= 32 && player.potential >= 180) stats.oldPlayerHighPotential++;
        }

        console.log('潜力分布测试', stats);
        return stats;
    }

    calculateValue() {
        // 身价 = 能力值 * 1000 * 年龄系数
        return Economy.calculatePlayerValue(this);
    }

    calculateSalary() {
        return Economy.calculateSalary(this.ability);
    }

    calculateWage() {
        // 周薪 = 身价 / 52
        return this.calculateSalary();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            ability: this.ability,
            potential: this.potential,
            contractYears: this.contractYears,
            contractYearsRemaining: this.contractYearsRemaining,
            shirtNumber: this.shirtNumber,
            age: this.age,
            value: this.value,
            salary: this.salary,
            wage: this.wage,
            goals: this.goals,
            assists: this.assists,
            appearances: this.appearances
        };
    }
}

// ========================================
// 球员成长/退化系统
// ========================================
const PlayerGrowth = {
    BASE_GROWTH_CHANCE: 0.06,

    applyPostMatchChange(team) {
        if (!team || !Array.isArray(team.players)) return [];
        const changes = [];

        team.players.forEach(player => {
            this.ensurePlayerFields(player);

            const oldAbility = player.ability;
            let type = null;
            let chance = 0;

            if (player.age <= 30) {
                chance = this.calculateGrowthChance(player);
                if (Math.random() < chance) {
                    player.ability += 1;
                    player.ability = Math.min(player.ability, player.potential, 200);
                    type = player.ability > oldAbility ? 'growth' : null;
                }
            } else {
                chance = this.getDeclineChance(player.age);
                if (Math.random() < chance) {
                    player.ability -= 1;
                    player.ability = Math.max(1, player.ability);
                    type = player.ability < oldAbility ? 'decline' : null;
                }
            }

            if (type) {
                this.recalculatePlayerEconomics(player);
                changes.push({
                    playerName: player.name,
                    age: player.age,
                    oldAbility,
                    newAbility: player.ability,
                    potential: player.potential,
                    type,
                    chance: Number(chance.toFixed(4))
                });
            }
        });

        return changes;
    },

    ensurePlayerFields(player) {
        player.age = Number.isFinite(Number(player.age)) ? Number(player.age) : 20;
        player.ability = Number.isFinite(Number(player.ability)) ? Number(player.ability) : 1;
        player.ability = this.clamp(Math.round(player.ability), 1, 200);

        const existingPotential = Number(player.potential || player.ability);
        player.potential = Number.isFinite(existingPotential) ? existingPotential : player.ability;
        player.potential = this.clamp(Math.round(Math.max(player.potential, player.ability)), 1, 200);
    },

    calculateGrowthChance(player) {
        if (player.age > 30 || player.potential <= player.ability) return 0;

        const potentialGap = player.potential - player.ability;
        const ageFactor = this.getAgeGrowthFactor(player.age);
        const potentialGapFactor = this.clamp(potentialGap / 50, 0.2, 1.5);
        const lowAbilityBoost = this.getLowAbilityBoost(player.ability);
        const randomVariance = 0.85 + Math.random() * 0.30;

        const growthChance = this.BASE_GROWTH_CHANCE *
            ageFactor *
            potentialGapFactor *
            lowAbilityBoost *
            randomVariance;

        return this.clamp(growthChance, 0, 0.30);
    },

    getAgeGrowthFactor(age) {
        if (age <= 18) return 2.5;
        if (age <= 21) return 1.8;
        if (age <= 24) return 1.2;
        if (age <= 27) return 0.6;
        if (age <= 30) return 0.2;
        return 0;
    },

    getLowAbilityBoost(ability) {
        if (ability <= 30) return 2.0;
        if (ability <= 60) return 1.6;
        if (ability <= 90) return 1.3;
        if (ability <= 120) return 1.1;
        return 1.0;
    },

    getDeclineChance(age) {
        if (age < 31) return 0;
        return Math.min(0.08, 0.01 + (age - 31) * 0.01);
    },

    applyEndSeasonAging(players) {
        if (!Array.isArray(players)) return;
        players.forEach(player => {
            this.ensurePlayerFields(player);
            player.age += 1;
            player.contractYears = Math.max(0, (Number(player.contractYears) || Number(player.contractYearsRemaining) || 0) - 1);
            player.contractYearsRemaining = player.contractYears;
            if (player.contractYears <= 0) {
                Economy.signContract(player);
            }
            this.recalculatePlayerEconomics(player);
        });
    },

    testGrowthAndDeclineSimulation() {
        const samples = [
            { age: 16, ability: 1, potential: 200 },
            { age: 18, ability: 80, potential: 170 },
            { age: 21, ability: 120, potential: 160 },
            { age: 25, ability: 140, potential: 170 },
            { age: 29, ability: 150, potential: 170 },
            { age: 31, ability: 150, potential: 180 },
            { age: 35, ability: 150, potential: 180 },
            { age: 38, ability: 130, potential: 180 }
        ];

        const players = samples.map((data, index) => new Player({
            name: `成长测试${index + 1}`,
            position: CONFIG.PLAYER_POSITIONS[index % CONFIG.PLAYER_POSITIONS.length],
            ...data
        }));
        const team = { players };
        const before = players.map(player => player.ability);

        for (let match = 0; match < CONFIG.MATCHES_PER_SEASON; match++) {
            this.applyPostMatchChange(team);
        }

        const result = players.map((player, index) => ({
            age: player.age,
            abilityBefore: before[index],
            abilityAfter: player.ability,
            potential: player.potential,
            totalChange: player.ability - before[index]
        }));

        console.log('成长/退化模拟测试', result);
        return result;
    },

    recalculatePlayerEconomics(player) {
        if (typeof player.calculateValue === 'function') {
            player.value = player.calculateValue();
        }
        player.wage = player.salary;
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
};

// ========================================
// 球队数据模型
// ========================================
const Economy = {
    random(min, max) {
        return min + Math.random() * (max - min);
    },

    roundMoney(amount) {
        return Number((Number(amount || 0)).toFixed(2));
    },

    formatMoney(amount) {
        const rounded = this.roundMoney(amount);
        return `${rounded.toLocaleString()}万`;
    },

    calculateSalary(abilityValue) {
        const ability = Math.max(Number(abilityValue) || 1, 10);
        let salary = 0.1 * Math.pow(ability / 10, 2.2);
        salary = salary * this.random(0.8, 1.2);
        // 周薪保留1位小数，最低0.1万
        salary = Math.max(0.1, Number(salary.toFixed(1)));
        return salary;
    },

    calculatePlayerWage(player) {
        return this.calculateSalary(player && player.ability);
    },

    signContract(player, years) {
        if (!player) return null;
        player.contractYears = Number.isInteger(years) ? years : Player.generateContractYears(player.age);
        player.contractYearsRemaining = player.contractYears;
        player.salary = this.calculateSalary(player.ability);
        player.wage = player.salary;
        return player.salary;
    },

    calculatePlayerValue(player) {
        const ability = Math.max(1, Number(player && player.ability) || 1);
        const potential = Math.max(ability, Number(player && player.potential) || ability);
        const age = Number(player && player.age) || 24;
        const contractYears = Math.max(0, Math.min(5, Number(player && (player.contractYears ?? player.contractYearsRemaining)) || 0));

        let ageFactor = 1;
        if (age <= 20) ageFactor = 1.55;
        else if (age <= 24) ageFactor = 1.35;
        else if (age <= 28) ageFactor = 1.1;
        else if (age <= 31) ageFactor = 0.85;
        else if (age <= 34) ageFactor = 0.6;
        else ageFactor = 0.35;

        const potentialFactor = Math.max(0.75, Math.min(1.8, 0.75 + (potential - ability) / 120));
        const contractFactor = 0.5 + contractYears * 0.2;
        return Math.max(1, Math.round(ability * ability * 0.04 * ageFactor * potentialFactor * contractFactor));
    },

    pickAiStyle() {
        const styles = CONFIG.ECONOMY.AI_STYLES;
        const totalWeight = styles.reduce((sum, style) => sum + style.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const style of styles) {
            roll -= style.weight;
            if (roll <= 0) return style.key;
        }
        return 'balanced';
    },

    getMatchIncome(leagueLevel, isHome) {
        const table = CONFIG.ECONOMY.MATCH_INCOME[leagueLevel] || CONFIG.ECONOMY.MATCH_INCOME[6];
        return isHome ? table.home : table.away;
    },

    getSquadSalary(team) {
        if (!team || !Array.isArray(team.players)) return 0;
        return this.roundMoney(team.players.reduce((sum, player) => sum + (Number(player.salary) || Number(player.wage) || 0.1), 0));
    },

    settleMatch(team, leagueLevel, isHome) {
        if (!team) return null;
        const matchIncome = this.getMatchIncome(leagueLevel, isHome);
        const squadSalary = this.getSquadSalary(team);
        team.cash = this.roundMoney((Number(team.cash) || 0) + matchIncome - squadSalary);
        team.negativeCashRounds = team.cash < 0 ? (team.negativeCashRounds || 0) + 1 : 0;
        return {
            matchIncome,
            squadSalary,
            netIncome: this.roundMoney(matchIncome - squadSalary),
            cashAfter: team.cash
        };
    },

    getRankBonus(rank, leagueLevel) {
        const base = CONFIG.ECONOMY.RANK_BONUS_BASE.find(row => rank <= row.maxRank);
        if (!base) return 0;
        return this.roundMoney(base.amount * (CONFIG.ECONOMY.LEAGUE_BONUS_MULTIPLIER[leagueLevel] || 1));
    },

    settleSeasonBonus(team, rank, leagueLevel) {
        if (!team) return 0;
        const bonus = this.getRankBonus(rank, leagueLevel);
        team.cash = this.roundMoney((Number(team.cash) || 0) + bonus);
        return bonus;
    },

    getAnnualIncomeEstimate(leagueLevel) {
        const table = CONFIG.ECONOMY.MATCH_INCOME[leagueLevel] || CONFIG.ECONOMY.MATCH_INCOME[6];
        return (table.home * 19) + (table.away * 19) + this.getRankBonus(10, leagueLevel);
    },

    getSalaryRatio(team, leagueLevel) {
        return (this.getSquadSalary(team) * CONFIG.MATCHES_PER_SEASON) / Math.max(1, this.getAnnualIncomeEstimate(leagueLevel));
    },

    getFinancialHealth(team, leagueLevel) {
        const ratio = this.getSalaryRatio(team, leagueLevel);
        if (ratio < 0.4) return { ratio, level: 'lean', label: '节制' };
        if (ratio <= 0.6) return { ratio, level: 'healthy', label: '健康' };
        if (ratio <= 0.8) return { ratio, level: 'warning', label: '危险' };
        return { ratio, level: 'crisis', label: '危机' };
    },

    handleFinancialCrisis(team) {
        if (!team || team.isPlayerTeam || !Array.isArray(team.players) || (team.negativeCashRounds || 0) < 6) return [];
        team.financialCrisisLevel = Math.min(3, Math.floor((team.negativeCashRounds || 0) / 6));
        if (team.financialCrisisLevel < 3 || team.players.length <= 18) return [];

        const player = [...team.players].sort((a, b) =>
            ((b.salary || b.wage || 0) - (a.salary || a.wage || 0)) || ((b.age || 0) - (a.age || 0))
        )[0];
        if (!player) return [];

        const fee = Math.max(1, Math.round((player.value || this.calculatePlayerValue(player)) * 0.75));
        team.players = team.players.filter(item => item.id !== player.id);
        team.startingLineup = (team.startingLineup || []).filter(id => id !== player.id);
        team.cash = this.roundMoney((Number(team.cash) || 0) + fee);
        if (typeof team.setDefaultLineup === 'function') team.setDefaultLineup();
        return [{ type: 'forcedSale', playerName: player.name, fee }];
    }
};

class Team {
    constructor(data = {}) {
        this.id = data.id || Team.generateId();
        this.name = data.name || '未命名球队';
        const storedCash = Number.isFinite(data.cash) ? data.cash : (Number.isFinite(data.funds) ? data.funds : 300);
        this.cash = storedCash > 100000 ? Economy.roundMoney(storedCash / 10000) : storedCash;
        this.players = data.players || [];
        this.startingLineup = data.startingLineup || [];
        this.leagueLevel = data.leagueLevel || 6;
        this.isPlayerTeam = data.isPlayerTeam || false;
        this.aiStyle = data.aiStyle || (this.isPlayerTeam ? 'player' : Economy.pickAiStyle());
        this.negativeCashRounds = data.negativeCashRounds || 0;
        this.financialCrisisLevel = data.financialCrisisLevel || 0;
        this.stats = data.stats || {
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
        };

        // === 懒加载状态 ===
        this.isPlayersLoaded = data.isPlayersLoaded !== undefined ? data.isPlayersLoaded : true;
        this.playersData = data.playersData || null;

        if (this.isPlayersLoaded) {
            this.assignShirtNumbers();
        }
    }

    // 静态方法：生成球队ID
    static generateId() {
        return 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    get funds() {
        return this.cash;
    }

    set funds(value) {
        this.cash = value;
    }

    getTeamValue() {
        return this.players.reduce((sum, p) => sum + (p.value || 0), 0);
    }

    getTeamAbility() {
        if (!this.isPlayersLoaded) {
            this.loadPlayers();
        }
        if (this.players.length === 0) return 0;
        const lineupPlayers = this.startingLineup.map(id =>
            this.players.find(p => p.id === id)
        ).filter(p => p);

        if (lineupPlayers.length === 0) return 0;
        return lineupPlayers.reduce((sum, p) => sum + p.ability, 0);
    }

    setDefaultLineup() {
        this.startingLineup = [];
        const positions = ['GK', 'DF', 'MF', 'CF'];

        for (const pos of positions) {
            const count = CONFIG.STARTING_LINEUP[pos];
            const posPlayers = this.players
                .filter(p => p.position === pos)
                .sort((a, b) => (b.ability || 0) - (a.ability || 0));
            for (let i = 0; i < count && i < posPlayers.length; i++) {
                this.startingLineup.push(posPlayers[i].id);
            }
        }
    }

    assignShirtNumbers(options = {}) {
        const prioritizeStarting = options.prioritizeStarting || false;
        const preserveExisting = options.preserveExisting !== false;
        const usedNumbers = new Set();

        if (prioritizeStarting && !preserveExisting) {
            this.players.forEach(player => {
                player.shirtNumber = null;
            });
        }

        this.players.forEach(player => {
            if (Number.isInteger(player.shirtNumber) &&
                player.shirtNumber >= 1 &&
                player.shirtNumber <= 99 &&
                !usedNumbers.has(player.shirtNumber)) {
                usedNumbers.add(player.shirtNumber);
                return;
            }

            player.shirtNumber = null;
        });

        const startingPlayers = this.startingLineup
            .map(id => this.players.find(player => player.id === id))
            .filter(player => player);
        const substitutePlayers = this.players.filter(player => !this.startingLineup.includes(player.id));
        const orderedPlayers = prioritizeStarting ? [...startingPlayers, ...substitutePlayers] : this.players;

        orderedPlayers.forEach((player, index) => {
            if (player.shirtNumber) return;

            let number = prioritizeStarting && index >= startingPlayers.length ? 12 : 1;
            while (usedNumbers.has(number) && number <= 99) {
                number++;
            }

            player.shirtNumber = number <= 99 ? number : null;
            if (player.shirtNumber) {
                usedNumbers.add(player.shirtNumber);
            }
        });
    }

    // 按需加载球员数据（懒加载）
    loadPlayers() {
        if (this.isPlayersLoaded) return;

        // 如果有缓存数据，从缓存恢复
        const hasSavedPlayersData = Boolean(this.playersData);
        if (this.playersData) {
            this.players = this.playersData.map(p => new Player(p));
            this.playersData = null;
        } else {
            // 生成新的球员数据
            this.players = DataGenerator.generateTeamPlayers(this.leagueLevel);
        }

        this.setDefaultLineup();
        this.assignShirtNumbers({
            prioritizeStarting: !hasSavedPlayersData,
            preserveExisting: hasSavedPlayersData
        });
        this.isPlayersLoaded = true;
    }

    // 检查球员是否需要加载（懒加载状态检查）
    isPlayersLoadPending() {
        return !this.isPlayersLoaded;
    }

    // 按需生成球员（懒加载触发器）
    generatePlayersIfNeeded() {
        if (!this.isPlayersLoaded) {
            this.loadPlayers();
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            funds: this.funds,
            cash: this.cash,
            players: this.isPlayersLoaded ? this.players.map(p => p.toJSON ? p.toJSON() : p) : [],
            startingLineup: this.startingLineup,
            leagueLevel: this.leagueLevel,
            isPlayerTeam: this.isPlayerTeam,
            aiStyle: this.aiStyle,
            negativeCashRounds: this.negativeCashRounds,
            financialCrisisLevel: this.financialCrisisLevel,
            stats: this.stats,
            isPlayersLoaded: this.isPlayersLoaded,
            playersData: this.isPlayersLoaded ? null : (this.players.map(p => p.toJSON ? p.toJSON() : p) || this.playersData)
        };
    }
}

// ========================================
// 联赛数据模型
// ========================================
class League {
    constructor(data = {}) {
        this.level = data.level || 1;
        this.name = data.name || `第${this.level}级联赛`;
        this.teams = data.teams || [];
        this.schedule = data.schedule || [];
        this.currentRound = data.currentRound || 1;
        this.season = data.season || 1;
        this.standings = data.standings || [];

        // === 懒加载状态 ===
        this.isTeamsLoaded = data.isTeamsLoaded !== undefined ? data.isTeamsLoaded : true;
        this.teamsData = data.teamsData || null;
    }

    // 生成联赛赛程（主客场制，共38轮）
    generateSchedule() {
        if (this.teams.length !== CONFIG.TEAMS_PER_LEAGUE) {
            console.error('球队数量不正确，无法生成赛程');
            return;
        }

        const teamCount = this.teams.length;
        const matchesPerRound = teamCount / 2;
        const firstHalfRounds = [];

        // 使用循环赛算法生成基础对阵，并交替主客场，避免固定球队连续主/客场。
        let teamIndices = Array.from({ length: teamCount }, (_, i) => i);

        for (let round = 0; round < teamCount - 1; round++) {
            const roundMatches = [];

            for (let match = 0; match < matchesPerRound; match++) {
                const left = teamIndices[match];
                const right = teamIndices[teamCount - 1 - match];
                const shouldFlipHome = (round + match) % 2 === 1;
                const home = shouldFlipHome ? right : left;
                const away = shouldFlipHome ? left : right;

                roundMatches.push({
                    homeTeam: this.teams[home].id,
                    awayTeam: this.teams[away].id,
                    homeScore: null,
                    awayScore: null,
                    played: false
                });
            }

            firstHalfRounds.push(roundMatches);

            // 轮转球队位置（保持第一个位置不变）
            teamIndices = [teamIndices[0], ...teamIndices.slice(2), teamIndices[1]];
        }

        this.schedule = [];

        // 前半程先踢完所有对手一次，后半程再反转主客场。
        for (let round = 0; round < teamCount - 1; round++) {
            this.schedule.push({
                round: round + 1,
                matches: firstHalfRounds[round]
            });
        }

        for (let round = 0; round < teamCount - 1; round++) {
            this.schedule.push({
                round: teamCount + round,
                matches: firstHalfRounds[round].map(match => ({
                    homeTeam: match.awayTeam,
                    awayTeam: match.homeTeam,
                    homeScore: null,
                    awayScore: null,
                    played: false
                }))
            });
        }
    }

    // 初始化积分榜
    initStandings() {
        this.standings = this.teams.map(team => ({
            teamId: team.id,
            teamName: team.name,
            isPlayerTeam: team.isPlayerTeam,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));
    }

    // 更新积分榜
    updateStandings(match) {
        const homeStanding = this.standings.find(s => s.teamId === match.homeTeam);
        const awayStanding = this.standings.find(s => s.teamId === match.awayTeam);

        if (!homeStanding || !awayStanding) return;

        homeStanding.played++;
        awayStanding.played++;
        homeStanding.goalsFor += match.homeScore;
        homeStanding.goalsAgainst += match.awayScore;
        awayStanding.goalsFor += match.awayScore;
        awayStanding.goalsAgainst += match.homeScore;
        homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
        awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;

        if (match.homeScore > match.awayScore) {
            homeStanding.won++;
            homeStanding.points += 3;
            awayStanding.lost++;
        } else if (match.homeScore < match.awayScore) {
            awayStanding.won++;
            awayStanding.points += 3;
            homeStanding.lost++;
        } else {
            homeStanding.drawn++;
            awayStanding.drawn++;
            homeStanding.points++;
            awayStanding.points++;
        }
    }

    // 获取排序后的积分榜
    getSortedStandings() {
        return [...this.standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    }

    // 按需加载球队数据（懒加载）
    loadTeams() {
        if (this.isTeamsLoaded) return;

        // 如果有缓存数据，从缓存恢复
        if (this.teamsData) {
            this.teams = this.teamsData.map(t => new Team(t));
            this.teamsData = null;
        }

        this.isTeamsLoaded = true;
    }

    // 按需生成赛程（懒加载触发器）
    generateScheduleIfNeeded() {
        if (this.schedule.length === 0 && this.isTeamsLoaded) {
            this.generateSchedule();
        }
    }

    // 确保联赛完全加载（懒加载触发）
    ensureFullLoad() {
        // 加载球队
        if (!this.isTeamsLoaded) {
            this.loadTeams();
        }

        // 加载赛程
        if (this.schedule.length === 0) {
            this.generateSchedule();
        }

        // 确保所有球队球员已加载
        for (const team of this.teams) {
            team.generatePlayersIfNeeded();
        }
    }

    // 按需加载赛程数据（懒加载）
    loadSchedule() {
        if (this.schedule && this.schedule.length > 0) return;
        if (this.teams.length !== CONFIG.TEAMS_PER_LEAGUE) {
            console.error('球队数量不正确，无法生成赛程');
            return;
        }
        this.generateSchedule();
    }

    // 检查联赛是否完全加载（球队+赛程）
    isFullyLoaded() {
        return this.isTeamsLoaded &&
            this.schedule &&
            this.schedule.length > 0;
    }

    // 将联赛转为懒加载降级状态（保留基本数据，清理内存）
    // 用于玩家升级后，原联赛降级为懒加载以节省内存
    toLazyLoad() {
        if (this.isTeamsLoaded) {
            // 保存球队数据到 teamsData（用于恢复）
            this.teamsData = this.teams.map(t => {
                // 如果球队球员已加载，保存球员数据
                if (t.isPlayersLoaded && t.players.length > 0) {
                    return {
                        ...t.toJSON(),
                        isPlayersLoaded: true,
                        playersData: t.players.map(p => p.toJSON ? p.toJSON() : p)
                    };
                }
                return t.toJSON();
            });

            // 清空 teams，释放内存
            this.teams = [];

            // 保留 standings（积分榜数据），清空 schedule
            this.schedule = [];

            // 更新加载状态
            this.isTeamsLoaded = false;
        }
    }

    toJSON() {
        return {
            level: this.level,
            name: this.name,
            teams: this.isTeamsLoaded ? this.teams.map(t => t.toJSON ? t.toJSON() : t) : [],
            schedule: this.schedule,
            currentRound: this.currentRound,
            season: this.season,
            standings: this.standings,
            isTeamsLoaded: this.isTeamsLoaded,
            teamsData: this.isTeamsLoaded ? null : (this.teams.map(t => t.toJSON ? t.toJSON() : t) || this.teamsData)
        };
    }
}

// ========================================
// 游戏状态
// ========================================
let gameState = {
    isInitialized: false,
    playerTeam: null,
    leagues: [],
    currentLeagueLevel: 6,
    transferMarket: [],
    lastSaveTime: null
};
