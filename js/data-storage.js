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
        // 根据联赛级别从 CONFIG 中获取能力值范围（滑动区间，每级 50 个取值）
        const range = CONFIG.LEAGUE_ABILITY_RANGES[leagueLevel] || CONFIG.LEAGUE_ABILITY_RANGES[6];
        const minAbility = range.min;
        const maxAbility = range.max;

        // 联赛内部按金字塔分布抽样：能力越高，权重越小（平方反比）
        // 对能力值 ability，其权重 = (maxAbility - ability + 1) ^ 2
        // 例如 L1 (151-200)：ability=200 权重=1，ability=151 权重=2500
        // 使用离散累积权重法：先在 [1, totalWeight] 内随机一个值，再反向定位
        const rangeSize = maxAbility - minAbility + 1;
        // 前 N 个平方和 = N*(N+1)*(2N+1)/6，作为 totalWeight
        const totalWeight = rangeSize * (rangeSize + 1) * (2 * rangeSize + 1) / 6;
        const pick = Math.floor(Math.random() * totalWeight) + 1;
        let cumulative = 0;
        let ability = maxAbility; // 从最高端开始累加（权重 1 对应最高值）
        for (let i = 1; i <= rangeSize; i++) {
            cumulative += i * i;
            if (pick <= cumulative) {
                ability = maxAbility - i + 1;
                break;
            }
        }

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

        // 根据联赛级别重新计算潜力（受到联赛能力下限与潜力上限限制）
        const range2 = CONFIG.LEAGUE_ABILITY_RANGES[leagueLevel] || CONFIG.LEAGUE_ABILITY_RANGES[6];
        const cap = CONFIG.LEAGUE_POTENTIAL_CAP[leagueLevel] || CONFIG.LEAGUE_POTENTIAL_CAP[6];
        player.potential = player.generatePotential(range2.min, cap);

        // 根据能力值和年龄重新计算身价
        player.value = player.calculateValue();
        player.wage = player.calculateWage();

        return player;
    },

    // 生成球队所有球员（用于懒加载）
    generateTeamPlayers(leagueLevel) {
        const players = [];

        // 生成门将（2-3人）
        const gkCount = 3;
        for (let i = 0; i < gkCount; i++) {
            players.push(this.generatePlayer('GK', leagueLevel));
        }

        // 生成后卫（5-7人）
        const defCount = 8;
        for (let i = 0; i < defCount; i++) {
            players.push(this.generatePlayer('DF', leagueLevel));
        }

        // 生成中场（5-7人）
        const midCount = 8;
        for (let i = 0; i < midCount; i++) {
            players.push(this.generatePlayer('MF', leagueLevel));
        }

        // 生成前锋（3-5人）
        const fwdCount = 6;
        for (let i = 0; i < fwdCount; i++) {
            players.push(this.generatePlayer('CF', leagueLevel));
        }

        return players;
    },

    // 生成球队
    generateTeam(name, leagueLevel, isPlayerTeam = false, lazyLoad = false) {
        // 根据联赛级别设置初始资金
        const fundsByLevel = CONFIG.ECONOMY.INITIAL_CASH;

        if (lazyLoad) {
            // 懒加载模式：只含基本信息，不生成球员
            const team = new Team({
                name: name,
                funds: fundsByLevel[leagueLevel] || fundsByLevel[6],
                cash: fundsByLevel[leagueLevel] || fundsByLevel[6],
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
                funds: fundsByLevel[leagueLevel] || fundsByLevel[6],
                cash: fundsByLevel[leagueLevel] || fundsByLevel[6],
                players: players,
                leagueLevel: leagueLevel,
                isPlayerTeam: isPlayerTeam,
                isPlayersLoaded: true
            });
            team.setDefaultLineup();
            team.assignShirtNumbers({ prioritizeStarting: true, preserveExisting: false });
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
                        funds: CONFIG.ECONOMY.INITIAL_CASH[level] || CONFIG.ECONOMY.INITIAL_CASH[6],
                        cash: CONFIG.ECONOMY.INITIAL_CASH[level] || CONFIG.ECONOMY.INITIAL_CASH[6],
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
                    funds: CONFIG.ECONOMY.INITIAL_CASH[level] || CONFIG.ECONOMY.INITIAL_CASH[6],
                    cash: CONFIG.ECONOMY.INITIAL_CASH[level] || CONFIG.ECONOMY.INITIAL_CASH[6],
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
            const positions = ['GK', 'DF', 'MF', 'CF'];
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

            if (parsed.playerTeam && parsed.leagues) {
                const playerLeague = parsed.leagues.find(l => l.level === parsed.currentLeagueLevel);
                const linkedPlayerTeam = playerLeague && playerLeague.teams.find(t => t.id === parsed.playerTeam.id);
                if (linkedPlayerTeam) {
                    parsed.playerTeam = linkedPlayerTeam;
                }
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
