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
            opponentAbility = opponent ? opponent.getTeamAbility() : 550;
            matchPlayed = nextMatch.played;
            if (matchPlayed) {
                const playerScore = isHome ? nextMatch.homeScore : nextMatch.awayScore;
                const oppScore = isHome ? nextMatch.awayScore : nextMatch.homeScore;
                matchScore = `${playerScore} - ${oppScore}`;
            }
        }

        const playerAbility = gameState.playerTeam.getTeamAbility();
        const winChance = this.calculateWinChance(playerAbility, opponentAbility, isHome);

        // 按主队在前、客队在后的顺序组织 match-preview
        const homeTeam = {
            name: isHome ? gameState.playerTeam.name : opponentName,
            ability: isHome ? playerAbility : opponentAbility
        };
        const awayTeam = {
            name: isHome ? opponentName : gameState.playerTeam.name,
            ability: isHome ? opponentAbility : playerAbility
        };

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
                    <div class="match-team home">
                        <div class="team-name">${homeTeam.name}</div>
                        <div class="team-ability">实力: ${homeTeam.ability}</div>
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-team away">
                        <div class="team-name">${awayTeam.name}</div>
                        <div class="team-ability">实力: ${awayTeam.ability}</div>
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
        const homeBonus = isHome ? 110 : -110;
        const diff = playerAbility - opponentAbility + homeBonus;
        const winChance = 35 + diff * (0.5 / 11);
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
                <div class="match-result-header">
                    <h3>比赛结束 - ${resultText}</h3>
                    <button class="btn btn-primary" onclick="MatchModule.closeMatchResult()">
                        ➡️ 继续
                    </button>
                </div>
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

