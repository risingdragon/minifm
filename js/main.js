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
        this.value = data.value || this.calculateValue();
        this.wage = data.wage || this.calculateWage();
        this.goals = data.goals || 0;
        this.assists = data.assists || 0;
        this.appearances = data.appearances || 0;
    }

    generateId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    
    // 按需加载球员数据（懒加载）
    loadPlayers() {
        if (this.isPlayersLoaded) return;
        
        // 如果有缓存数据，从缓存恢复
        if (this.playersData) {
            this.players = this.playersData.map(p => new Player(p));
            this.playersData = null;
        } else {
            // 生成新的球员数据
            this.players = DataGenerator.generateTeamPlayers(this.leagueLevel);
        }
        
        this.setDefaultLineup();
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

// ========================================
// 数据生成模块
// ========================================
const DataGenerator = {
    // 姓名库
    firstNames: ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', 
                 '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
                 '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
                 '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕'],
    lastNames: ['伟', '强', '磊', '军', '勇', '杰', '涛', '明', '辉', '鹏',
                '华', '飞', '宇', '龙', '斌', '刚', '平', '建', '志', '文',
                '俊', '浩', '天', '阳', '凯', '峰', '毅', '博', '昊', '然',
                '旭', '晨', '睿', '霖', '航', '宁', '远', '翔', '川', '林'],

    // 城市名库（用于球队命名）
    cityNames: [
        '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', 
        '西安', '重庆', '天津', '苏州', '青岛', '大连', '厦门', '长沙',
        '郑州', '济南', '福州', '昆明', '南昌', '南宁', '合肥', '石家庄',
        '太原', '沈阳', '长春', '哈尔滨', '贵阳', '兰州', '乌鲁木齐', '海口',
        '珠海', '东莞', '佛山', '无锡', '宁波', '温州', '常州', '徐州',
        '烟台', '潍坊', '临沂', '洛阳', '襄阳', '宜昌', '株洲', '湘潭',
        '绵阳', '德阳', '泸州', '遵义', '曲靖', '大同', '包头', '鄂尔多斯',
        '齐齐哈尔', '牡丹江', '吉林', '延边', '鞍山', '抚顺', '锦州', '营口',
        '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '嘉兴', '湖州',
        '绍兴', '金华', '台州', '衢州', '舟山', '丽水', '芜湖', '蚌埠',
        '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳',
        '宿州', '六安', '亳州', '池州', '宣城', '泉州', '漳州', '南平',
        '龙岩', '宁德', '九江', '景德镇', '萍乡', '新余', '鹰潭', '赣州',
        '吉安', '宜春', '抚州', '上饶', '德州', '聊城', '滨州', '菏泽',
        '汕头', '中山', '江门', '茂名', '湛江', '肇庆', '惠州', '保定',
        '唐山', '廊坊', '沧州', '衡水', '邢台', '邯郸', '秦皇岛', '张家口',
        '柳州', '桂林', '北海', '梧州', '百色', '钦州', '贵港', '玉林'
    ],

    // 生成随机球员姓名
    generatePlayerName() {
        const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
        const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        return firstName + lastName;
    },

    // 生成球员
    generatePlayer(position, leagueLevel = 1) {
        // 根据联赛级别调整能力值范围
        // 第1级联赛: 120-180, 第6级联赛: 50-100
        const minAbility = 50 + (6 - leagueLevel) * 10;
        const maxAbility = 100 + (6 - leagueLevel) * 16;
        const ability = minAbility + Math.floor(Math.random() * (maxAbility - minAbility));
        
        // 年龄分布：更倾向于年轻球员
        const ageRand = Math.random();
        let age;
        if (ageRand < 0.3) {
            age = 17 + Math.floor(Math.random() * 5); // 17-21岁
        } else if (ageRand < 0.7) {
            age = 22 + Math.floor(Math.random() * 6); // 22-27岁
        } else if (ageRand < 0.9) {
            age = 28 + Math.floor(Math.random() * 5); // 28-32岁
        } else {
            age = 33 + Math.floor(Math.random() * 4); // 33-36岁
        }

        const player = new Player({
            name: this.generatePlayerName(),
            position: position,
            ability: ability,
            age: age
        });
        
        // 根据能力值和年龄重新计算身价
        player.value = player.calculateValue();
        player.wage = player.calculateWage();
        
        return player;
    },
    
    // 生成球队所有球员（用于懒加载）
    generateTeamPlayers(leagueLevel) {
        const players = [];
        
        // 生成门将（2-3人）
        const gkCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < gkCount; i++) {
            players.push(this.generatePlayer('GK', leagueLevel));
        }
        
        // 生成后卫（5-7人）
        const defCount = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < defCount; i++) {
            players.push(this.generatePlayer('DEF', leagueLevel));
        }
        
        // 生成中场（5-7人）
        const midCount = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < midCount; i++) {
            players.push(this.generatePlayer('MID', leagueLevel));
        }
        
        // 生成前锋（3-5人）
        const fwdCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < fwdCount; i++) {
            players.push(this.generatePlayer('FWD', leagueLevel));
        }
        
        return players;
    },

    // 生成球队
    generateTeam(name, leagueLevel, isPlayerTeam = false, lazyLoad = false) {
        // 根据联赛级别设置初始资金
        const baseFunds = 5000000;
        const fundsByLevel = {
            1: baseFunds * 10,
            2: baseFunds * 6,
            3: baseFunds * 4,
            4: baseFunds * 2.5,
            5: baseFunds * 1.5,
            6: baseFunds
        };

        if (lazyLoad) {
            // 懒加载模式：只含基本信息，不生成球员
            const team = new Team({
                name: name,
                funds: fundsByLevel[leagueLevel] || baseFunds,
                players: [],
                leagueLevel: leagueLevel,
                isPlayerTeam: isPlayerTeam,
                isPlayersLoaded: false,
                playersData: []
            });
            return team;
        } else {
            // 完整生成模式：包含球员
            const players = this.generateTeamPlayers(leagueLevel);
            const team = new Team({
                name: name,
                funds: fundsByLevel[leagueLevel] || baseFunds,
                players: players,
                leagueLevel: leagueLevel,
                isPlayerTeam: isPlayerTeam,
                isPlayersLoaded: true
            });
            team.setDefaultLineup();
            return team;
        }
    },

    // 为联赛生成球队（完整模式，包含球员和阵容）
    generateTeamsForLeague(level) {
        const teams = [];
        
        for (let i = 0; i < CONFIG.TEAMS_PER_LEAGUE; i++) {
            const teamName = `球队${(level - 1) * CONFIG.TEAMS_PER_LEAGUE + i + 1}`;
            const team = this.generateTeam(teamName, level, false);
            teams.push(team);
        }
        
        return teams;
    },

    // 生成所有球队名称（120支球队）
    generateAllTeamNames() {
        const shuffled = [...this.cityNames].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, CONFIG.TEAMS_PER_LEAGUE * CONFIG.LEAGUE_LEVELS).map(city => `${city}FC`);
    },

    // 生成所有联赛和球队（懒加载模式）
    generateAllLeagues() {
        const leagues = [];
        const teamNames = this.generateAllTeamNames();
        
        let teamIndex = 0;
        for (let level = 1; level <= CONFIG.LEAGUE_LEVELS; level++) {
            
            if (level === CONFIG.LEAGUE_LEVELS) {
                // 第6级联赛（玩家所在联赛）- 完整生成
                const teams = [];
                
                for (let i = 0; i < CONFIG.TEAMS_PER_LEAGUE; i++) {
                    const teamName = teamNames[teamIndex++];
                    const isPlayerTeam = (i === 0);
                    // 创建球队 - 完整生成（包含球员）
                    const team = this.generateTeam(teamName, level, isPlayerTeam);
                    teams.push(team);
                }

                const league = new League({
                    level: level,
                    teams: teams,
                    season: 1,
                    isTeamsLoaded: true
                });
                
                league.generateSchedule();
                league.initStandings();
                
                leagues.push(league);
            } else {
                // 其他联赛 - 懒加载模式（只含基本信息，不生成球员）
                const teamsData = [];
                
                for (let i = 0; i < CONFIG.TEAMS_PER_LEAGUE; i++) {
                    const teamName = teamNames[teamIndex++];
                    const teamData = {
                        id: Team.generateId(),
                        name: teamName,
                        leagueLevel: level,
                        isPlayerTeam: false,
                        isPlayersLoaded: false,
                        playersData: null,
                        stats: {
                            played: 0,
                            won: 0,
                            drawn: 0,
                            lost: 0,
                            goalsFor: 0,
                            goalsAgainst: 0,
                            points: 0
                        }
                    };
                    teamsData.push(teamData);
                }

                const league = new League({
                    level: level,
                    teams: [],  // 空数组，懒加载
                    teamsData: teamsData,
                    season: 1,
                    isTeamsLoaded: false,
                    schedule: [],  // 赛程也懒加载
                    standings: teamsData.map(t => ({
                        teamId: t.id,
                        teamName: t.name,
                        isPlayerTeam: false,
                        played: 0,
                        won: 0,
                        drawn: 0,
                        lost: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        goalDifference: 0,
                        points: 0
                    }))
                });
                
                leagues.push(league);
            }
        }

        return leagues;
    },

    // 生成单个联赛
    // lazyLoad = true: 懒加载模式（只含球队基本信息，不生成球员）
    // lazyLoad = false: 完整生成模式（包含球队、球员、赛程）
    generateLeague(level, lazyLoad = false) {
        if (lazyLoad) {
            // 懒加载模式：只含球队基本信息
            const teamsData = [];
            const standingsData = [];
            
            for (let i = 0; i < CONFIG.TEAMS_PER_LEAGUE; i++) {
                const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const teamName = `球队${(level - 1) * CONFIG.TEAMS_PER_LEAGUE + i + 1}`;
                
                teamsData.push({
                    id: teamId,
                    name: teamName,
                    leagueLevel: level,
                    isPlayerTeam: false,
                    isPlayersLoaded: false,
                    playersData: null,
                    stats: {
                        played: 0,
                        won: 0,
                        drawn: 0,
                        lost: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        points: 0
                    }
                });
                
                standingsData.push({
                    teamId: teamId,
                    teamName: teamName,
                    isPlayerTeam: false,
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    points: 0
                });
            }
            
            return new League({
                level: level,
                teams: [],
                teamsData: teamsData,
                season: 1,
                isTeamsLoaded: false,
                schedule: [],
                standings: standingsData
            });
        } else {
            // 完整生成模式：包含球队、球员、赛程
            const league = new League({
                level: level,
                teams: [],
                season: 1,
                isTeamsLoaded: false
            });
            
            // 生成球队
            league.teams = this.generateTeamsForLeague(level);
            
            // 标记球队已加载
            league.isTeamsLoaded = true;
            
            // 生成赛程
            league.generateSchedule();
            
            // 初始化积分榜
            league.initStandings();
            
            return league;
        }
    },

    // 生成转会市场球员
    generateTransferMarket(leagueLevel, count = 10) {
        const players = [];
        for (let i = 0; i < count; i++) {
            const positions = ['GK', 'DEF', 'MID', 'FWD'];
            const pos = positions[Math.floor(Math.random() * positions.length)];
            // 转会市场球员能力略高于当前联赛平均水平
            const player = this.generatePlayer(pos, Math.max(1, leagueLevel - 1));
            players.push(player);
        }
        return players;
    }
};

// ========================================
// 存储模块
// ========================================
const Storage = {
    save(data) {
        try {
            const saveData = {
                ...data,
                playerTeam: data.playerTeam ? data.playerTeam.toJSON() : null,
                leagues: data.leagues ? data.leagues.map(l => l.toJSON ? l.toJSON() : l) : [],
                transferMarket: data.transferMarket ? data.transferMarket.map(p => p.toJSON ? p.toJSON() : p) : [],
                lastSaveTime: Date.now()
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(saveData));
            console.log('游戏已保存');
            return true;
        } catch (error) {
            console.error('保存游戏失败:', error);
            return false;
        }
    },

    load() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!data) return null;

            const parsed = JSON.parse(data);
            
            // 重建对象实例
            if (parsed.playerTeam) {
                parsed.playerTeam = new Team(parsed.playerTeam);
                parsed.playerTeam.players = parsed.playerTeam.players.map(p => new Player(p));
            }

            if (parsed.leagues) {
                parsed.leagues = parsed.leagues.map(l => {
                    const league = new League(l);
                    league.teams = l.teams.map(t => {
                        const team = new Team(t);
                        team.players = t.players.map(p => new Player(p));
                        return team;
                    });
                    return league;
                });
            }

            if (parsed.transferMarket) {
                parsed.transferMarket = parsed.transferMarket.map(p => new Player(p));
            }

            parsed.isInitialized = true;
            return parsed;
        } catch (error) {
            console.error('加载游戏失败:', error);
            return null;
        }
    },

    clear() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    },

    hasSave() {
        return localStorage.getItem(CONFIG.STORAGE_KEY) !== null;
    },

    // 自动保存
    autoSave: null,

    startAutoSave() {
        if (this.autoSave) {
            clearInterval(this.autoSave);
        }
        this.autoSave = setInterval(() => {
            if (gameState.isInitialized) {
                this.save(gameState);
            }
        }, CONFIG.AUTO_SAVE_INTERVAL);
    },

    stopAutoSave() {
        if (this.autoSave) {
            clearInterval(this.autoSave);
            this.autoSave = null;
        }
    }
};

// ========================================
// 导航模块
// ========================================
const Navigation = {
    currentPage: 'home',
    
    init() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });
    },
    
    navigateTo(pageName) {
        // 更新按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageName) {
                btn.classList.add('active');
            }
        });
        
        // 更新页面显示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        this.currentPage = pageName;
        
        // 触发页面加载事件
        this.onPageLoad(pageName);
    },
    
    onPageLoad(pageName) {
        switch (pageName) {
            case 'team':
                TeamModule.render();
                break;
            case 'transfer':
                TransferModule.render();
                break;
            case 'match':
                MatchModule.render();
                break;
            case 'league':
                LeagueModule.render();
                break;
        }
    }
};

// ========================================
// 球队模块
// ========================================
const TeamModule = {
    // 排序状态
    sortBy: 'position', // 默认按位置排序
    sortOrder: 'asc',   // 升序
    
    render() {
        if (!gameState.isInitialized) {
            document.getElementById('team-details').innerHTML = '<p>请先开始新游戏</p>';
            document.getElementById('squad-list').innerHTML = '<p>暂无球员数据</p>';
            document.getElementById('lineup-validation').innerHTML = '';
            ['GK', 'DEF', 'MID', 'FWD'].forEach(pos => {
                const el = document.getElementById(`lineup-${pos.toLowerCase()}`);
                if (el) el.innerHTML = '';
            });
            return;
        }
        
        this.renderTeamInfo();
        this.renderLineup();
        this.renderSquad();
    },
    
    renderTeamInfo() {
        const team = gameState.playerTeam;
        const players = team.players;
        const startingLineup = team.startingLineup;
        
        // 计算各位置球员数量
        const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        const startingCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        
        players.forEach(p => {
            positionCounts[p.position]++;
            if (startingLineup.includes(p.id)) {
                startingCounts[p.position]++;
            }
        });
        
        // 计算首发阵容平均能力
        const startingPlayers = startingLineup.map(id => players.find(p => p.id === id)).filter(p => p);
        const avgStartingAbility = startingPlayers.length > 0 
            ? Math.floor(startingPlayers.reduce((sum, p) => sum + p.ability, 0) / startingPlayers.length) 
            : 0;
        
        // 计算替补球员平均能力
        const benchPlayers = players.filter(p => !startingLineup.includes(p.id));
        const avgBenchAbility = benchPlayers.length > 0 
            ? Math.floor(benchPlayers.reduce((sum, p) => sum + p.ability, 0) / benchPlayers.length) 
            : 0;
        
        // 计算平均年龄
        const avgAge = players.length > 0 
            ? Math.floor(players.reduce((sum, p) => sum + p.age, 0) / players.length) 
            : 0;
        
        // 计算周薪总和
        const totalWage = players.reduce((sum, p) => sum + p.wage, 0);
        
        const detailsHtml = `
            <h3>${team.name}</h3>
            <div class="team-stats-grid">
                <div class="stat-item">
                    <span class="stat-label">资金</span>
                    <span class="stat-value">¥${team.funds.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">球队身价</span>
                    <span class="stat-value">¥${team.getTeamValue().toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">首发实力</span>
                    <span class="stat-value">${avgStartingAbility}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">替补实力</span>
                    <span class="stat-value">${avgBenchAbility}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">球员数量</span>
                    <span class="stat-value">${players.length}人</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">平均年龄</span>
                    <span class="stat-value">${avgAge}岁</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">周薪支出</span>
                    <span class="stat-value">¥${totalWage.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">当前联赛</span>
                    <span class="stat-value">第${gameState.currentLeagueLevel}级</span>
                </div>
            </div>
            <div class="position-stats">
                <div class="position-stat">
                    <span class="position-name">门将</span>
                    <span class="position-count">${startingCounts.GK}/${positionCounts.GK}人</span>
                </div>
                <div class="position-stat">
                    <span class="position-name">后卫</span>
                    <span class="position-count">${startingCounts.DEF}/${positionCounts.DEF}人</span>
                </div>
                <div class="position-stat">
                    <span class="position-name">中场</span>
                    <span class="position-count">${startingCounts.MID}/${positionCounts.MID}人</span>
                </div>
                <div class="position-stat">
                    <span class="position-name">前锋</span>
                    <span class="position-count">${startingCounts.FWD}/${positionCounts.FWD}人</span>
                </div>
            </div>
        `;
        document.getElementById('team-details').innerHTML = detailsHtml;
    },
    
    // 渲染首发阵容可视化
    renderLineup() {
        const team = gameState.playerTeam;
        const startingLineup = team.startingLineup;
        
        // 渲染各位置的首发球员
        ['GK', 'DEF', 'MID', 'FWD'].forEach(pos => {
            const el = document.getElementById(`lineup-${pos.toLowerCase()}`);
            if (!el) return;
            
            const posPlayers = startingLineup.map(id => 
                team.players.find(p => p.id === id && p.position === pos)
            ).filter(p => p);
            
            const html = posPlayers.map(player => `
                <div class="lineup-player-card" data-player-id="${player.id}" onclick="TeamModule.toggleLineup('${player.id}')">
                    <span class="lineup-player-name">${player.name}</span>
                    <span class="lineup-player-ability">${player.ability}</span>
                </div>
            `).join('');
            
            el.innerHTML = html;
        });
        
        // 渲染阵容验证信息
        this.renderLineupValidation();
    },
    
    // 渲染阵容验证状态
    renderLineupValidation() {
        const team = gameState.playerTeam;
        const startingLineup = team.startingLineup;
        
        // 计算各位置首发人数
        const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        startingLineup.forEach(id => {
            const player = team.players.find(p => p.id === id);
            if (player) counts[player.position]++;
        });
        
        const total = startingLineup.length;
        const isValid = this.validateLineup(counts, total);
        
        const validationHtml = `
            <div class="validation-status ${isValid ? 'valid' : 'invalid'}">
                <span class="validation-icon">${isValid ? '✅' : '⚠️'}</span>
                <span class="validation-text">
                    首发阵容: ${total}/11人 
                    | 门将: ${counts.GK}/1 
                    | 后卫: ${counts.DEF} (最少3) 
                    | 中场: ${counts.MID} (最少2) 
                    | 前锋: ${counts.FWD} (最少1)
                </span>
            </div>
        `;
        document.getElementById('lineup-validation').innerHTML = validationHtml;
    },
    
    // 验证阵容是否符合规则
    validateLineup(counts, total) {
        // 首发阵容必须11人
        if (total !== 11) return false;
        // 必须有1名门将
        if (counts.GK !== 1) return false;
        // 至少3名后卫
        if (counts.DEF < 3) return false;
        // 至少2名中场
        if (counts.MID < 2) return false;
        // 至少1名前锋
        if (counts.FWD < 1) return false;
        return true;
    },
    
    // 切换球员首发/替补状态
    toggleLineup(playerId) {
        const team = gameState.playerTeam;
        const player = team.players.find(p => p.id === playerId);
        if (!player) return;
        
        const isCurrentlyStarting = team.startingLineup.includes(playerId);
        
        if (isCurrentlyStarting) {
            // 从首发移除
            team.startingLineup = team.startingLineup.filter(id => id !== playerId);
        } else {
            // 添加到首发
            // 检查是否已经有11人首发
            if (team.startingLineup.length >= 11) {
                alert('首发阵容最多11人！请先移除一名球员。');
                return;
            }
            
            // 检查门将限制（只能有1名门将首发）
            if (player.position === 'GK') {
                const currentGKCount = team.startingLineup.filter(id => {
                    const p = team.players.find(pl => pl.id === id);
                    return p && p.position === 'GK';
                }).length;
                if (currentGKCount >= 1) {
                    alert('首发阵容只能有1名门将！请先移除现有门将。');
                    return;
                }
            }
            
            team.startingLineup.push(playerId);
        }
        
        // 保存游戏
        Storage.save(gameState);
        
        // 重新渲染
        this.render();
    },
    
    // 排序球员列表
    sortPlayers(players) {
        const sortedPlayers = [...players];
        const positionOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'FWD': 4 };
        
        sortedPlayers.sort((a, b) => {
            let comparison = 0;
            
            if (this.sortBy === 'position') {
                comparison = positionOrder[a.position] - positionOrder[b.position];
            } else if (this.sortBy === 'ability') {
                comparison = b.ability - a.ability; // 能力值默认降序（高的在前）
            } else if (this.sortBy === 'age') {
                comparison = a.age - b.age;
            } else if (this.sortBy === 'value') {
                comparison = b.value - a.value; // 身价默认降序
            }
            
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return sortedPlayers;
    },
    
    // 切换排序方式
    toggleSort(sortBy) {
        if (this.sortBy === sortBy) {
            // 如果点击当前排序字段，切换排序方向
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // 切换排序字段
            this.sortBy = sortBy;
            // 位置和年龄默认升序，能力值和身价默认降序
            this.sortOrder = (sortBy === 'ability' || sortBy === 'value') ? 'desc' : 'asc';
        }
        this.renderSquad();
    },
    
    renderSquad() {
        const players = gameState.playerTeam.players;
        const startingLineup = gameState.playerTeam.startingLineup;
        
        // 添加排序控制栏
        const sortControlsHtml = `
            <div class="sort-controls">
                <span class="sort-label">排序方式:</span>
                <button class="sort-btn ${this.sortBy === 'position' ? 'active' : ''}" onclick="TeamModule.toggleSort('position')">
                    位置 ${this.sortBy === 'position' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button class="sort-btn ${this.sortBy === 'ability' ? 'active' : ''}" onclick="TeamModule.toggleSort('ability')">
                    能力值 ${this.sortBy === 'ability' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button class="sort-btn ${this.sortBy === 'age' ? 'active' : ''}" onclick="TeamModule.toggleSort('age')">
                    年龄 ${this.sortBy === 'age' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button class="sort-btn ${this.sortBy === 'value' ? 'active' : ''}" onclick="TeamModule.toggleSort('value')">
                    身价 ${this.sortBy === 'value' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                </button>
            </div>
            <div class="lineup-tip">💡 点击球员卡片可切换首发/替补状态</div>
        `;
        
        // 排序后的球员列表
        const sortedPlayers = this.sortPlayers(players);
        
        const playersHtml = sortedPlayers.map(player => {
            const isStarting = startingLineup.includes(player.id);
            return `
                <div class="player-card ${isStarting ? 'starting' : ''}" onclick="TeamModule.toggleLineup('${player.id}')">
                    <div class="player-card-header">
                        <h4>${player.name}</h4>
                        <span class="player-badge ${isStarting ? 'badge-starting' : 'badge-sub'}">
                            ${isStarting ? '首发' : '替补'}
                        </span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">位置:</span>
                        <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">能力值:</span>
                        <span class="player-info-value ability-value">${player.ability}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">年龄:</span>
                        <span class="player-info-value">${player.age}岁</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">身价:</span>
                        <span class="player-info-value">¥${player.value.toLocaleString()}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">周薪:</span>
                        <span class="player-info-value">¥${player.wage.toLocaleString()}</span>
                    </div>
                    <div class="player-stats-mini">
                        <span>进球: ${player.goals || 0}</span>
                        <span>助攻: ${player.assists || 0}</span>
                        <span>出场: ${player.appearances || 0}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('squad-list').innerHTML = sortControlsHtml + playersHtml;
    },
    
    // 显示球员详情弹窗
    showPlayerDetail(playerId) {
        const player = gameState.playerTeam.players.find(p => p.id === playerId);
        if (!player) return;
        
        const isStarting = gameState.playerTeam.startingLineup.includes(playerId);
        
        // 计算球员统计数据
        const statsHtml = `
            <div class="player-stat">
                <span class="stat-label">出场次数:</span>
                <span class="stat-value">${player.appearances || 0}场</span>
            </div>
            <div class="player-stat">
                <span class="stat-label">进球数:</span>
                <span class="stat-value">${player.goals || 0}个</span>
            </div>
            <div class="player-stat">
                <span class="stat-label">助攻数:</span>
                <span class="stat-value">${player.assists || 0}个</span>
            </div>
        `;
        
        const detailHtml = `
            <div class="modal-overlay" onclick="TeamModule.closePlayerDetail()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>${player.name} ${isStarting ? '⭐ 首发' : ''}</h2>
                        <button class="modal-close" onclick="TeamModule.closePlayerDetail()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="player-detail-section">
                            <h3>基本信息</h3>
                            <div class="player-detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">位置</span>
                                    <span class="detail-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">能力值</span>
                                    <span class="detail-value ability-badge">${player.ability}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">年龄</span>
                                    <span class="detail-value">${player.age}岁</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">身价</span>
                                    <span class="detail-value">¥${player.value.toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">周薪</span>
                                    <span class="detail-value">¥${player.wage.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div class="player-detail-section">
                            <h3>赛季数据</h3>
                            <div class="player-stats-grid">
                                ${statsHtml}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="TeamModule.closePlayerDetail()">关闭</button>
                        <button class="btn btn-danger" onclick="TeamModule.sellPlayer('${playerId}')">出售球员</button>
                    </div>
                </div>
            </div>
        `;
        
        // 创建弹窗容器
        const modalContainer = document.getElementById('player-modal');
        if (!modalContainer) {
            const container = document.createElement('div');
            container.id = 'player-modal';
            document.body.appendChild(container);
        }
        
        document.getElementById('player-modal').innerHTML = detailHtml;
    },
    
    // 关闭球员详情弹窗
    closePlayerDetail() {
        const modalContainer = document.getElementById('player-modal');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }
    },
    
    // 出售球员
    sellPlayer(playerId) {
        const player = gameState.playerTeam.players.find(p => p.id === playerId);
        if (!player) return;
        
        // 检查是否是首发球员
        const isStarting = gameState.playerTeam.startingLineup.includes(playerId);
        
        // 检查阵容最小人数限制
        const positionCount = gameState.playerTeam.players.filter(p => p.position === player.position).length;
        const minRequired = CONFIG.SQUAD_MIN_PLAYERS[player.position];
        
        if (positionCount <= minRequired) {
            alert(`无法出售！${CONFIG.POSITION_NAMES[player.position]}位置至少需要保留${minRequired}名球员。`);
            return;
        }
        
        // 确认出售
        const confirmMsg = `确定要出售 ${player.name} 吗？\n出售价格: ¥${player.value.toLocaleString()}\n这将增加你的球队资金。`;
        if (!confirm(confirmMsg)) return;
        
        // 执行出售
        gameState.playerTeam.funds += player.value;
        
        // 从球员列表中移除
        const playerIndex = gameState.playerTeam.players.findIndex(p => p.id === playerId);
        if (playerIndex > -1) {
            gameState.playerTeam.players.splice(playerIndex, 1);
        }
        
        // 从首发阵容中移除
        if (isStarting) {
            const lineupIndex = gameState.playerTeam.startingLineup.indexOf(playerId);
            if (lineupIndex > -1) {
                gameState.playerTeam.startingLineup.splice(lineupIndex, 1);
                // 自动补充首发球员
                const samePositionPlayers = gameState.playerTeam.players.filter(p => p.position === player.position);
                if (samePositionPlayers.length > 0) {
                    // 选择能力值最高的球员补充
                    const replacement = samePositionPlayers.sort((a, b) => b.ability - a.ability)[0];
                    gameState.playerTeam.startingLineup.push(replacement.id);
                }
            }
        }
        
        // 保存游戏
        Storage.save(gameState);
        
        // 关闭弹窗
        this.closePlayerDetail();
        
        // 刷新显示
        this.render();
        
        alert(`成功出售 ${player.name}！获得 ¥${player.value.toLocaleString()}`);
    }
};

// ========================================
// 转会模块
// ========================================
const TransferModule = {
    // 当前筛选状态
    filters: {
        position: 'all',
        ability: 'all',
        sort: 'ability-desc'
    },
    
    // 当前选中的球员（用于购买/出售确认）
    selectedPlayer: null,
    selectedPlayerIndex: null,
    selectedSellPlayer: null,
    selectedSellPlayerIndex: null,
    
    render() {
        if (!gameState.isInitialized) {
            document.getElementById('transfer-list').innerHTML = '<p>请先开始新游戏</p>';
            document.getElementById('sell-list').innerHTML = '<p>请先开始新游戏</p>';
            document.getElementById('transfer-funds-value').textContent = '¥0';
            return;
        }
        
        // 更新资金显示
        document.getElementById('transfer-funds-value').textContent = `¥${gameState.playerTeam.funds.toLocaleString()}`;
        
        // 初始化筛选器事件
        this.initFilters();
        
        // 渲染转会市场和出售列表
        this.renderTransferMarket();
        this.renderSellList();
    },
    
    initFilters() {
        // 位置筛选
        const positionFilter = document.getElementById('position-filter');
        if (positionFilter && !positionFilter.hasAttribute('data-initialized')) {
            positionFilter.addEventListener('change', (e) => {
                this.filters.position = e.target.value;
                this.renderTransferMarket();
            });
            positionFilter.setAttribute('data-initialized', 'true');
        }
        
        // 能力值筛选
        const abilityFilter = document.getElementById('ability-filter');
        if (abilityFilter && !abilityFilter.hasAttribute('data-initialized')) {
            abilityFilter.addEventListener('change', (e) => {
                this.filters.ability = e.target.value;
                this.renderTransferMarket();
            });
            abilityFilter.setAttribute('data-initialized', 'true');
        }
        
        // 排序筛选
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter && !sortFilter.hasAttribute('data-initialized')) {
            sortFilter.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.renderTransferMarket();
            });
            sortFilter.setAttribute('data-initialized', 'true');
        }
        
        // 刷新市场按钮
        const refreshBtn = document.getElementById('refresh-market-btn');
        if (refreshBtn && !refreshBtn.hasAttribute('data-initialized')) {
            refreshBtn.addEventListener('click', () => {
                this.refreshMarket();
            });
            refreshBtn.setAttribute('data-initialized', 'true');
        }
        
        // 购买确认按钮
        const buyConfirmBtn = document.getElementById('buy-confirm-btn');
        if (buyConfirmBtn && !buyConfirmBtn.hasAttribute('data-initialized')) {
            buyConfirmBtn.addEventListener('click', () => {
                this.confirmBuy();
            });
            buyConfirmBtn.setAttribute('data-initialized', 'true');
        }
        
        // 购买取消按钮
        const buyCancelBtn = document.getElementById('buy-cancel-btn');
        if (buyCancelBtn && !buyCancelBtn.hasAttribute('data-initialized')) {
            buyCancelBtn.addEventListener('click', () => {
                this.closeBuyModal();
            });
            buyCancelBtn.setAttribute('data-initialized', 'true');
        }
        
        // 出售确认按钮
        const sellConfirmBtn = document.getElementById('sell-confirm-btn');
        if (sellConfirmBtn && !sellConfirmBtn.hasAttribute('data-initialized')) {
            sellConfirmBtn.addEventListener('click', () => {
                this.confirmSell();
            });
            sellConfirmBtn.setAttribute('data-initialized', 'true');
        }
        
        // 出售取消按钮
        const sellCancelBtn = document.getElementById('sell-cancel-btn');
        if (sellCancelBtn && !sellCancelBtn.hasAttribute('data-initialized')) {
            sellCancelBtn.addEventListener('click', () => {
                this.closeSellModal();
            });
            sellCancelBtn.setAttribute('data-initialized', 'true');
        }
    },
    
    // 获取筛选和排序后的球员列表
    getFilteredPlayers() {
        let players = [...gameState.transferMarket];
        
        // 位置筛选
        if (this.filters.position !== 'all') {
            players = players.filter(p => p.position === this.filters.position);
        }
        
        // 能力值筛选
        if (this.filters.ability !== 'all') {
            switch (this.filters.ability) {
                case 'high':
                    players = players.filter(p => p.ability >= 80);
                    break;
                case 'medium':
                    players = players.filter(p => p.ability >= 60 && p.ability < 80);
                    break;
                case 'low':
                    players = players.filter(p => p.ability < 60);
                    break;
            }
        }
        
        // 排序
        switch (this.filters.sort) {
            case 'ability-desc':
                players.sort((a, b) => b.ability - a.ability);
                break;
            case 'ability-asc':
                players.sort((a, b) => a.ability - b.ability);
                break;
            case 'value-desc':
                players.sort((a, b) => b.value - a.value);
                break;
            case 'value-asc':
                players.sort((a, b) => a.value - b.value);
                break;
            case 'age-asc':
                players.sort((a, b) => a.age - b.age);
                break;
            case 'age-desc':
                players.sort((a, b) => b.age - a.age);
                break;
        }
        
        return players;
    },
    
    renderTransferMarket() {
        // 如果转会市场为空，生成新球员
        if (gameState.transferMarket.length === 0) {
            gameState.transferMarket = DataGenerator.generateTransferMarket(gameState.currentLeagueLevel, 15);
        }
        
        const filteredPlayers = this.getFilteredPlayers();
        
        if (filteredPlayers.length === 0) {
            document.getElementById('transfer-list').innerHTML = '<p class="message message-warning">没有符合条件的球员</p>';
            return;
        }
        
        const funds = gameState.playerTeam.funds;
        
        const html = filteredPlayers.map((player) => {
            // 找到球员在原始数组中的索引
            const originalIndex = gameState.transferMarket.findIndex(p => p.id === player.id);
            const canAfford = funds >= player.value;
            
            return `
                <div class="player-card ${canAfford ? '' : 'insufficient'}">
                    <h4>${player.name}</h4>
                    <div class="player-info">
                        <span class="player-info-label">位置:</span>
                        <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">能力值:</span>
                        <span class="player-info-value">${player.ability}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">年龄:</span>
                        <span class="player-info-value">${player.age}岁</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">身价:</span>
                        <span class="player-info-value">¥${player.value.toLocaleString()}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">周薪:</span>
                        <span class="player-info-value">¥${player.wage.toLocaleString()}</span>
                    </div>
                    ${canAfford ? '' : '<p class="insufficient-funds">⚠️ 资金不足</p>'}
                    <div class="player-card-actions">
                        <button class="btn btn-primary ${canAfford ? '' : 'disabled'}" 
                                onclick="TransferModule.showBuyModal(${originalIndex})"
                                ${canAfford ? '' : 'disabled'}>
                            💰 购买
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('transfer-list').innerHTML = html;
    },
    
    // 计算球员出售价格（基于能力值和年龄）
    calculateSellPrice(player) {
        // 出售价格 = 身价 * 折扣系数（0.7-0.9）
        // 年龄越大折扣越高
        let discountFactor = 0.85;
        if (player.age >= 30) {
            discountFactor = 0.7;
        } else if (player.age >= 28) {
            discountFactor = 0.75;
        } else if (player.age >= 25) {
            discountFactor = 0.8;
        }
        return Math.floor(player.value * discountFactor);
    },
    
    renderSellList() {
        const players = gameState.playerTeam.players;
        const startingLineup = gameState.playerTeam.startingLineup;
        
        if (players.length === 0) {
            document.getElementById('sell-list').innerHTML = '<p class="message message-info">球队暂无球员</p>';
            return;
        }
        
        // 检查是否可以出售（需要保留最低阵容人数）
        const positionCounts = {
            'GK': players.filter(p => p.position === 'GK').length,
            'DEF': players.filter(p => p.position === 'DEF').length,
            'MID': players.filter(p => p.position === 'MID').length,
            'FWD': players.filter(p => p.position === 'FWD').length
        };
        
        const html = players.map((player, index) => {
            const isStarting = startingLineup.includes(player.id);
            const sellPrice = this.calculateSellPrice(player);
            const canSell = positionCounts[player.position] > CONFIG.SQUAD_MIN_PLAYERS[player.position];
            
            return `
                <div class="player-card ${isStarting ? 'starting' : ''}">
                    <h4>${player.name} ${isStarting ? '⭐' : ''}</h4>
                    <div class="player-info">
                        <span class="player-info-label">位置:</span>
                        <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">能力值:</span>
                        <span class="player-info-value">${player.ability}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">年龄:</span>
                        <span class="player-info-value">${player.age}岁</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">身价:</span>
                        <span class="player-info-value">¥${player.value.toLocaleString()}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">出售价格:</span>
                        <span class="sell-price">¥${sellPrice.toLocaleString()}</span>
                    </div>
                    ${!canSell ? `<p class="insufficient-funds">⚠️ 该位置球员不足，无法出售</p>` : ''}
                    <div class="player-card-actions">
                        <button class="btn btn-success ${canSell ? '' : 'disabled'}" 
                                onclick="TransferModule.showSellModal(${index})"
                                ${canSell ? '' : 'disabled'}>
                            💵 出售
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('sell-list').innerHTML = html;
    },
    
    // 刷新转会市场
    refreshMarket() {
        gameState.transferMarket = DataGenerator.generateTransferMarket(gameState.currentLeagueLevel, 15);
        Storage.save(gameState);
        this.renderTransferMarket();
    },
    
    // 显示购买确认模态框
    showBuyModal(index) {
        const player = gameState.transferMarket[index];
        if (!player) return;
        
        this.selectedPlayer = player;
        this.selectedPlayerIndex = index;
        
        const funds = gameState.playerTeam.funds;
        const remainingFunds = funds - player.value;
        
        document.getElementById('buy-modal-title').textContent = '购买球员确认';
        document.getElementById('buy-modal-player-info').innerHTML = `
            <div class="details-card">
                <h4 style="text-align: center; color: var(--primary-color);">${player.name}</h4>
                <div class="player-info">
                    <span class="player-info-label">位置:</span>
                    <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">能力值:</span>
                    <span class="player-info-value">${player.ability}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">年龄:</span>
                    <span class="player-info-value">${player.age}岁</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">购买价格:</span>
                    <span class="player-info-value" style="color: var(--accent-color); font-weight: bold;">¥${player.value.toLocaleString()}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">周薪:</span>
                    <span class="player-info-value">¥${player.wage.toLocaleString()}</span>
                </div>
                <hr style="margin: 1rem 0; border-color: var(--border-color);">
                <div class="player-info">
                    <span class="player-info-label">当前资金:</span>
                    <span class="player-info-value">¥${funds.toLocaleString()}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">购买后剩余:</span>
                    <span class="player-info-value" style="color: ${remainingFunds >= 0 ? 'var(--success-color)' : 'var(--accent-color)'};">
                        ¥${remainingFunds.toLocaleString()}
                    </span>
                </div>
            </div>
        `;
        
        document.getElementById('buy-modal').classList.add('active');
    },
    
    // 关闭购买模态框
    closeBuyModal() {
        document.getElementById('buy-modal').classList.remove('active');
        this.selectedPlayer = null;
        this.selectedPlayerIndex = null;
    },
    
    // 确认购买
    confirmBuy() {
        if (!this.selectedPlayer || this.selectedPlayerIndex === null) return;
        
        const player = this.selectedPlayer;
        const index = this.selectedPlayerIndex;
        
        if (gameState.playerTeam.funds >= player.value) {
            // 扣除资金
            gameState.playerTeam.funds -= player.value;
            
            // 球员加入球队
            gameState.playerTeam.players.push(player);
            
            // 从转会市场移除
            gameState.transferMarket.splice(index, 1);
            
            // 保存游戏
            Storage.save(gameState);
            
            // 关闭模态框
            this.closeBuyModal();
            
            // 更新显示
            this.render();
            TeamModule.render();
            
            // 显示成功消息
            this.showMessage(`成功签下 ${player.name}！花费 ¥${player.value.toLocaleString()}`, 'success');
        } else {
            this.showMessage('资金不足，无法购买！', 'error');
        }
    },
    
    // 显示出售确认模态框
    showSellModal(index) {
        const player = gameState.playerTeam.players[index];
        if (!player) return;
        
        this.selectedSellPlayer = player;
        this.selectedSellPlayerIndex = index;
        
        const sellPrice = this.calculateSellPrice(player);
        const funds = gameState.playerTeam.funds;
        const newFunds = funds + sellPrice;
        
        document.getElementById('sell-modal-title').textContent = '出售球员确认';
        document.getElementById('sell-modal-player-info').innerHTML = `
            <div class="details-card">
                <h4 style="text-align: center; color: var(--primary-color);">${player.name}</h4>
                <div class="player-info">
                    <span class="player-info-label">位置:</span>
                    <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">能力值:</span>
                    <span class="player-info-value">${player.ability}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">年龄:</span>
                    <span class="player-info-value">${player.age}岁</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">身价:</span>
                    <span class="player-info-value">¥${player.value.toLocaleString()}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">出售价格:</span>
                    <span class="player-info-value" style="color: var(--success-color); font-weight: bold;">¥${sellPrice.toLocaleString()}</span>
                </div>
                <hr style="margin: 1rem 0; border-color: var(--border-color);">
                <div class="player-info">
                    <span class="player-info-label">当前资金:</span>
                    <span class="player-info-value">¥${funds.toLocaleString()}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">出售后资金:</span>
                    <span class="player-info-value" style="color: var(--success-color); font-weight: bold;">
                        ¥${newFunds.toLocaleString()}
                    </span>
                </div>
            </div>
        `;
        
        document.getElementById('sell-modal').classList.add('active');
    },
    
    // 关闭出售模态框
    closeSellModal() {
        document.getElementById('sell-modal').classList.remove('active');
        this.selectedSellPlayer = null;
        this.selectedSellPlayerIndex = null;
    },
    
    // 确认出售
    confirmSell() {
        if (!this.selectedSellPlayer || this.selectedSellPlayerIndex === null) return;
        
        const player = this.selectedSellPlayer;
        const index = this.selectedSellPlayerIndex;
        const sellPrice = this.calculateSellPrice(player);
        
        // 检查是否可以出售（保留最低阵容人数）
        const positionCount = gameState.playerTeam.players.filter(p => p.position === player.position).length;
        if (positionCount <= CONFIG.SQUAD_MIN_PLAYERS[player.position]) {
            this.showMessage(`该位置球员不足，无法出售！需要保留至少 ${CONFIG.SQUAD_MIN_PLAYERS[player.position]} 名${CONFIG.POSITION_NAMES[player.position]}`, 'error');
            return;
        }
        
        // 增加资金
        gameState.playerTeam.funds += sellPrice;
        
        // 如果球员在首发阵容中，先移除
        const lineupIndex = gameState.playerTeam.startingLineup.indexOf(player.id);
        if (lineupIndex !== -1) {
            gameState.playerTeam.startingLineup.splice(lineupIndex, 1);
        }
        
        // 从球队移除球员
        gameState.playerTeam.players.splice(index, 1);
        
        // 保存游戏
        Storage.save(gameState);
        
        // 关闭模态框
        this.closeSellModal();
        
        // 更新显示
        this.render();
        TeamModule.render();
        
        // 显示成功消息
        this.showMessage(`成功出售 ${player.name}！获得 ¥${sellPrice.toLocaleString()}`, 'success');
    },
    
    // 显示消息提示
    showMessage(text, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = text;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.zIndex = '2000';
        messageDiv.style.animation = 'fadeIn 0.3s ease';
        
        document.body.appendChild(messageDiv);
        
        // 3秒后自动消失
        setTimeout(() => {
            messageDiv.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }, 3000);
    },
    
    // 旧方法保留以兼容
    buyPlayer(index) {
        this.showBuyModal(index);
    }
};

// ========================================
// 比赛引擎
// ========================================
class MatchEngine {
    constructor(homeTeam, awayTeam) {
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.homeScore = 0;
        this.awayScore = 0;
        this.events = [];
        this.homeStats = {
            shots: 0,
            shotsOnTarget: 0,
            possession: 50,
            fouls: 0,
            corners: 0,
            yellowCards: 0,
            redCards: 0
        };
        this.awayStats = {
            shots: 0,
            shotsOnTarget: 0,
            possession: 50,
            fouls: 0,
            corners: 0,
            yellowCards: 0,
            redCards: 0
        };
    }

    // 获取球队首发阵容
    getStartingLineup(team) {
        return team.startingLineup.map(id => 
            team.players.find(p => p.id === id)
        ).filter(p => p);
    }

    // 计算球队进攻能力
    calculateAttackPower(team) {
        const lineup = this.getStartingLineup(team);
        if (lineup.length === 0) return 50;
        
        // 前锋和中场对进攻贡献更大
        const attackers = lineup.filter(p => p.position === 'FWD');
        const midfielders = lineup.filter(p => p.position === 'MID');
        
        let attackPower = 0;
        if (attackers.length > 0) {
            attackPower += attackers.reduce((sum, p) => sum + p.ability, 0) / attackers.length * 0.5;
        }
        if (midfielders.length > 0) {
            attackPower += midfielders.reduce((sum, p) => sum + p.ability, 0) / midfielders.length * 0.3;
        }
        // 其他球员贡献
        const others = lineup.filter(p => p.position !== 'FWD' && p.position !== 'MID');
        if (others.length > 0) {
            attackPower += others.reduce((sum, p) => sum + p.ability, 0) / others.length * 0.2;
        }
        
        return Math.min(200, Math.max(30, attackPower));
    }

    // 计算球队防守能力
    calculateDefensePower(team) {
        const lineup = this.getStartingLineup(team);
        if (lineup.length === 0) return 50;
        
        // 门将和后卫对防守贡献更大
        const goalkeeper = lineup.filter(p => p.position === 'GK');
        const defenders = lineup.filter(p => p.position === 'DEF');
        
        let defensePower = 0;
        if (goalkeeper.length > 0) {
            defensePower += goalkeeper.reduce((sum, p) => sum + p.ability, 0) / goalkeeper.length * 0.4;
        }
        if (defenders.length > 0) {
            defensePower += defenders.reduce((sum, p) => sum + p.ability, 0) / defenders.length * 0.4;
        }
        // 中场贡献
        const midfielders = lineup.filter(p => p.position === 'MID');
        if (midfielders.length > 0) {
            defensePower += midfielders.reduce((sum, p) => sum + p.ability, 0) / midfielders.length * 0.2;
        }
        
        return Math.min(200, Math.max(30, defensePower));
    }

    // 模拟比赛
    simulate() {
        const homeAttack = this.calculateAttackPower(this.homeTeam);
        const awayAttack = this.calculateAttackPower(this.awayTeam);
        const homeDefense = this.calculateDefensePower(this.homeTeam);
        const awayDefense = this.calculateDefensePower(this.awayTeam);
        
        // 主场优势
        const homeBonus = 1.15;
        
        // 计算预期进球数（基于攻防对比）
        const homeExpectedGoals = Math.max(0.3, (homeAttack * homeBonus - awayDefense * 0.5) / 40);
        const awayExpectedGoals = Math.max(0.3, (awayAttack - homeDefense * 0.5) / 40);
        
        // 使用泊松分布生成进球数
        this.homeScore = MatchEngine.poissonRandom(homeExpectedGoals);
        this.awayScore = MatchEngine.poissonRandom(awayExpectedGoals);
        
        // 限制最大比分
        this.homeScore = Math.min(7, this.homeScore);
        this.awayScore = Math.min(7, this.awayScore);
        
        // 生成比赛事件
        this.generateEvents();
        
        // 生成比赛统计数据
        this.generateStats(homeAttack, awayAttack, homeDefense, awayDefense);
        
        return {
            homeScore: this.homeScore,
            awayScore: this.awayScore,
            events: this.events,
            homeStats: this.homeStats,
            awayStats: this.awayStats
        };
    }

    // 泊松分布随机数（静态方法）
    static poissonRandom(lambda) {
        if (lambda <= 0) return 0;
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        return k - 1;
    }

    // 生成比赛事件
    generateEvents() {
        this.events = [];
        
        // 生成进球事件
        this.generateGoalEvents(this.homeTeam, this.awayTeam, this.homeScore, true);
        this.generateGoalEvents(this.awayTeam, this.homeTeam, this.awayScore, false);
        
        // 生成其他事件（犯规、黄牌等）
        this.generateOtherEvents();
        
        // 按时间排序事件
        this.events.sort((a, b) => a.minute - b.minute);
    }

    // 生成进球事件
    generateGoalEvents(scoringTeam, concedingTeam, goals, isHome) {
        if (goals === 0) return;
        
        const lineup = this.getStartingLineup(scoringTeam);
        if (lineup.length === 0) return;
        
        // 根据位置分配进球概率
        const goalProbabilities = {
            'FWD': 0.5,   // 前锋 50%
            'MID': 0.35,  // 中场 35%
            'DEF': 0.14,  // 后卫 14%
            'GK': 0.01    // 门将 1%
        };
        
        // 创建进球球员候选池
        const candidates = [];
        lineup.forEach(player => {
            const prob = goalProbabilities[player.position] || 0.1;
            for (let i = 0; i < prob * 100; i++) {
                candidates.push(player);
            }
        });
        
        // 为每个进球选择进球球员和时间
        const usedMinutes = [];
        for (let i = 0; i < goals; i++) {
            // 随机选择进球球员
            const scorer = candidates[Math.floor(Math.random() * candidates.length)];
            
            // 生成进球时间（避免重复）
            let minute;
            do {
                minute = Math.floor(Math.random() * 90) + 1;
                // 添加一些随机性（上半场补时、下半场补时）
                if (minute === 45 && Math.random() < 0.3) minute += Math.floor(Math.random() * 3) + 1;
                if (minute === 90 && Math.random() < 0.3) minute += Math.floor(Math.random() * 4) + 1;
                minute = Math.min(94, minute);
            } while (usedMinutes.includes(minute) && usedMinutes.length < 90);
            usedMinutes.push(minute);
            
            // 生成助攻球员（50%概率有助攻）
            let assister = null;
            if (Math.random() < 0.5) {
                const assistCandidates = lineup.filter(p => p.id !== scorer.id);
                if (assistCandidates.length > 0) {
                    // 中场球员更容易助攻
                    const midfielders = assistCandidates.filter(p => p.position === 'MID');
                    if (midfielders.length > 0 && Math.random() < 0.6) {
                        assister = midfielders[Math.floor(Math.random() * midfielders.length)];
                    } else {
                        assister = assistCandidates[Math.floor(Math.random() * assistCandidates.length)];
                    }
                }
            }
            
            this.events.push({
                type: 'goal',
                minute: minute,
                team: isHome ? 'home' : 'away',
                teamName: scoringTeam.name,
                player: scorer.name,
                assister: assister ? assister.name : null,
                score: isHome ? 
                    `${this.getCurrentScore('home', i + 1)} - ${this.awayScore}` :
                    `${this.homeScore} - ${this.getCurrentScore('away', i + 1)}`
            });
        }
    }

    // 获取当前比分（用于事件显示）
    getCurrentScore(team, goalsSoFar) {
        if (team === 'home') {
            return goalsSoFar;
        } else {
            return goalsSoFar;
        }
    }

    // 生成其他事件（犯规、黄牌等）
    generateOtherEvents() {
        const totalFouls = Math.floor(Math.random() * 20) + 15; // 15-35次犯规
        const homeFouls = Math.floor(totalFouls * (0.4 + Math.random() * 0.2));
        const awayFouls = totalFouls - homeFouls;
        
        this.homeStats.fouls = homeFouls;
        this.awayStats.fouls = awayFouls;
        
        // 生成黄牌事件（每5-8次犯规可能有1张黄牌）
        const homeYellows = Math.floor(homeFouls / (5 + Math.random() * 3));
        const awayYellows = Math.floor(awayFouls / (5 + Math.random() * 3));
        
        this.homeStats.yellowCards = homeYellows;
        this.awayStats.yellowCards = awayYellows;
        
        // 生成黄牌事件
        this.generateCardEvents(this.homeTeam, homeYellows, 'yellow', true);
        this.generateCardEvents(this.awayTeam, awayYellows, 'yellow', false);
        
        // 红牌概率较低（约5%的比赛有红牌）
        if (Math.random() < 0.05) {
            const isHomeRed = Math.random() < 0.5;
            const team = isHomeRed ? this.homeTeam : this.awayTeam;
            this.generateCardEvents(team, 1, 'red', isHomeRed);
            if (isHomeRed) {
                this.homeStats.redCards = 1;
            } else {
                this.awayStats.redCards = 1;
            }
        }
    }

    // 生成牌事件
    generateCardEvents(team, count, cardType, isHome) {
        if (count === 0) return;
        
        const lineup = this.getStartingLineup(team);
        if (lineup.length === 0) return;
        
        // 后卫和中场更容易吃牌
        const cardCandidates = lineup.filter(p => p.position === 'DEF' || p.position === 'MID');
        const candidates = cardCandidates.length > 0 ? cardCandidates : lineup;
        
        const usedMinutes = this.events.map(e => e.minute);
        
        for (let i = 0; i < count; i++) {
            const player = candidates[Math.floor(Math.random() * candidates.length)];
            
            let minute;
            do {
                minute = Math.floor(Math.random() * 90) + 1;
            } while (usedMinutes.includes(minute));
            usedMinutes.push(minute);
            
            this.events.push({
                type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
                minute: minute,
                team: isHome ? 'home' : 'away',
                teamName: team.name,
                player: player.name
            });
        }
    }

    // 生成比赛统计数据
    generateStats(homeAttack, awayAttack, homeDefense, awayDefense) {
        // 射门数（基于进攻能力）
        const baseShots = 8;
        this.homeStats.shots = Math.floor(baseShots + (homeAttack - 50) / 10 + Math.random() * 5);
        this.awayStats.shots = Math.floor(baseShots + (awayAttack - 50) / 10 + Math.random() * 5);
        
        // 射正数
        this.homeStats.shotsOnTarget = Math.floor(this.homeScore + Math.random() * (this.homeStats.shots / 3));
        this.awayStats.shotsOnTarget = Math.floor(this.awayScore + Math.random() * (this.awayStats.shots / 3));
        
        // 控球率（基于中场实力）
        const homeMidfield = this.calculateMidfieldPower(this.homeTeam);
        const awayMidfield = this.calculateMidfieldPower(this.awayTeam);
        const totalMidfield = homeMidfield + awayMidfield;
        this.homeStats.possession = Math.round((homeMidfield / totalMidfield) * 100);
        this.awayStats.possession = 100 - this.homeStats.possession;
        
        // 角球数
        this.homeStats.corners = Math.floor(Math.random() * 6) + 2;
        this.awayStats.corners = Math.floor(Math.random() * 6) + 2;
    }

    // 计算中场实力
    calculateMidfieldPower(team) {
        const lineup = this.getStartingLineup(team);
        const midfielders = lineup.filter(p => p.position === 'MID');
        if (midfielders.length === 0) return 50;
        return midfielders.reduce((sum, p) => sum + p.ability, 0) / midfielders.length;
    }

    // 简化模拟方法（用于AI联赛比赛，不生成详细事件）
    static simulateMatchSimple(homeTeam, awayTeam) {
        // 确保球员已加载以获取正确的球队实力
        if (!homeTeam.isPlayersLoaded) {
            homeTeam.loadPlayers();
        }
        if (!awayTeam.isPlayersLoaded) {
            awayTeam.loadPlayers();
        }
        
        // 基于球队实力直接计算比分
        const homeAbility = homeTeam.getTeamAbility();
        const awayAbility = awayTeam.getTeamAbility();
        
        // 计算预期进球（泊松分布参数）
        const homeExpectedGoals = (homeAbility / 150) * 1.5;  // 主场优势
        const awayExpectedGoals = (awayAbility / 150) * 1.0;
        
        // 使用泊松分布生成进球数
        const homeGoals = MatchEngine.poissonRandom(homeExpectedGoals);
        const awayGoals = MatchEngine.poissonRandom(awayExpectedGoals);
        
        return {
            homeTeam: homeTeam.name,
            awayTeam: awayTeam.name,
            homeGoals: homeGoals,
            awayGoals: awayGoals,
            events: []  // 简化模式不生成详细事件
        };
    }
}

// ========================================
// 比赛模块
// ========================================
const MatchModule = {
    currentMatchResult: null,
    
    render() {
        if (!gameState.isInitialized) {
            document.getElementById('match-details').innerHTML = '<p>请先开始新游戏</p>';
            return;
        }
        
        this.renderMatchInfo();
    },
    
    renderMatchInfo() {
        const currentLeague = gameState.leagues.find(l => l.level === gameState.currentLeagueLevel);
        const currentRound = currentLeague ? currentLeague.currentRound : 1;
        
        // 检查赛季是否结束
        if (currentLeague && currentRound > CONFIG.MATCHES_PER_SEASON) {
            const standings = currentLeague.getSortedStandings();
            const playerStanding = standings.find(s => s.teamId === gameState.playerTeam.id);
            const playerPosition = standings.findIndex(s => s.teamId === gameState.playerTeam.id) + 1;
            
            const html = `
                <div class="details-card">
                    <h3>🏆 第${currentLeague.season}赛季已结束</h3>
                    <div class="player-info">
                        <span class="player-info-label">你的排名:</span>
                        <span class="player-info-value">${playerPosition}名</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">战绩:</span>
                        <span class="player-info-value">${playerStanding.won}胜 ${playerStanding.drawn}平 ${playerStanding.lost}负</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">积分:</span>
                        <span class="player-info-value">${playerStanding.points}分</span>
                    </div>
                    <div class="season-result-message mt-2">
                        ${playerPosition <= 3 && gameState.currentLeagueLevel > 1 ? 
                            '<p style="color: var(--success-color);">🎉 恭喜！你将升级到第' + (gameState.currentLeagueLevel - 1) + '级联赛！</p>' : 
                            playerPosition >= 18 && gameState.currentLeagueLevel < CONFIG.LEAGUE_LEVELS ?
                            '<p style="color: var(--accent-color);">😢 遗憾降级到第' + (gameState.currentLeagueLevel + 1) + '级联赛</p>' :
                            '<p style="color: var(--text-light);">继续努力，争取下赛季升级！</p>'
                        }
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-primary btn-large" onclick="MatchModule.processSeasonEnd()">
                            🏆 结算赛季并开始新赛季
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('match-details').innerHTML = html;
            return;
        }
        
        // 获取当前轮次的比赛
        let nextMatch = null;
        if (currentLeague && currentLeague.schedule[currentRound - 1]) {
            const roundMatches = currentLeague.schedule[currentRound - 1].matches;
            nextMatch = roundMatches.find(m => 
                m.homeTeam === gameState.playerTeam.id || m.awayTeam === gameState.playerTeam.id
            );
        }

        let opponentName = '待定';
        let opponentAbility = 0;
        let isHome = true;
        let matchPlayed = false;
        let matchScore = '';
        if (nextMatch) {
            isHome = nextMatch.homeTeam === gameState.playerTeam.id;
            const opponentId = isHome ? nextMatch.awayTeam : nextMatch.homeTeam;
            const opponent = currentLeague.teams.find(t => t.id === opponentId);
            opponentName = opponent ? opponent.name : '未知对手';
            opponentAbility = opponent ? opponent.getTeamAbility() : 50;
            matchPlayed = nextMatch.played;
            if (matchPlayed) {
                const playerScore = isHome ? nextMatch.homeScore : nextMatch.awayScore;
                const oppScore = isHome ? nextMatch.awayScore : nextMatch.homeScore;
                matchScore = `${playerScore} - ${oppScore}`;
            }
        }

        const playerAbility = gameState.playerTeam.getTeamAbility();
        const winChance = this.calculateWinChance(playerAbility, opponentAbility, isHome);

        const html = `
            <div class="details-card">
                <h3>第 ${currentRound} 轮比赛</h3>
                <div class="player-info">
                    <span class="player-info-label">当前赛季:</span>
                    <span class="player-info-value">第${gameState.currentSeason}赛季</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">当前联赛:</span>
                    <span class="player-info-value">第${gameState.currentLeagueLevel}级联赛</span>
                </div>
                <div class="match-preview">
                    <div class="match-team ${isHome ? 'home' : 'away'}">
                        <div class="team-name">${gameState.playerTeam.name}</div>
                        <div class="team-ability">实力: ${playerAbility}</div>
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-team ${isHome ? 'away' : 'home'}">
                        <div class="team-name">${opponentName}</div>
                        <div class="team-ability">实力: ${opponentAbility}</div>
                    </div>
                </div>
                <div class="match-info-extra">
                    <div class="player-info">
                        <span class="player-info-label">比赛场地:</span>
                        <span class="player-info-value">${isHome ? '主场 ⚽' : '客场 ✈️'}</span>
                    </div>
                    ${matchPlayed ? `
                        <div class="player-info">
                            <span class="player-info-label">比分:</span>
                            <span class="player-info-value">${matchScore}</span>
                        </div>
                        <p class="mt-2" style="color: var(--text-light);">本轮比赛已完成</p>
                    ` : `
                        <div class="player-info">
                            <span class="player-info-label">预计胜率:</span>
                            <span class="player-info-value">${winChance}%</span>
                        </div>
                        <div class="mt-3">
                            <button class="btn btn-primary btn-large" onclick="MatchModule.playMatch()">
                                ⚽ 进行比赛
                            </button>
                        </div>
                    `}
                </div>
            </div>
            ${this.renderRoundSchedule(currentLeague, currentRound)}
        `;
        document.getElementById('match-details').innerHTML = html;
    },
    
    renderRoundSchedule(league, round) {
        if (!league || round > CONFIG.MATCHES_PER_SEASON) return '';
        
        const roundData = league.schedule[round - 1];
        if (!roundData) return '';
        
        const matchesHtml = roundData.matches.map(match => {
            const homeTeam = league.teams.find(t => t.id === match.homeTeam);
            const awayTeam = league.teams.find(t => t.id === match.awayTeam);
            const isPlayerMatch = match.homeTeam === gameState.playerTeam.id || match.awayTeam === gameState.playerTeam.id;
            
            return `
                <div class="match-item ${isPlayerMatch ? 'player-match' : ''}">
                    <span class="match-team">${homeTeam ? homeTeam.name : '未知'}</span>
                    <span class="match-score">
                        ${match.played ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                    </span>
                    <span class="match-team">${awayTeam ? awayTeam.name : '未知'}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="details-card mt-2">
                <h4>本轮全部赛程</h4>
                <div class="match-list">
                    ${matchesHtml}
                </div>
            </div>
        `;
    },
    
    calculateWinChance(playerAbility, opponentAbility, isHome) {
        const homeBonus = isHome ? 10 : -10;
        const diff = playerAbility - opponentAbility + homeBonus;
        const winChance = 35 + diff * 0.5;
        return Math.max(5, Math.min(85, Math.round(winChance)));
    },

    playMatch() {
        const currentLeague = gameState.leagues.find(l => l.level === gameState.currentLeagueLevel);
        if (!currentLeague) return;

        const currentRound = currentLeague.currentRound;
        const roundData = currentLeague.schedule[currentRound - 1];
        if (!roundData) {
            alert('本赛季已结束！');
            return;
        }

        // 找到玩家球队的比赛
        const playerMatch = roundData.matches.find(m => 
            m.homeTeam === gameState.playerTeam.id || m.awayTeam === gameState.playerTeam.id
        );

        if (!playerMatch) {
            alert('本轮没有你的比赛！');
            return;
        }

        if (playerMatch.played) {
            alert('本场比赛已进行！');
            return;
        }

        // 获取对手球队
        const isHome = playerMatch.homeTeam === gameState.playerTeam.id;
        const opponentId = isHome ? playerMatch.awayTeam : playerMatch.homeTeam;
        const opponent = currentLeague.teams.find(t => t.id === opponentId);

        // 使用比赛引擎模拟比赛
        const homeTeam = isHome ? gameState.playerTeam : opponent;
        const awayTeam = isHome ? opponent : gameState.playerTeam;
        
        const engine = new MatchEngine(homeTeam, awayTeam);
        const result = engine.simulate();
        
        // 保存比赛结果用于显示
        this.currentMatchResult = {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            events: result.events,
            homeStats: result.homeStats,
            awayStats: result.awayStats,
            isPlayerHome: isHome
        };

        // 更新比赛结果
        playerMatch.homeScore = result.homeScore;
        playerMatch.awayScore = result.awayScore;
        playerMatch.played = true;
        playerMatch.events = result.events;
        playerMatch.homeStats = result.homeStats;
        playerMatch.awayStats = result.awayStats;

        // 更新球员统计数据
        this.updatePlayerStats(result.events, isHome);

        // 更新积分榜
        currentLeague.updateStandings(playerMatch);

        // 模拟本轮其他比赛（所有联赛的AI比赛使用简化模拟）
        this.simulateOtherMatches();

        // 更新轮次
        currentLeague.currentRound++;
        if (currentLeague.currentRound > CONFIG.MATCHES_PER_SEASON) {
            this.endSeason(currentLeague);
        }

        // 保存游戏
        Storage.save(gameState);

        // 显示比赛结果
        this.showMatchResult();
    },

    updatePlayerStats(events, isPlayerHome) {
        events.forEach(event => {
            if (event.type === 'goal') {
                // 找到进球球员
                const playerTeam = (event.team === 'home') === isPlayerHome ? gameState.playerTeam : null;
                if (playerTeam) {
                    const scorer = playerTeam.players.find(p => p.name === event.player);
                    if (scorer) scorer.goals++;
                    
                    // 更新助攻
                    if (event.assister) {
                        const assister = playerTeam.players.find(p => p.name === event.assister);
                        if (assister) assister.assists++;
                    }
                }
            }
        });

        // 更新出场次数
        gameState.playerTeam.startingLineup.forEach(playerId => {
            const player = gameState.playerTeam.players.find(p => p.id === playerId);
            if (player) player.appearances++;
        });
    },

    showMatchResult() {
        const result = this.currentMatchResult;
        if (!result) return;

        const playerScore = result.isPlayerHome ? result.homeScore : result.awayScore;
        const opponentScore = result.isPlayerHome ? result.awayScore : result.homeScore;
        const playerName = gameState.playerTeam.name;
        const opponentName = result.isPlayerHome ? result.awayTeam.name : result.homeTeam.name;

        // 确定比赛结果
        let resultText = '';
        let resultClass = '';
        if (playerScore > opponentScore) {
            resultText = '胜利！🎉';
            resultClass = 'win';
        } else if (playerScore < opponentScore) {
            resultText = '失败 😢';
            resultClass = 'lose';
        } else {
            resultText = '平局 🤝';
            resultClass = 'draw';
        }

        // 生成事件列表HTML
        const eventsHtml = result.events.map(event => {
            let icon = '';
            let text = '';
            switch (event.type) {
                case 'goal':
                    icon = '⚽';
                    text = `${event.player} 进球！${event.assister ? ` (助攻: ${event.assister})` : ''}`;
                    break;
                case 'yellow_card':
                    icon = '🟨';
                    text = `${event.player} 黄牌`;
                    break;
                case 'red_card':
                    icon = '🟥';
                    text = `${event.player} 红牌`;
                    break;
            }
            const teamClass = event.team === 'home' ? 'event-home' : 'event-away';
            return `<div class="match-event ${teamClass}"><span class="event-minute">${event.minute}'</span> ${icon} ${text}</div>`;
        }).join('');

        const html = `
            <div class="match-result-card ${resultClass}">
                <h3>比赛结束 - ${resultText}</h3>
                <div class="match-score-display">
                    <div class="score-team">
                        <div class="team-name">${result.homeTeam.name}</div>
                        <div class="team-score">${result.homeScore}</div>
                    </div>
                    <div class="score-divider">-</div>
                    <div class="score-team">
                        <div class="team-name">${result.awayTeam.name}</div>
                        <div class="team-score">${result.awayScore}</div>
                    </div>
                </div>
            </div>
            
            <div class="details-card">
                <h4>📊 比赛统计</h4>
                <div class="match-stats">
                    <div class="stat-row">
                        <span class="stat-value">${result.homeStats.shots}</span>
                        <span class="stat-label">射门</span>
                        <span class="stat-value">${result.awayStats.shots}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-value">${result.homeStats.shotsOnTarget}</span>
                        <span class="stat-label">射正</span>
                        <span class="stat-value">${result.awayStats.shotsOnTarget}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-value">${result.homeStats.possession}%</span>
                        <span class="stat-label">控球率</span>
                        <span class="stat-value">${result.awayStats.possession}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-value">${result.homeStats.corners}</span>
                        <span class="stat-label">角球</span>
                        <span class="stat-value">${result.awayStats.corners}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-value">${result.homeStats.fouls}</span>
                        <span class="stat-label">犯规</span>
                        <span class="stat-value">${result.awayStats.fouls}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-value">${result.homeStats.yellowCards}</span>
                        <span class="stat-label">黄牌</span>
                        <span class="stat-value">${result.awayStats.yellowCards}</span>
                    </div>
                </div>
            </div>
            
            <div class="details-card">
                <h4>📝 比赛事件</h4>
                <div class="match-events-list">
                    ${eventsHtml || '<p class="no-events">无重大事件</p>'}
                </div>
            </div>
            
            <div class="mt-3">
                <button class="btn btn-primary" onclick="MatchModule.closeMatchResult()">
                    确认
                </button>
            </div>
        `;
        
        document.getElementById('match-details').innerHTML = html;
        LeagueModule.render();
    },

    closeMatchResult() {
        this.currentMatchResult = null;
        this.render();
    },

    simulateOtherMatches() {
        // 遍历所有联赛处理AI比赛
        for (const league of gameState.leagues) {
            const currentRound = league.currentRound;
            
            // 确保联赛数据已加载
            if (!league.isTeamsLoaded) {
                league.loadTeams();
            }
            
            // 检查是否有有效的赛程
            if (currentRound > 0 && league.schedule && league.schedule[currentRound - 1]) {
                const roundData = league.schedule[currentRound - 1];
                
                for (const match of roundData.matches) {
                    if (match.played) continue;
                    
                    // 检查是否是玩家球队的比赛（玩家比赛已在 playMatch 中处理）
                    const isPlayerMatch = match.homeTeam === gameState.playerTeam.id || 
                                          match.awayTeam === gameState.playerTeam.id;
                    if (isPlayerMatch) continue;
                    
                    const homeTeam = league.teams.find(t => t.id === match.homeTeam);
                    const awayTeam = league.teams.find(t => t.id === match.awayTeam);
                    
                    if (!homeTeam || !awayTeam) continue;
                    
                    // AI比赛 - 使用简化模拟（只生成比分，不生成详细事件）
                    const result = MatchEngine.simulateMatchSimple(homeTeam, awayTeam);
                    
                    // 更新比赛结果
                    match.homeScore = result.homeGoals;
                    match.awayScore = result.awayGoals;
                    match.played = true;
                    match.events = [];  // 简化模式不生成详细事件
                    
                    // 更新积分榜
                    league.updateStandings(match);
                }
            }
        }
    },

    endSeason(league) {
        // 这个方法现在由 processSeasonEnd 处理
        // 保留为兼容性方法
    },
    
    processSeasonEnd() {
        // 执行升降级
        const result = this.executePromotionRelegation();
        
        // 开始新赛季
        this.startNewSeason();
        
        // 保存游戏
        Storage.save(gameState);
        
        // 显示结果
        alert(result);
        
        // 刷新界面
        this.render();
        LeagueModule.currentViewLevel = gameState.currentLeagueLevel;
        LeagueModule.render();
        TeamModule.render();
    },
    
    executePromotionRelegation() {
        let resultMessage = `第${gameState.currentSeason}赛季结算完成！\n\n`;
        let playerPromoted = false;
        let playerRelegated = false;
        
        // 确保所有联赛完全加载（懒加载联赛需要先加载才能处理升降级）
        for (const league of gameState.leagues) {
            league.ensureFullLoad();
        }
        
        // 处理每个联赛的升降级（从低级别到高级别处理）
        for (let level = CONFIG.LEAGUE_LEVELS; level >= 1; level--) {
            const league = gameState.leagues.find(l => l.level === level);
            if (!league) continue;
            
            const standings = league.getSortedStandings();
            
            // 获取升降级球队
            const promotionTeams = []; // 升级球队（前3名）
            const relegationTeams = []; // 降级球队（后3名）
            
            // 前3名升级（最高级别除外）
            if (level > 1) {
                for (let i = 0; i < 3; i++) {
                    const teamStanding = standings[i];
                    const team = league.teams.find(t => t.id === teamStanding.teamId);
                    if (team) {
                        promotionTeams.push({
                            team: team,
                            fromLevel: level,
                            toLevel: level - 1,
                            standing: teamStanding
                        });
                        
                        // 检查玩家球队是否升级
                        if (team.isPlayerTeam) {
                            playerPromoted = true;
                            resultMessage += `🎉 你的球队升级到第${level - 1}级联赛！\n`;
                        }
                    }
                }
            }
            
            // 后3名降级（最低级别除外）
            if (level < CONFIG.LEAGUE_LEVELS) {
                for (let i = standings.length - 3; i < standings.length; i++) {
                    const teamStanding = standings[i];
                    const team = league.teams.find(t => t.id === teamStanding.teamId);
                    if (team) {
                        relegationTeams.push({
                            team: team,
                            fromLevel: level,
                            toLevel: level + 1,
                            standing: teamStanding
                        });
                        
                        // 检查玩家球队是否降级
                        if (team.isPlayerTeam) {
                            playerRelegated = true;
                            resultMessage += `😢 你的球队降级到第${level + 1}级联赛！\n`;
                        }
                    }
                }
            }
            
            // 执行球队移动
            // 移除升级球队
            for (const item of promotionTeams) {
                const teamIndex = league.teams.findIndex(t => t.id === item.team.id);
                if (teamIndex !== -1) {
                    league.teams.splice(teamIndex, 1);
                }
                item.team.leagueLevel = item.toLevel;
            }
            
            // 移除降级球队
            for (const item of relegationTeams) {
                const teamIndex = league.teams.findIndex(t => t.id === item.team.id);
                if (teamIndex !== -1) {
                    league.teams.splice(teamIndex, 1);
                }
                item.team.leagueLevel = item.toLevel;
            }
            
            // 将升级球队添加到上一级联赛
            const upperLeague = gameState.leagues.find(l => l.level === level - 1);
            if (upperLeague && promotionTeams.length > 0) {
                for (const item of promotionTeams) {
                    upperLeague.teams.push(item.team);
                }
            }
            
            // 将降级球队添加到下一级联赛
            const lowerLeague = gameState.leagues.find(l => l.level === level + 1);
            if (lowerLeague && relegationTeams.length > 0) {
                for (const item of relegationTeams) {
                    lowerLeague.teams.push(item.team);
                }
            }
        }
        
        // 更新玩家联赛级别并处理懒加载
        const oldLeagueLevel = gameState.currentLeagueLevel;
        if (playerPromoted) {
            const newLeagueLevel = oldLeagueLevel - 1;
            const newLeague = gameState.leagues.find(l => l.level === newLeagueLevel);
            const oldLeague = gameState.leagues.find(l => l.level === oldLeagueLevel);
            
            // SubTask 6.1: 升级时触发新联赛数据生成
            if (newLeague) {
                console.log(`升级到第${newLeagueLevel}级联赛，加载新联赛数据...`);
                newLeague.ensureFullLoad();
            }
            
            // SubTask 6.2: 原联赛懒加载降级
            if (oldLeague) {
                console.log(`原第${oldLeagueLevel}级联赛转为懒加载状态...`);
                oldLeague.toLazyLoad();
            }
            
            gameState.currentLeagueLevel = newLeagueLevel;
        } else if (playerRelegated) {
            const newLeagueLevel = oldLeagueLevel + 1;
            const newLeague = gameState.leagues.find(l => l.level === newLeagueLevel);
            const oldLeague = gameState.leagues.find(l => l.level === oldLeagueLevel);
            
            // 降级时也需要加载新联赛数据
            if (newLeague) {
                console.log(`降级到第${newLeagueLevel}级联赛，加载新联赛数据...`);
                newLeague.ensureFullLoad();
            }
            
            // 原联赛懒加载降级
            if (oldLeague) {
                console.log(`原第${oldLeagueLevel}级联赛转为懒加载状态...`);
                oldLeague.toLazyLoad();
            }
            
            gameState.currentLeagueLevel = newLeagueLevel;
        }
        
        resultMessage += `\n新赛季即将开始！`;
        return resultMessage;
    },
    
    startNewSeason() {
        // 增加赛季数
        gameState.currentSeason++;
        
        // 为每个联赛重新生成赛程和积分榜
        for (const league of gameState.leagues) {
            league.season = gameState.currentSeason;
            league.currentRound = 1;
            
            // 重置球队统计数据
            for (const team of league.teams) {
                team.stats = {
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    points: 0
                };
            }
            
            // 重新生成赛程
            league.generateSchedule();
            league.initStandings();
        }
        
        // 球员年龄增长
        for (const player of gameState.playerTeam.players) {
            player.age++;
            // 重新计算身价（年龄增长可能影响身价）
            player.value = player.calculateValue();
            player.wage = player.calculateWage();
        }
        
        // 更新转会市场
        gameState.transferMarket = DataGenerator.generateTransferMarket(gameState.currentLeagueLevel, 15);
    }
};

// ========================================
// 联赛模块
// ========================================
const LeagueModule = {
    currentViewLevel: null, // 当前查看的联赛级别
    
    render() {
        if (!gameState.isInitialized) {
            document.getElementById('league-table').innerHTML = '<p>请先开始新游戏</p>';
            return;
        }
        
        // 初始化查看级别为玩家当前联赛级别
        if (this.currentViewLevel === null) {
            this.currentViewLevel = gameState.currentLeagueLevel;
        }
        
        this.renderStandings();
    },
    
    renderStandings() {
        const viewLeague = gameState.leagues.find(l => l.level === this.currentViewLevel);
        if (!viewLeague) {
            document.getElementById('league-table').innerHTML = '<p>联赛数据不存在</p>';
            return;
        }

        const standings = viewLeague.getSortedStandings();
        
        // 生成联赛切换按钮
        const leagueButtons = gameState.leagues.map(l => `
            <button class="btn ${l.level === this.currentViewLevel ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="LeagueModule.switchLeague(${l.level})"
                    style="margin: 0.25rem;">
                ${l.name}
            </button>
        `).join('');
        
        // 标记升降级区域
        const getRowClass = (index, isPlayerTeam) => {
            let classes = isPlayerTeam ? 'player-team' : '';
            // 前3名升级区域（绿色标记）
            if (index < 3 && this.currentViewLevel > 1) {
                classes += ' promotion-zone';
            }
            // 后3名降级区域（红色标记）
            if (index >= standings.length - 3 && this.currentViewLevel < CONFIG.LEAGUE_LEVELS) {
                classes += ' relegation-zone';
            }
            return classes;
        };
        
        const html = `
            <div class="details-card">
                <h3>${viewLeague.name} - 第${viewLeague.season}赛季</h3>
                <p>当前轮次: ${viewLeague.currentRound} / ${CONFIG.MATCHES_PER_SEASON}</p>
                <div class="league-switcher mt-2">
                    ${leagueButtons}
                </div>
                ${this.currentViewLevel > 1 ? '<p class="mt-2" style="color: var(--success-color);">⬆ 前3名升级到上一级联赛</p>' : ''}
                ${this.currentViewLevel < CONFIG.LEAGUE_LEVELS ? '<p class="mt-2" style="color: var(--accent-color);">⬇ 后3名降级到下一级联赛</p>' : ''}
            </div>
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>球队</th>
                        <th>场次</th>
                        <th>胜</th>
                        <th>平</th>
                        <th>负</th>
                        <th>进</th>
                        <th>失</th>
                        <th>净胜</th>
                        <th>积分</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((team, index) => `
                        <tr class="${getRowClass(index, team.isPlayerTeam)}">
                            <td>${index + 1}</td>
                            <td>${team.teamName} ${team.isPlayerTeam ? '⭐' : ''}</td>
                            <td>${team.played}</td>
                            <td>${team.won}</td>
                            <td>${team.drawn}</td>
                            <td>${team.lost}</td>
                            <td>${team.goalsFor}</td>
                            <td>${team.goalsAgainst}</td>
                            <td>${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
                            <td><strong>${team.points}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('league-table').innerHTML = html;
    },
    
    switchLeague(level) {
        this.currentViewLevel = level;
        this.renderStandings();
    }
};

// ========================================
// 游戏初始化
// ========================================
const Game = {
    init() {
        console.log('极简足球经理 v1.0 初始化中...');
        
        // 初始化导航
        Navigation.init();
        
        // 检查是否有存档
        this.checkSavedGame();
        
        // 绑定新游戏按钮
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        // 绑定继续游戏按钮
        document.getElementById('load-game-btn').addEventListener('click', () => {
            this.loadGame();
        });
        
        console.log('游戏初始化完成！');
    },
    
    checkSavedGame() {
        if (Storage.hasSave()) {
            document.getElementById('load-game-btn').disabled = false;
        }
    },
    
    startNewGame() {
        if (!confirm('开始新游戏将覆盖现有存档，确定继续吗？')) {
            return;
        }
        
        console.log('开始新游戏...');
        
        // 生成所有联赛和球队
        gameState.leagues = DataGenerator.generateAllLeagues();
        
        // 获取玩家球队
        const playerLeague = gameState.leagues.find(l => l.level === CONFIG.LEAGUE_LEVELS);
        gameState.playerTeam = playerLeague.teams.find(t => t.isPlayerTeam);
        
        // 设置游戏状态
        gameState.currentLeagueLevel = CONFIG.LEAGUE_LEVELS;
        gameState.currentSeason = 1;
        gameState.currentRound = 1;
        gameState.isInitialized = true;
        
        // 生成初始转会市场
        gameState.transferMarket = DataGenerator.generateTransferMarket(gameState.currentLeagueLevel, 15);
        
        // 保存游戏
        Storage.save(gameState);
        
        // 启动自动保存
        Storage.startAutoSave();
        
        alert(`新游戏已创建！\n你的球队"${gameState.playerTeam.name}"已加入第${gameState.currentLeagueLevel}级联赛。\n球队资金: ¥${gameState.playerTeam.funds.toLocaleString()}\n球员数量: ${gameState.playerTeam.players.length}人`);
        
        // 启用继续游戏按钮
        document.getElementById('load-game-btn').disabled = false;
        
        // 跳转到球队页面
        Navigation.navigateTo('team');
    },
    
    loadGame() {
        const savedGame = Storage.load();
        if (savedGame) {
            gameState = savedGame;
            gameState.isInitialized = true;
            
            // 启动自动保存
            Storage.startAutoSave();
            
            alert('游戏加载成功！');
            Navigation.navigateTo('team');
        } else {
            alert('没有找到存档！');
        }
    }
};

// ========================================
// 启动游戏
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});