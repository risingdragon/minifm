// ========================================
// 球队模块
// ========================================
const TeamModule = {
    // 排序状态
    sortBy: 'status', // 默认按首发/替补排序
    sortOrder: 'asc',   // 升序

    render() {
        if (!gameState.isInitialized) {
            document.getElementById('team-details').innerHTML = '<p>请先开始新游戏</p>';
            document.getElementById('squad-list').innerHTML = '<p>暂无球员数据</p>';
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

    getNextMatchText() {
        const team = gameState.playerTeam;
        const currentLeague = gameState.leagues.find(l => l.level === gameState.currentLeagueLevel);
        if (!team || !currentLeague || !currentLeague.schedule || currentLeague.schedule.length === 0) {
            return '无';
        }

        const startRoundIndex = Math.max((currentLeague.currentRound || 1) - 1, 0);
        for (let i = startRoundIndex; i < currentLeague.schedule.length; i++) {
            const roundData = currentLeague.schedule[i];
            if (!roundData || !Array.isArray(roundData.matches)) continue;

            const match = roundData.matches.find(m =>
                !m.played && (m.homeTeam === team.id || m.awayTeam === team.id)
            );
            if (!match) continue;

            const isHome = match.homeTeam === team.id;
            const opponentId = isHome ? match.awayTeam : match.homeTeam;
            const opponent = currentLeague.teams.find(t => t.id === opponentId);
            return `${isHome ? '主场' : '客场'} 对阵 ${opponent ? opponent.name : '未知对手'}`;
        }

        return '无';
    },

    renderTeamInfo() {
        const team = gameState.playerTeam;
        const nextMatchText = this.getNextMatchText();

        const retroDetailsHtml = `
            <div class="retro-scoreboard">
                <div class="club-strip">
                    <div>
                        <h3>${team.name}</h3>
                        <p>第 ${gameState.currentLeagueLevel} 级联赛 · 4-4-2 阵型</p>
                    </div>
                </div>
                <div class="club-meta">
                    <div><span>现在日期</span><strong>赛季 ${gameState.currentSeason} · 第 ${gameState.currentRound} 轮</strong></div>
                    <div><span>流动资金</span><strong>£${team.funds.toLocaleString()}</strong></div>
                    <div><span>下一场比赛</span><strong>${nextMatchText}</strong></div>
                </div>
            </div>
        `;
        document.getElementById('team-details').innerHTML = retroDetailsHtml;
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

            const html = posPlayers.map((player, index) => `
                <div class="lineup-player-card" data-player-id="${player.id}" onclick="TeamModule.toggleLineup('${player.id}')">
                    <span class="kit-number">${player.shirtNumber || '-'}</span>
                    <span class="lineup-player-name">${player.name}</span>
                </div>
            `).join('');

            el.innerHTML = html;
        });

    },

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
            } else if (this.sortBy === 'status') {
                const aStarting = gameState.playerTeam.startingLineup.includes(a.id) ? 0 : 1;
                const bStarting = gameState.playerTeam.startingLineup.includes(b.id) ? 0 : 1;
                comparison = aStarting - bStarting;
            } else if (this.sortBy === 'shirtNumber') {
                comparison = (a.shirtNumber || 100) - (b.shirtNumber || 100);
            } else if (this.sortBy === 'name') {
                comparison = a.name.localeCompare(b.name, 'zh-CN');
            } else if (this.sortBy === 'ability') {
                comparison = a.ability - b.ability;
            } else if (this.sortBy === 'potential') {
                comparison = a.potential - b.potential;
            } else if (this.sortBy === 'age') {
                comparison = a.age - b.age;
            } else if (this.sortBy === 'value') {
                comparison = a.value - b.value;
            } else if (this.sortBy === 'wage') {
                comparison = a.wage - b.wage;
            } else if (this.sortBy === 'goals') {
                comparison = (a.goals || 0) - (b.goals || 0);
            } else if (this.sortBy === 'assists') {
                comparison = (a.assists || 0) - (b.assists || 0);
            } else if (this.sortBy === 'appearances') {
                comparison = (a.appearances || 0) - (b.appearances || 0);
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
            // 数值表现字段默认降序，文本和位置字段默认升序
            this.sortOrder = ['ability', 'potential', 'value', 'wage', 'goals', 'assists', 'appearances'].includes(sortBy) ? 'desc' : 'asc';
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
            <div class="lineup-tip">💡 点击球员可切换首发/替补状态</div>
        `;

        // 排序后的球员列表
        const sortedPlayers = this.sortPlayers(players);

        const playersHtml = `
            <table class="players-table">
                <thead>
                    <tr>
                        <th>状态</th>
                        <th>号码</th>
                        <th>姓名</th>
                        <th>位置</th>
                        <th>能力值</th>
                        <th>潜力</th>
                        <th>年龄</th>
                        <th>身价</th>
                        <th>周薪</th>
                        <th>进球</th>
                        <th>助攻</th>
                        <th>出场</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPlayers.map(player => {
            const isStarting = startingLineup.includes(player.id);
            return `
                            <tr class="${isStarting ? 'starting-row' : ''}" onclick="TeamModule.toggleLineup('${player.id}')">
                                <td>
                                    <span class="status-badge ${isStarting ? 'badge-starting' : 'badge-sub'}">
                                        ${isStarting ? '首发' : '替补'}
                                    </span>
                                </td>
                                <td class="shirt-number">${player.shirtNumber || '-'}</td>
                                <td class="player-name">${player.name}</td>
                                <td>${CONFIG.POSITION_NAMES[player.position]}</td>
                                <td class="ability-value">${player.ability}</td>
                                <td class="potential-value">${player.potential}</td>
                                <td>${player.age}岁</td>
                                <td>¥${player.value.toLocaleString()}</td>
                                <td>¥${player.wage.toLocaleString()}</td>
                                <td>${player.goals || 0}</td>
                                <td>${player.assists || 0}</td>
                                <td>${player.appearances || 0}</td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        const positionLabels = { GK: 'GK', DEF: 'DF', MID: 'MF', FWD: 'CF' };
        const sortHeader = (field, label) => {
            const active = this.sortBy === field;
            const direction = active ? (this.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none';
            const marker = active ? (this.sortOrder === 'asc' ? ' ▲' : ' ▼') : '';
            return `<th class="${active ? 'sortable active' : 'sortable'}" aria-sort="${direction}" onclick="TeamModule.toggleSort('${field}')">${label}${marker}</th>`;
        };
        const retroPlayersHtml = `
            <table class="players-table">
                <thead>
                    <tr>
                        ${sortHeader('status', '状态')}
                        ${sortHeader('position', '位置')}
                        ${sortHeader('shirtNumber', '号码')}
                        ${sortHeader('name', '姓名')}
                        ${sortHeader('ability', '能力')}
                        ${sortHeader('potential', '潜力')}
                        ${sortHeader('age', '年龄')}
                        ${sortHeader('value', '身价')}
                        ${sortHeader('wage', '周薪')}
                        ${sortHeader('goals', '进球')}
                        ${sortHeader('assists', '助攻')}
                        ${sortHeader('appearances', '出场')}
                    </tr>
                </thead>
                <tbody>
                    ${sortedPlayers.map((player, index) => {
            const isStarting = startingLineup.includes(player.id);
            return `
                            <tr class="${isStarting ? 'starting-row' : ''}" onclick="TeamModule.toggleLineup('${player.id}')">
                                <td><span class="status-badge ${isStarting ? 'badge-starting' : 'badge-sub'}">${isStarting ? '首发' : '替补'}</span></td>
                                <td class="position-code">${positionLabels[player.position]}</td>
                                <td class="shirt-number">${player.shirtNumber || '-'}</td>
                                <td class="player-name">${player.name}</td>
                                <td class="ability-value">${player.ability}</td>
                                <td class="potential-value">${player.potential}</td>
                                <td>${player.age}</td>
                                <td>£${player.value.toLocaleString()}</td>
                                <td>£${player.wage.toLocaleString()}</td>
                                <td>${player.goals || 0}</td>
                                <td>${player.assists || 0}</td>
                                <td>${player.appearances || 0}</td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('squad-list').innerHTML = retroPlayersHtml;
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
                                    <span class="detail-label">潜力</span>
                                    <span class="detail-value ability-badge">${player.potential}</span>
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
