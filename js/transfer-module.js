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
            document.getElementById('transfer-funds-value').textContent = '0万';
            return;
        }

        // 更新资金显示
        document.getElementById('transfer-funds-value').textContent = Economy.formatMoney(gameState.playerTeam.cash);

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

        const funds = gameState.playerTeam.cash;

        const html = filteredPlayers.map((player) => {
            // 找到球员在原始数组中的索引
            const originalIndex = gameState.transferMarket.findIndex(p => p.id === player.id);
            const canAfford = true;

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
                        <span class="player-info-value">${Economy.formatMoney(player.value)}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">周薪:</span>
                        <span class="player-info-value">${Economy.formatMoney(player.wage)}/场</span>
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
            'DF': players.filter(p => p.position === 'DF').length,
            'MF': players.filter(p => p.position === 'MF').length,
            'CF': players.filter(p => p.position === 'CF').length
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
                        <span class="player-info-value">${Economy.formatMoney(player.value)}</span>
                    </div>
                    <div class="player-info">
                        <span class="player-info-label">出售价格:</span>
                        <span class="sell-price">${Economy.formatMoney(sellPrice)}</span>
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

        const funds = gameState.playerTeam.cash;
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
                    <span class="player-info-value" style="color: var(--accent-color); font-weight: bold;">${Economy.formatMoney(player.value)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">周薪:</span>
                    <span class="player-info-value">${Economy.formatMoney(player.wage)}/场</span>
                </div>
                <hr style="margin: 1rem 0; border-color: var(--border-color);">
                <div class="player-info">
                    <span class="player-info-label">当前资金:</span>
                    <span class="player-info-value">${Economy.formatMoney(funds)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">购买后剩余:</span>
                    <span class="player-info-value" style="color: ${remainingFunds >= 0 ? 'var(--success-color)' : 'var(--accent-color)'};">
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
                    <span class="player-info-value">${Economy.formatMoney(player.value)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">出售价格:</span>
                    <span class="player-info-value" style="color: var(--success-color); font-weight: bold;">${Economy.formatMoney(sellPrice)}</span>
                </div>
                <hr style="margin: 1rem 0; border-color: var(--border-color);">
                <div class="player-info">
                    <span class="player-info-label">当前资金:</span>
                    <span class="player-info-value">${Economy.formatMoney(funds)}</span>
                </div>
                <div class="player-info">
                    <span class="player-info-label">出售后资金:</span>
                    <span class="player-info-value" style="color: var(--success-color); font-weight: bold;">
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
