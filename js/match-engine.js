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

        const positionTotals = lineup.reduce((totals, player) => {
            totals[player.position] = (totals[player.position] || 0) + player.ability;
            return totals;
        }, { GK: 0, DF: 0, MF: 0, CF: 0 });

        // 使用总能力而非平均能力，让阵型人数直接影响攻防能力。
        // 例如 433、442、451、352 会因为 CF/MF/DF 人数不同，自然产生不同攻防倾向。
        const attackPower = (
            positionTotals.CF * 0.45 +
            positionTotals.MF * 0.35 +
            positionTotals.DF * 0.15 +
            positionTotals.GK * 0.05
        ) / 11;

        return Math.min(200, Math.max(30, attackPower));
    }

    // 计算球队防守能力
    calculateDefensePower(team) {
        const lineup = this.getStartingLineup(team);
        if (lineup.length === 0) return 50;

        const positionTotals = lineup.reduce((totals, player) => {
            totals[player.position] = (totals[player.position] || 0) + player.ability;
            return totals;
        }, { GK: 0, DF: 0, MF: 0, CF: 0 });

        // 使用总能力而非平均能力，让阵型人数直接影响攻防能力。
        // 例如 433、442、451、352 会因为 CF/MF/DF 人数不同，自然产生不同攻防倾向。
        const defensePower = (
            positionTotals.GK * 0.30 +
            positionTotals.DF * 0.45 +
            positionTotals.MF * 0.20 +
            positionTotals.CF * 0.05
        ) / 11;

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
            'CF': 0.5,   // 前锋 50%
            'MF': 0.35,  // 中场 35%
            'DF': 0.14,  // 后卫 14%
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
                    const midfielders = assistCandidates.filter(p => p.position === 'MF');
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
        const cardCandidates = lineup.filter(p => p.position === 'DF' || p.position === 'MF');
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
        const midfielders = lineup.filter(p => p.position === 'MF');
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

        // 基于球队实力直接计算比分（球队实力 = 首发能力总和）
        const homeAbility = homeTeam.getTeamAbility();
        const awayAbility = awayTeam.getTeamAbility();

        // 计算预期进球（泊松分布参数）
        const homeExpectedGoals = (homeAbility / 1650) * 1.5;  // 主场优势
        const awayExpectedGoals = (awayAbility / 1650) * 1.0;

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
