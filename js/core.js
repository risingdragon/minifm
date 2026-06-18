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
    PLAYER_POSITIONS: ['GK', 'DEF', 'MID', 'FWD'],
    POSITION_NAMES: {
        'GK': '门将',
        'DEF': '后卫',
        'MID': '中场',
        'FWD': '前锋'
    },
    // 首发阵容配置 (4-4-2阵型)
    STARTING_LINEUP: {
        'GK': 1,
        'DEF': 4,
        'MID': 4,
        'FWD': 2
    },
    // 阵容最小人数
    SQUAD_MIN_PLAYERS: {
        'GK': 2,
        'DEF': 5,
        'MID': 5,
        'FWD': 3
    },
    // 自动保存间隔（毫秒）
    AUTO_SAVE_INTERVAL: 30000
};

// ========================================
// 球员数据模型
// ========================================
class Player {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '未知球员';
        this.position = data.position || 'DEF';
        this.ability = data.ability || 50;
        this.age = data.age || 20;
        this.potential = Number.isFinite(data.potential) ? data.potential : this.generatePotential();
        this.shirtNumber = Number.isInteger(data.shirtNumber) ? data.shirtNumber : null;
        this.value = data.value || this.calculateValue();
        this.wage = data.wage || this.calculateWage();
        this.goals = data.goals || 0;
        this.assists = data.assists || 0;
        this.appearances = data.appearances || 0;
    }

    generateId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generatePotential() {
        let growthRange = 5;
        if (this.age <= 21) {
            growthRange = 45;
        } else if (this.age <= 25) {
            growthRange = 30;
        } else if (this.age <= 29) {
            growthRange = 15;
        }

        return Math.min(200, this.ability + Math.floor(Math.random() * (growthRange + 1)));
    }

    calculateValue() {
        // 身价 = 能力值 * 1000 * 年龄系数
        const ageFactor = this.age < 25 ? 1.5 : (this.age < 30 ? 1.2 : 0.8);
        return Math.floor(this.ability * 1000 * ageFactor);
    }

    calculateWage() {
        // 周薪 = 身价 / 52
        return Math.floor(this.value / 52);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            ability: this.ability,
            potential: this.potential,
            shirtNumber: this.shirtNumber,
            age: this.age,
            value: this.value,
            wage: this.wage,
            goals: this.goals,
            assists: this.assists,
            appearances: this.appearances
        };
    }
}

// ========================================
// 球队数据模型
// ========================================
class Team {
    constructor(data = {}) {
        this.id = data.id || Team.generateId();
        this.name = data.name || '未命名球队';
        this.funds = data.funds || 5000000;
        this.players = data.players || [];
        this.startingLineup = data.startingLineup || [];
        this.leagueLevel = data.leagueLevel || 6;
        this.isPlayerTeam = data.isPlayerTeam || false;
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

    getTeamValue() {
        return this.players.reduce((sum, p) => sum + (p.value || 0), 0);
    }

    getTeamAbility() {
        if (this.players.length === 0) return 0;
        const lineupPlayers = this.startingLineup.map(id =>
            this.players.find(p => p.id === id)
        ).filter(p => p);

        if (lineupPlayers.length === 0) return 0;
        return Math.floor(lineupPlayers.reduce((sum, p) => sum + p.ability, 0) / lineupPlayers.length);
    }

    setDefaultLineup() {
        this.startingLineup = [];
        const positions = ['GK', 'DEF', 'MID', 'FWD'];

        for (const pos of positions) {
            const count = CONFIG.STARTING_LINEUP[pos];
            const posPlayers = this.players.filter(p => p.position === pos);
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
            players: this.isPlayersLoaded ? this.players.map(p => p.toJSON ? p.toJSON() : p) : [],
            startingLineup: this.startingLineup,
            leagueLevel: this.leagueLevel,
            isPlayerTeam: this.isPlayerTeam,
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

        this.schedule = [];
        const teamCount = this.teams.length;
        const totalRounds = (teamCount - 1) * 2; // 38轮
        const matchesPerRound = teamCount / 2;

        // 使用循环赛算法生成赛程
        // 创建球队索引数组
        let teamIndices = Array.from({ length: teamCount }, (_, i) => i);

        // 第一循环（主场）
        for (let round = 0; round < teamCount - 1; round++) {
            const roundMatches = [];

            for (let match = 0; match < matchesPerRound; match++) {
                const home = teamIndices[match];
                const away = teamIndices[teamCount - 1 - match];

                roundMatches.push({
                    homeTeam: this.teams[home].id,
                    awayTeam: this.teams[away].id,
                    homeScore: null,
                    awayScore: null,
                    played: false
                });
            }

            this.schedule.push({
                round: round + 1,
                matches: roundMatches
            });

            // 轮转球队位置（保持第一个位置不变）
            teamIndices = [teamIndices[0], ...teamIndices.slice(2), teamIndices[1]];
        }

        // 第二循环（交换主客场）
        for (let round = 0; round < teamCount - 1; round++) {
            const roundMatches = [];
            const firstHalfRound = this.schedule[round].matches;

            for (const match of firstHalfRound) {
                roundMatches.push({
                    homeTeam: match.awayTeam,
                    awayTeam: match.homeTeam,
                    homeScore: null,
                    awayScore: null,
                    played: false
                });
            }

            this.schedule.push({
                round: teamCount + round,
                matches: roundMatches
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
    currentSeason: 1,
    currentRound: 1,
    transferMarket: [],
    lastSaveTime: null
};
