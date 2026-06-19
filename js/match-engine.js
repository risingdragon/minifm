// ========================================
// 比赛引擎
// ========================================
class MatchEngine {
    static BASE_GOALS = 1.25;
    static HOME_ADVANTAGE = 1.10;
    static POWER_FACTOR = 1.30;

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

        const positionTotals = MatchEngine.getPositionTotals(lineup);

        // 使用总能力而非平均能力，让阵型人数直接影响攻防能力。
        // 例如 433、442、451、352 会因为 CF/MF/DF 人数不同，自然产生不同攻防倾向。
        const rawAttack = (
            positionTotals.CF * 0.45 +
            positionTotals.MF * 0.35 +
            positionTotals.DF * 0.15 +
            positionTotals.GK * 0.05
        );

        return Math.min(200, Math.max(30, rawAttack));
    }

    // 计算球队防守能力
    calculateDefensePower(team) {
        const lineup = this.getStartingLineup(team);
        if (lineup.length === 0) return 50;

        const positionTotals = MatchEngine.getPositionTotals(lineup);

        // 使用总能力而非平均能力，让阵型人数直接影响攻防能力。
        // 例如 433、442、451、352 会因为 CF/MF/DF 人数不同，自然产生不同攻防倾向。
        const rawDefense = (
            positionTotals.GK * 0.30 +
            positionTotals.DF * 0.45 +
            positionTotals.MF * 0.20 +
            positionTotals.CF * 0.05
        );

        return Math.min(200, Math.max(30, rawDefense));
    }

    // 模拟比赛
    simulate() {
        const homeAttack = this.calculateAttackPower(this.homeTeam);
        const awayAttack = this.calculateAttackPower(this.awayTeam);
        const homeDefense = this.calculateDefensePower(this.homeTeam);
        const awayDefense = this.calculateDefensePower(this.awayTeam);

        const expectedGoals = MatchEngine.calculateExpectedGoals(
            homeAttack,
            awayAttack,
            homeDefense,
            awayDefense
        );

        // 使用泊松分布生成进球数
        this.homeScore = MatchEngine.poissonRandom(expectedGoals.home);
        this.awayScore = MatchEngine.poissonRandom(expectedGoals.away);

        // 限制最大比分
        this.homeScore = Math.min(10, this.homeScore);
        this.awayScore = Math.min(10, this.awayScore);

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

    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static calculateExpectedGoals(homeAttack, awayAttack, homeDefense, awayDefense) {
        const safeHomeDefense = Math.max(homeDefense, 1);
        const safeAwayDefense = Math.max(awayDefense, 1);

        let homeExpectedGoals =
            MatchEngine.BASE_GOALS *
            MatchEngine.HOME_ADVANTAGE *
            Math.pow(homeAttack / safeAwayDefense, MatchEngine.POWER_FACTOR);

        let awayExpectedGoals =
            MatchEngine.BASE_GOALS *
            Math.pow(awayAttack / safeHomeDefense, MatchEngine.POWER_FACTOR);

        homeExpectedGoals = MatchEngine.clamp(homeExpectedGoals, 0.25, 4.5);
        awayExpectedGoals = MatchEngine.clamp(awayExpectedGoals, 0.25, 4.5);

        return {
            home: homeExpectedGoals,
            away: awayExpectedGoals
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
            const position = player.position;
            const prob = goalProbabilities[position] || 0.1;
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
        const cardCandidates = lineup.filter(p => {
            const position = p.position;
            return position === 'DF' || position === 'MF';
        });
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
        return midfielders.reduce((sum, p) => sum + MatchEngine.getPlayerAbility(p), 0) / midfielders.length;
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

        const engine = new MatchEngine(homeTeam, awayTeam);
        const homeAttack = engine.calculateAttackPower(homeTeam);
        const awayAttack = engine.calculateAttackPower(awayTeam);
        const homeDefense = engine.calculateDefensePower(homeTeam);
        const awayDefense = engine.calculateDefensePower(awayTeam);
        const expectedGoals = MatchEngine.calculateExpectedGoals(
            homeAttack,
            awayAttack,
            homeDefense,
            awayDefense
        );

        // 使用泊松分布生成进球数
        const homeGoals = Math.min(10, MatchEngine.poissonRandom(expectedGoals.home));
        const awayGoals = Math.min(10, MatchEngine.poissonRandom(expectedGoals.away));

        return {
            homeTeam: homeTeam.name,
            awayTeam: awayTeam.name,
            homeGoals: homeGoals,
            awayGoals: awayGoals,
            events: []  // 简化模式不生成详细事件
        };
    }

    static getSeasonSimulationStats(source) {
        const matches = MatchEngine.normalizeMatches(source);
        const playedMatches = matches.filter(match => match && match.played);
        const totalMatches = playedMatches.length;
        const totalGoals = playedMatches.reduce((sum, match) => sum + match.homeScore + match.awayScore, 0);
        const draws = playedMatches.filter(match => match.homeScore === match.awayScore).length;
        const homeWins = playedMatches.filter(match => match.homeScore > match.awayScore).length;
        const awayWins = playedMatches.filter(match => match.homeScore < match.awayScore).length;

        return {
            matches: totalMatches,
            totalGoals,
            goalsPerMatch: totalMatches ? Number((totalGoals / totalMatches).toFixed(2)) : 0,
            draws,
            drawRate: totalMatches ? Number((draws / totalMatches).toFixed(3)) : 0,
            homeWinRate: totalMatches ? Number((homeWins / totalMatches).toFixed(3)) : 0,
            awayWinRate: totalMatches ? Number((awayWins / totalMatches).toFixed(3)) : 0
        };
    }

    static logSeasonSimulationStats(source) {
        const stats = MatchEngine.getSeasonSimulationStats(source);
        console.log('赛季模拟统计', stats);
        return stats;
    }

    static auditLeague(league = null) {
        const targetLeague = league || (
            typeof gameState !== 'undefined' &&
            gameState.leagues &&
            gameState.leagues.find(item => item.level === gameState.currentLeagueLevel)
        );
        if (!targetLeague) {
            console.warn('无法审计联赛：未找到联赛数据');
            return [];
        }

        if (!targetLeague.isTeamsLoaded && typeof targetLeague.ensureFullLoad === 'function') {
            targetLeague.ensureFullLoad();
        }

        const engine = new MatchEngine(null, null);
        const auditRows = targetLeague.teams.map(team => {
            if (!team.isPlayersLoaded && typeof team.loadPlayers === 'function') {
                team.loadPlayers();
            }

            const teamAudit = MatchEngine.auditTeam(team, engine, false);
            return {
                teamName: team.name,
                displayedStrength: teamAudit.displayedStrength,
                attackPower: teamAudit.attackPower,
                defensePower: teamAudit.defensePower,
                rawAttack: teamAudit.rawAttack,
                rawDefense: teamAudit.rawDefense,
                finalAttack: teamAudit.finalAttack,
                finalDefense: teamAudit.finalDefense,
                attackRank: 0,
                defenseRank: 0,
                strengthRank: 0
            };
        });

        MatchEngine.assignAuditRank(auditRows, 'displayedStrength', 'strengthRank');
        MatchEngine.assignAuditRank(auditRows, 'attackPower', 'attackRank');
        MatchEngine.assignAuditRank(auditRows, 'defensePower', 'defenseRank');

        const result = auditRows.sort((a, b) => b.displayedStrength - a.displayedStrength);
        console.table(result);
        console.log('实力/攻防相关性', {
            strengthAttackCorrelation: MatchEngine.calculateCorrelation(result, 'displayedStrength', 'attackPower'),
            strengthDefenseCorrelation: MatchEngine.calculateCorrelation(result, 'displayedStrength', 'defensePower')
        });
        return result;
    }

    static auditTeam(team, engine = null, shouldLog = true) {
        if (!team) {
            console.warn('无法审计球队：team 为空');
            return null;
        }
        if (!team.isPlayersLoaded && typeof team.loadPlayers === 'function') {
            team.loadPlayers();
        }

        const auditEngine = engine || new MatchEngine(team, team);
        const lineup = auditEngine.getStartingLineup(team);
        const positionGroups = MatchEngine.groupLineupByPosition(lineup);
        const positionTotals = MatchEngine.getPositionTotals(lineup);
        const totalAbility = lineup.reduce((sum, player) => sum + MatchEngine.getPlayerAbility(player), 0);
        const averageAbility = lineup.length ? totalAbility / lineup.length : 0;
        const rawAttack = (
            positionTotals.CF * 0.45 +
            positionTotals.MF * 0.35 +
            positionTotals.DF * 0.15 +
            positionTotals.GK * 0.05
        );
        const rawDefense = (
            positionTotals.GK * 0.30 +
            positionTotals.DF * 0.45 +
            positionTotals.MF * 0.20 +
            positionTotals.CF * 0.05
        );
        const finalAttack = Math.min(200, Math.max(30, rawAttack));
        const finalDefense = Math.min(200, Math.max(30, rawDefense));
        const attackContribution = {
            CF: Number((positionTotals.CF * 0.45).toFixed(2)),
            MF: Number((positionTotals.MF * 0.35).toFixed(2)),
            DF: Number((positionTotals.DF * 0.15).toFixed(2)),
            GK: Number((positionTotals.GK * 0.05).toFixed(2)),
            total: Number((
                positionTotals.CF * 0.45 +
                positionTotals.MF * 0.35 +
                positionTotals.DF * 0.15 +
                positionTotals.GK * 0.05
            ).toFixed(2))
        };
        const defenseContribution = {
            GK: Number((positionTotals.GK * 0.30).toFixed(2)),
            DF: Number((positionTotals.DF * 0.45).toFixed(2)),
            MF: Number((positionTotals.MF * 0.20).toFixed(2)),
            CF: Number((positionTotals.CF * 0.05).toFixed(2)),
            total: Number((
                positionTotals.GK * 0.30 +
                positionTotals.DF * 0.45 +
                positionTotals.MF * 0.20 +
                positionTotals.CF * 0.05
            ).toFixed(2))
        };

        const result = {
            teamName: team.name,
            displayedStrength: typeof team.getTeamAbility === 'function' ? team.getTeamAbility() : totalAbility,
            attackPower: Number(finalAttack.toFixed(2)),
            defensePower: Number(finalDefense.toFixed(2)),
            rawAttack: Number(rawAttack.toFixed(2)),
            rawDefense: Number(rawDefense.toFixed(2)),
            finalAttack: Number(finalAttack.toFixed(2)),
            finalDefense: Number(finalDefense.toFixed(2)),
            forwardsAverage: MatchEngine.averageAbility(positionGroups.CF),
            midfieldAverage: MatchEngine.averageAbility(positionGroups.MF),
            defendersAverage: MatchEngine.averageAbility(positionGroups.DF),
            goalkeeperAbility: positionGroups.GK[0] ? MatchEngine.getPlayerAbility(positionGroups.GK[0]) : 0,
            sourcePlayers: lineup.map(player => ({
                playerName: player.name,
                rawPosition: player.position,
                normalizedPosition: player.position,
                abilityField: 'ability',
                abilityFieldValue: player.ability,
                resolvedAbility: MatchEngine.getPlayerAbility(player)
            })),
            lineup: lineup.map(player => ({
                position: player.position,
                rawPosition: player.position,
                playerName: player.name,
                ability: MatchEngine.getPlayerAbility(player)
            })),
            totalAbility,
            averageAbility: Number(averageAbility.toFixed(2)),
            attackContribution,
            defenseContribution
        };

        if (shouldLog) {
            console.log('球队审计', result);
        }
        return result;
    }

    static groupLineupByPosition(lineup) {
        return lineup.reduce((groups, player) => {
            const position = player.position;
            if (!groups[position]) groups[position] = [];
            groups[position].push(player);
            return groups;
        }, { GK: [], DF: [], MF: [], CF: [] });
    }

    static getPositionTotals(lineup) {
        return lineup.reduce((totals, player) => {
            const position = player.position;
            totals[position] = (totals[position] || 0) + MatchEngine.getPlayerAbility(player);
            return totals;
        }, { GK: 0, DF: 0, MF: 0, CF: 0 });
    }

    static averageAbility(players) {
        if (!players || players.length === 0) return 0;
        return Number((players.reduce((sum, player) => sum + MatchEngine.getPlayerAbility(player), 0) / players.length).toFixed(2));
    }

    static getPlayerAbility(player) {
        const value = Number(player && player.ability);
        return Number.isFinite(value) ? value : 0;
    }

    static assignAuditRank(rows, valueKey, rankKey) {
        [...rows]
            .sort((a, b) => b[valueKey] - a[valueKey])
            .forEach((row, index) => {
                row[rankKey] = index + 1;
            });
    }

    static calculateCorrelation(rows, xKey, yKey) {
        if (!rows || rows.length < 2) return 0;

        const xAverage = rows.reduce((sum, row) => sum + row[xKey], 0) / rows.length;
        const yAverage = rows.reduce((sum, row) => sum + row[yKey], 0) / rows.length;
        const numerator = rows.reduce((sum, row) => sum + (row[xKey] - xAverage) * (row[yKey] - yAverage), 0);
        const xVariance = rows.reduce((sum, row) => sum + Math.pow(row[xKey] - xAverage, 2), 0);
        const yVariance = rows.reduce((sum, row) => sum + Math.pow(row[yKey] - yAverage, 2), 0);
        const denominator = Math.sqrt(xVariance * yVariance);

        return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(3));
    }

    static simulateSeasons(count = 100) {
        const seasonCount = Math.max(1, Math.floor(count));
        const teams = MatchEngine.createSimulationTeams();
        const teamRecords = new Map(teams.map(team => [team.id, {
            teamName: team.name,
            strength: team.getTeamAbility(),
            rankTotal: 0,
            pointsTotal: 0,
            championCount: 0,
            top4Count: 0,
            top6Count: 0,
            relegationCount: 0
        }]));
        const strongestTeam = [...teams].sort((a, b) => b.getTeamAbility() - a.getTeamAbility())[0];
        const top3StrengthIds = [...teams]
            .sort((a, b) => b.getTeamAbility() - a.getTeamAbility())
            .slice(0, 3)
            .map(team => team.id);
        const top5StrengthIds = [...teams]
            .sort((a, b) => b.getTeamAbility() - a.getTeamAbility())
            .slice(0, 5)
            .map(team => team.id);

        let strongestRankTotal = 0;
        let strongestChampionCount = 0;
        let top3RankTotal = 0;
        let top3Top4Count = 0;
        let top5Top6Count = 0;
        let top5Entries = 0;
        let aggregateGoalsPerMatch = 0;
        let aggregateDrawRate = 0;

        for (let season = 0; season < seasonCount; season++) {
            const result = MatchEngine.simulateSingleSeason(teams);
            aggregateGoalsPerMatch += result.stats.goalsPerMatch;
            aggregateDrawRate += result.stats.drawRate;

            result.table.forEach(row => {
                const record = teamRecords.get(row.teamId);
                record.rankTotal += row.rank;
                record.pointsTotal += row.points;
                if (row.rank === 1) record.championCount++;
                if (row.rank <= 4) record.top4Count++;
                if (row.rank <= 6) record.top6Count++;
                if (row.rank >= 18) record.relegationCount++;
            });

            const strongestRow = result.table.find(row => row.teamId === strongestTeam.id);
            strongestRankTotal += strongestRow.rank;
            if (strongestRow.rank === 1) strongestChampionCount++;

            top3StrengthIds.forEach(teamId => {
                const row = result.table.find(item => item.teamId === teamId);
                top3RankTotal += row.rank;
                if (row.rank <= 4) top3Top4Count++;
            });

            top5StrengthIds.forEach(teamId => {
                const row = result.table.find(item => item.teamId === teamId);
                top5Entries++;
                if (row.rank <= 6) top5Top6Count++;
            });
        }

        const teamsReport = [...teamRecords.values()]
            .map(record => ({
                teamName: record.teamName,
                strength: record.strength,
                averageRank: Number((record.rankTotal / seasonCount).toFixed(2)),
                averagePoints: Number((record.pointsTotal / seasonCount).toFixed(2)),
                championCount: record.championCount,
                top4Count: record.top4Count,
                relegationCount: record.relegationCount
            }))
            .sort((a, b) => b.strength - a.strength);

        const leagueReport = {
            strongestTeamAverageRank: Number((strongestRankTotal / seasonCount).toFixed(2)),
            strongestTeamChampionRate: Number((strongestChampionCount / seasonCount).toFixed(3)),
            top3StrengthAverageRank: Number((top3RankTotal / (seasonCount * 3)).toFixed(2)),
            top3StrengthTop4Rate: Number((top3Top4Count / (seasonCount * 3)).toFixed(3)),
            top5StrengthTop5Rate: Number((top5Top6Count / top5Entries).toFixed(3)),
            top5StrengthTop6Rate: Number((top5Top6Count / top5Entries).toFixed(3)),
            averageGoalsPerMatch: Number((aggregateGoalsPerMatch / seasonCount).toFixed(2)),
            averageDrawRate: Number((aggregateDrawRate / seasonCount).toFixed(3))
        };

        const report = {
            seasons: seasonCount,
            teams: teamsReport,
            league: leagueReport
        };

        console.log('长期赛季模拟统计', report);
        return report;
    }

    static createSimulationTeams() {
        const strengths = [
            280, 274, 268, 264, 258,
            250, 244, 238, 232, 226,
            220, 214, 208, 202, 196,
            190, 184, 178, 172, 166
        ];

        return strengths.map((strength, index) => {
            const positions = ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'CF', 'CF'];
            const playerAbility = strength / positions.length;
            const players = positions.map((position, playerIndex) => ({
                id: `sim_${index + 1}_${playerIndex + 1}`,
                name: `模拟${index + 1}-${playerIndex + 1}`,
                position,
                ability: playerAbility
            }));

            return {
                id: `sim_team_${index + 1}`,
                name: `模拟球队${index + 1}`,
                isPlayersLoaded: true,
                players,
                startingLineup: players.map(player => player.id),
                getTeamAbility() {
                    return Math.round(this.players.reduce((sum, player) => sum + player.ability, 0));
                }
            };
        });
    }

    static simulateSingleSeason(teams) {
        const standings = new Map(teams.map(team => [team.id, {
            teamId: team.id,
            teamName: team.name,
            strength: team.getTeamAbility(),
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
        }]));
        const matches = [];

        for (let homeIndex = 0; homeIndex < teams.length; homeIndex++) {
            for (let awayIndex = 0; awayIndex < teams.length; awayIndex++) {
                if (homeIndex === awayIndex) continue;

                const homeTeam = teams[homeIndex];
                const awayTeam = teams[awayIndex];
                const result = MatchEngine.simulateMatchSimple(homeTeam, awayTeam);
                const match = {
                    homeTeam: homeTeam.id,
                    awayTeam: awayTeam.id,
                    homeScore: result.homeGoals,
                    awayScore: result.awayGoals,
                    played: true
                };
                matches.push(match);
                MatchEngine.applyResultToStandings(standings, match);
            }
        }

        const table = [...standings.values()]
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const bGoalDifference = b.goalsFor - b.goalsAgainst;
                const aGoalDifference = a.goalsFor - a.goalsAgainst;
                if (bGoalDifference !== aGoalDifference) return bGoalDifference - aGoalDifference;
                return b.goalsFor - a.goalsFor;
            })
            .map((row, index) => ({
                ...row,
                rank: index + 1
            }));

        return {
            table,
            matches,
            stats: MatchEngine.getSeasonSimulationStats(matches)
        };
    }

    static applyResultToStandings(standings, match) {
        const homeStanding = standings.get(match.homeTeam);
        const awayStanding = standings.get(match.awayTeam);
        if (!homeStanding || !awayStanding) return;

        homeStanding.played++;
        awayStanding.played++;
        homeStanding.goalsFor += match.homeScore;
        homeStanding.goalsAgainst += match.awayScore;
        awayStanding.goalsFor += match.awayScore;
        awayStanding.goalsAgainst += match.homeScore;

        if (match.homeScore > match.awayScore) {
            homeStanding.won++;
            awayStanding.lost++;
            homeStanding.points += 3;
        } else if (match.homeScore < match.awayScore) {
            awayStanding.won++;
            homeStanding.lost++;
            awayStanding.points += 3;
        } else {
            homeStanding.drawn++;
            awayStanding.drawn++;
            homeStanding.points++;
            awayStanding.points++;
        }
    }

    static normalizeMatches(source) {
        if (!source) return [];
        if (Array.isArray(source)) {
            if (source.length > 0 && Array.isArray(source[0].matches)) {
                return source.flatMap(round => round.matches || []);
            }
            return source;
        }
        if (Array.isArray(source.schedule)) {
            return source.schedule.flatMap(round => round.matches || []);
        }
        return [];
    }
}
