// ========================================
// 联赛模块
// ========================================
const LeagueModule = {
    render() {
        if (!gameState.isInitialized) {
            document.getElementById('league-table').innerHTML = '<p>请先开始新游戏</p>';
            return;
        }

        this.renderStandings();
    },

    renderStandings() {
        const viewLeague = gameState.leagues.find(l => l.level === gameState.currentLeagueLevel);
        if (!viewLeague) {
            document.getElementById('league-table').innerHTML = '<p>联赛数据不存在</p>';
            return;
        }

        const standings = viewLeague.getSortedStandings();

        // 标记升降级区域
        const getRowClass = (index, isPlayerTeam) => {
            let classes = isPlayerTeam ? 'player-team' : '';
            // 前3名升级区域（绿色标记）
            if (index < 3 && gameState.currentLeagueLevel > 1) {
                classes += ' promotion-zone';
            }
            // 后3名降级区域（红色标记）
            if (index >= standings.length - 3 && gameState.currentLeagueLevel < CONFIG.LEAGUE_LEVELS) {
                classes += ' relegation-zone';
            }
            return classes;
        };

        // 获取球队实力
        const getTeamAbility = (standing) => {
            const team = viewLeague.teams.find(t => t.id === standing.teamId);
            if (team && typeof team.getTeamAbility === 'function') return team.getTeamAbility();
            return team && team.ability ? team.ability : 0;
        };

        const html = `
            <div class="details-card">
                <h3>${viewLeague.name} - 第${viewLeague.season}赛季</h3>
                <p>当前轮次: ${viewLeague.currentRound} / ${CONFIG.MATCHES_PER_SEASON}</p>
                ${gameState.currentLeagueLevel > 1 ? '<p class="mt-2" style="color: var(--success-color);">⬆ 前3名升级到上一级联赛</p>' : ''}
                ${gameState.currentLeagueLevel < CONFIG.LEAGUE_LEVELS ? '<p class="mt-2" style="color: var(--accent-color);">⬇ 后3名降级到下一级联赛</p>' : ''}
            </div>
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>球队</th>
                        <th>实力</th>
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
                            <td>${getTeamAbility(team)}</td>
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
    }
};

