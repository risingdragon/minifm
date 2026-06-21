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

    // 转会市场排序状态
    buySortBy: 'ability',
    buySortOrder: 'desc',

    // 出售列表排序状态
    sellSortBy: 'ability',
    sellSortOrder: 'desc',

    // 当前选中的球员（用于购买/出售确认）
    selectedPlayer: null,
    selectedPlayerIndex: null,
    selectedSellPlayer: null,
    selectedSellPlayerIndex: null,
    currentView: 'buy',

    render() {
        this.initTabs();

        if (!gameState.isInitialized) {
            document.getElementById('transfer-list').innerHTML = '<p>请先开始新游戏</p>';
            document.getElementById('sell-list').innerHTML = '<p>请先开始新游戏</p>';
            document.getElementById('transfer-funds-value').textContent = '0万';
            this.updateSellSquadCount();
            this.updateTransferView();
            return;
        }

        // 更新资金显示
        document.getElementById('transfer-funds-value').textContent = Economy.formatMoney(gameState.playerTeam.cash);

        // 初始化筛选器事件
        this.initFilters();

        // 渲染转会市场和出售列表
        this.renderTransferMarket();
        this.renderSellList();
        this.updateTransferView();
    },

    updateSellSquadCount() {
        const countEl = document.getElementById('sell-squad-count');
        if (!countEl) return;

        const totalPlayers = gameState.isInitialized ? gameState.playerTeam.players.length : 0;
        const maxPlayers = CONFIG.SQUAD_MAX_SIZE;
        countEl.textContent = `球员数量：${totalPlayers} / ${maxPlayers}`;
    },

    initTabs() {
        document.querySelectorAll('.transfer-tab').forEach(button => {
            if (button.hasAttribute('data-initialized')) return;
            button.addEventListener('click', () => {
                this.switchView(button.dataset.transferView || 'buy');
            });
            button.setAttribute('data-initialized', 'true');
        });
    },

    switchView(view) {
        this.currentView = view === 'sell' ? 'sell' : 'buy';
        this.updateTransferView();
    },

    updateTransferView() {
        document.querySelectorAll('.transfer-tab').forEach(button => {
            const isActive = button.dataset.transferView === this.currentView;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });

        document.querySelectorAll('.transfer-view').forEach(panel => {
            const isActive = panel.dataset.transferPanel === this.currentView;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        });
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

    // 切换转会市场排序
    toggleBuySort(sortBy) {
        if (this.buySortBy === sortBy) {
            this.buySortOrder = this.buySortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.buySortBy = sortBy;
            this.buySortOrder = ['ability', 'potential', 'age', 'value', 'wage'].includes(sortBy) ? 'desc' : 'asc';
        }
        this.renderTransferMarket();
    },

    // 对转会市场球员进行排序
    sortBuyPlayers(players) {
        const sortedPlayers = [...players];
        const positionOrder = { 'GK': 1, 'DF': 2, 'MF': 3, 'CF': 4 };

        sortedPlayers.sort((a, b) => {
            let comparison = 0;
            if (this.buySortBy === 'position') {
                comparison = (positionOrder[a.position] || 99) - (positionOrder[b.position] || 99);
            } else if (this.buySortBy === 'name') {
                comparison = a.name.localeCompare(b.name, 'zh-CN');
            } else if (this.buySortBy === 'ability') {
                comparison = a.ability - b.ability;
            } else if (this.buySortBy === 'potential') {
                comparison = a.potential - b.potential;
            } else if (this.buySortBy === 'age') {
                comparison = a.age - b.age;
            } else if (this.buySortBy === 'value') {
                comparison = a.value - b.value;
            } else if (this.buySortBy === 'wage') {
                comparison = (a.salary || a.wage || 0) - (b.salary || b.wage || 0);
            }
            return this.buySortOrder === 'asc' ? comparison : -comparison;
        });
        return sortedPlayers;
    },

    renderTransferMarket() {
        // 如果转会市场为空，生成新球员
        if (gameState.transferMarket.length === 0) {
            gameState.transferMarket = DataGenerator.generateTransferMarket(gameState.currentLeagueLevel, 15);
        }

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

        // 按表头点击排序
        const sortedPlayers = this.sortBuyPlayers(players);

        if (sortedPlayers.length === 0) {
            document.getElementById('transfer-list').innerHTML = '<p class="message message-warning">没有符合条件的球员</p>';
            return;
        }

        const buyHeader = (field, label) => {
            const active = this.buySortBy === field;
            const marker = active ? (this.buySortOrder === 'asc' ? ' ▲' : ' ▼') : '';
            return `<th class="${active ? 'sortable active' : 'sortable'}" onclick="TransferModule.toggleBuySort('${field}')">${label}${marker}</th>`;
        };

        const rows = sortedPlayers.map((player) => {
            const originalIndex = gameState.transferMarket.findIndex(p => p.id === player.id);
            const canAfford = gameState.playerTeam.cash >= player.value;

            return `
                <tr class="${canAfford ? '' : 'insufficient-row'}">
                    <td class="position-code">${player.position}</td>
                    <td class="transfer-player-name">${player.name}</td>
                    <td>${player.ability}</td>
                    <td>${player.potential}</td>
                    <td>${player.age}</td>
                    <td>${Economy.formatMoney(player.value)}</td>
                    <td>${Economy.formatMoney(player.salary || player.wage)}</td>
                    <td>
                        <button class="transfer-action-btn buy"
                                onclick="TransferModule.showBuyModal(${originalIndex})"
                                ${canAfford ? '' : 'disabled'}>
                            购买
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('transfer-list').innerHTML = `
            <table class="transfer-table">
                <thead>
                    <tr>
                        ${buyHeader('position', '位置')}
                        ${buyHeader('name', '姓名')}
                        ${buyHeader('ability', '能力')}
                        ${buyHeader('potential', '潜力')}
                        ${buyHeader('age', '年龄')}
                        ${buyHeader('value', '价值')}
                        ${buyHeader('wage', '工资')}
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
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

    // 切换出售列表排序
    toggleSellSort(sortBy) {
        if (this.sellSortBy === sortBy) {
            this.sellSortOrder = this.sellSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sellSortBy = sortBy;
            this.sellSortOrder = ['ability', 'potential', 'age', 'sellPrice', 'shirtNumber'].includes(sortBy) ? 'desc' : 'asc';
        }
        this.renderSellList();
    },

    // 对出售列表球员进行排序
    sortSellPlayers(players) {
        const sortedPlayers = [...players];
        const positionOrder = { 'GK': 1, 'DF': 2, 'MF': 3, 'CF': 4 };

        sortedPlayers.sort((a, b) => {
            let comparison = 0;
            if (this.sellSortBy === 'status') {
                const aStarting = gameState.playerTeam.startingLineup.includes(a.id) ? 0 : 1;
                const bStarting = gameState.playerTeam.startingLineup.includes(b.id) ? 0 : 1;
                comparison = aStarting - bStarting;
            } else if (this.sellSortBy === 'position') {
                comparison = (positionOrder[a.position] || 99) - (positionOrder[b.position] || 99);
            } else if (this.sellSortBy === 'name') {
                comparison = a.name.localeCompare(b.name, 'zh-CN');
            } else if (this.sellSortBy === 'shirtNumber') {
                comparison = (a.shirtNumber || 999) - (b.shirtNumber || 999);
            } else if (this.sellSortBy === 'ability') {
                comparison = a.ability - b.ability;
            } else if (this.sellSortBy === 'potential') {
                comparison = a.potential - b.potential;
            } else if (this.sellSortBy === 'age') {
                comparison = a.age - b.age;
            } else if (this.sellSortBy === 'sellPrice') {
                comparison = this.calculateSellPrice(a) - this.calculateSellPrice(b);
            }
            return this.sellSortOrder === 'asc' ? comparison : -comparison;
        });
        return sortedPlayers;
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
            'DF': players.filter(p => p.position === 'DF').length,
            'MF': players.filter(p => p.position === 'MF').length,
            'CF': players.filter(p => p.position === 'CF').length
        };

        // 按表头点击排序（同时保存原始索引，以便 onclik showSellModal 正确）
        const indexedPlayers = players.map((p, i) => ({ player: p, originalIndex: i }));
        const sortContext = { sortBy: this.sellSortBy, sortOrder: this.sellSortOrder };
        indexedPlayers.sort((a, b) => {
            const A = a.player, B = b.player;
            let comparison = 0;
            const positionOrder = { 'GK': 1, 'DF': 2, 'MF': 3, 'CF': 4 };
            if (sortContext.sortBy === 'status') {
                const aStarting = startingLineup.includes(A.id) ? 0 : 1;
                const bStarting = startingLineup.includes(B.id) ? 0 : 1;
                comparison = aStarting - bStarting;
            } else if (sortContext.sortBy === 'position') {
                comparison = (positionOrder[A.position] || 99) - (positionOrder[B.position] || 99);
            } else if (sortContext.sortBy === 'name') {
                comparison = A.name.localeCompare(B.name, 'zh-CN');
            } else if (sortContext.sortBy === 'shirtNumber') {
                comparison = (A.shirtNumber || 999) - (B.shirtNumber || 999);
            } else if (sortContext.sortBy === 'ability') {
                comparison = A.ability - B.ability;
            } else if (sortContext.sortBy === 'potential') {
                comparison = A.potential - B.potential;
            } else if (sortContext.sortBy === 'age') {
                comparison = A.age - B.age;
            } else if (sortContext.sortBy === 'sellPrice') {
                comparison = this.calculateSellPrice(A) - this.calculateSellPrice(B);
            }
            return sortContext.sortOrder === 'asc' ? comparison : -comparison;
        });

        const sellHeader = (field, label) => {
            const active = this.sellSortBy === field;
            const marker = active ? (this.sellSortOrder === 'asc' ? ' ▲' : ' ▼') : '';
            return `<th class="${active ? 'sortable active' : 'sortable'}" onclick="TransferModule.toggleSellSort('${field}')">${label}${marker}</th>`;
        };

        const rows = indexedPlayers.map(({ player, originalIndex }) => {
            const isStarting = startingLineup.includes(player.id);
            const sellPrice = this.calculateSellPrice(player);
            const canSell = positionCounts[player.position] > CONFIG.SQUAD_MIN_PLAYERS[player.position];

            return `
                <tr class="${isStarting ? 'starting-row' : ''} ${canSell ? '' : 'locked-row'}">
                    <td>${isStarting ? '首发' : '替补'}</td>
                    <td class="position-code">${player.position}</td>
                    <td>${player.shirtNumber || '-'}</td>
                    <td class="transfer-player-name">${player.name}</td>
                    <td>${player.ability}</td>
                    <td>${player.potential}</td>
                    <td>${player.age}</td>
                    <td>${Economy.formatMoney(sellPrice)}</td>
                    <td>
                        <button class="transfer-action-btn sell"
                                onclick="TransferModule.showSellModal(${originalIndex})"
                                ${canSell ? '' : 'disabled'}>
                            出售
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSellSquadCount();

        document.getElementById('sell-list').innerHTML = `
            <table class="transfer-table">
                <thead>
                    <tr>
                        ${sellHeader('status', '状态')}
                        ${sellHeader('position', '位置')}
                        ${sellHeader('shirtNumber', '号码')}
                        ${sellHeader('name', '姓名')}
                        ${sellHeader('ability', '能力')}
                        ${sellHeader('potential', '潜力')}
                        ${sellHeader('age', '年龄')}
                        ${sellHeader('sellPrice', '售价')}
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
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

        const funds = gameState.playerTeam.cash;
        const remainingFunds = funds - player.value;

        document.getElementById('buy-modal-title').textContent = '购买球员确认';
        document.getElementById('buy-modal-player-info').innerHTML = `
            <div class="details-card" style="background:#fff; color:#1a1a1a;">
                <h4 style="text-align: center; color:#1a1a1a; font-weight:700; margin-bottom:0.75rem;">${player.name}</h4>
                <div class="player-info">
                    <span class="player-info-label">位置:</span>
                    <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">能力值:</span>
                    <span class="player-info-value">${player.ability}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">潜力:</span>
                    <span class="player-info-value">${player.potential}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">年龄:</span>
                    <span class="player-info-value">${player.age}岁</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">购买价格:</span>
                    <span class="player-info-value" style="color:#c0392b; font-weight:700;">${Economy.formatMoney(player.value)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">周薪:</span>
                    <span class="player-info-value">${Economy.formatMoney(player.salary || player.wage)}</span>
                </div>
                <hr style="margin:1rem 0; border-top:1px solid #888; border-left:none; border-right:none; border-bottom:none;">
                <div class="player-info">
                    <span class="player-info-label">当前资金:</span>
                    <span class="player-info-value">${Economy.formatMoney(funds)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">购买后剩余:</span>
                    <span class="player-info-value" style="color:${remainingFunds >= 0 ? '#27ae60' : '#c0392b'}; font-weight:700;">
                        ${Economy.formatMoney(remainingFunds)}
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

        // 扣除资金，现金允许为负
        gameState.playerTeam.cash = Economy.roundMoney(gameState.playerTeam.cash - player.value);

        // 球员加入球队
        gameState.playerTeam.players.push(player);
        gameState.playerTeam.assignShirtNumbers();

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
        this.showMessage(`成功签下 ${player.name}！花费 ${Economy.formatMoney(player.value)}`, 'success');
    },

    // 显示出售确认模态框
    showSellModal(index) {
        const player = gameState.playerTeam.players[index];
        if (!player) return;

        this.selectedSellPlayer = player;
        this.selectedSellPlayerIndex = index;

        const sellPrice = this.calculateSellPrice(player);
        const funds = gameState.playerTeam.cash;
        const newFunds = funds + sellPrice;

        document.getElementById('sell-modal-title').textContent = '出售球员确认';
        document.getElementById('sell-modal-player-info').innerHTML = `
            <div class="details-card" style="background:#fff; color:#1a1a1a;">
                <h4 style="text-align: center; color:#1a1a1a; font-weight:700; margin-bottom:0.75rem;">${player.name}</h4>
                <div class="player-info">
                    <span class="player-info-label">位置:</span>
                    <span class="player-info-value">${CONFIG.POSITION_NAMES[player.position]}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">能力值:</span>
                    <span class="player-info-value">${player.ability}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">潜力:</span>
                    <span class="player-info-value">${player.potential}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">年龄:</span>
                    <span class="player-info-value">${player.age}岁</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">身价:</span>
                    <span class="player-info-value">${Economy.formatMoney(player.value)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">出售价格:</span>
                    <span class="player-info-value" style="color:#27ae60; font-weight:700;">${Economy.formatMoney(sellPrice)}</span>
                </div>
                <hr style="margin:1rem 0; border-top:1px solid #888; border-left:none; border-right:none; border-bottom:none;">
                <div class="player-info">
                    <span class="player-info-label">当前资金:</span>
                    <span class="player-info-value">${Economy.formatMoney(funds)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">出售后资金:</span>
                    <span class="player-info-value" style="color:#27ae60; font-weight:700;">
                        ${Economy.formatMoney(newFunds)}
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
        gameState.playerTeam.cash = Economy.roundMoney(gameState.playerTeam.cash + sellPrice);

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
        this.showMessage(`成功出售 ${player.name}！获得 ${Economy.formatMoney(sellPrice)}`, 'success');
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
