// 极简足球经理 - 主应用文件

// ==================== 游戏状态管理 ====================
const GameState = {
    isGameStarted: false,
    playerTeam: null,
    currentRound: 1,
    currentSeason: 1,
    
    // 检查是否有存档
    hasSaveData() {
        return localStorage.getItem('footballManagerSave') !== null;
    },
    
    // 保存游戏
    save(data) {
        try {
            localStorage.setItem('footballManagerSave', JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存游戏失败:', e);
            return false;
        }
    },
    
    // 加载游戏
    load() {
        try {
            const data = localStorage.getItem('footballManagerSave');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('加载游戏失败:', e);
            return null;
        }
    },
    
    // 清除存档
    clearSave() {
        localStorage.removeItem('footballManagerSave');
    }
};

// ==================== 导航管理 ====================
const Navigation = {
    currentPage: 'dashboard',
    
    init() {
        // 绑定导航点击事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
        
        // 绑定快捷操作按钮
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });
    },
    
    navigateTo(page) {
        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        // 切换页面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}-page`)?.classList.add('active');
        
        this.currentPage = page;
        
        // 触发页面加载事件
        this.onPageLoad(page);
    },
    
    onPageLoad(page) {
        // 根据页面加载相应数据
        switch(page) {
            case 'dashboard':
                Dashboard.update();
                break;
            case 'team':
                console.log('加载球队页面');
                break;
            case 'transfer':
                console.log('加载转会市场页面');
                break;
            case 'match':
                console.log('加载比赛页面');
                break;
            case 'standings':
                console.log('加载积分榜页面');
                break;
        }
    },
    
    handleAction(action) {
        switch(action) {
            case 'next-match':
                this.navigateTo('match');
                break;
            case 'manage-team':
                this.navigateTo('team');
                break;
            case 'transfer-market':
                this.navigateTo('transfer');
                break;
        }
    }
};

// ==================== 仪表板管理 ====================
const Dashboard = {
    update() {
        if (!GameState.isGameStarted || !GameState.playerTeam) {
            return;
        }
        
        // 更新球队信息
        document.getElementById('team-name').textContent = GameState.playerTeam.name || '-';
        document.getElementById('current-league').textContent = GameState.playerTeam.league || '-';
        document.getElementById('league-rank').textContent = GameState.playerTeam.rank || '-';
        
        // 更新财务信息
        document.getElementById('available-funds').textContent = this.formatMoney(GameState.playerTeam.funds || 0);
        document.getElementById('weekly-wages').textContent = this.formatMoney(GameState.playerTeam.weeklyWages || 0);
        
        // 更新球队统计
        document.getElementById('player-count').textContent = GameState.playerTeam.playerCount || 0;
        document.getElementById('avg-ability').textContent = GameState.playerTeam.avgAbility || '-';
        document.getElementById('team-value').textContent = this.formatMoney(GameState.playerTeam.totalValue || 0);
        
        // 更新赛季进度
        document.getElementById('current-round').textContent = `${GameState.currentRound || 1} / 38`;
        document.getElementById('season-record').textContent = GameState.playerTeam.record || '-';
        document.getElementById('season-points').textContent = GameState.playerTeam.points || 0;
        
        // 更新顶部信息
        document.getElementById('header-team-name').textContent = GameState.playerTeam.name || '';
        document.getElementById('header-funds').textContent = this.formatMoney(GameState.playerTeam.funds || 0);
    },
    
    formatMoney(amount) {
        if (amount >= 1000000) {
            return `€${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `€${(amount / 1000).toFixed(0)}K`;
        }
        return `€${amount}`;
    }
};

// ==================== 游戏初始化 ====================
const Game = {
    init() {
        // 检查是否有存档
        if (GameState.hasSaveData()) {
            document.getElementById('continue-game-btn').style.display = 'block';
        }
        
        // 绑定开始按钮事件
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('continue-game-btn').addEventListener('click', () => {
            this.continueGame();
        });
        
        // 初始化导航
        Navigation.init();
    },
    
    startNewGame() {
        // 清除旧存档
        GameState.clearSave();
        
        // 初始化新游戏数据（这里使用模拟数据，实际游戏需要完整的数据生成逻辑）
        const newGameData = {
            playerTeam: {
                name: '我的球队',
                league: '第6级联赛',
                rank: 1,
                funds: 5000000,
                weeklyWages: 50000,
                playerCount: 25,
                avgAbility: 75,
                totalValue: 10000000,
                record: '0胜0平0负',
                points: 0
            },
            currentRound: 1,
            currentSeason: 1,
            createdAt: new Date().toISOString()
        };
        
        // 保存游戏
        GameState.save(newGameData);
        
        // 更新游戏状态
        GameState.isGameStarted = true;
        GameState.playerTeam = newGameData.playerTeam;
        GameState.currentRound = newGameData.currentRound;
        GameState.currentSeason = newGameData.currentSeason;
        
        // 切换到游戏界面
        this.showGameScreen();
    },
    
    continueGame() {
        // 加载存档
        const saveData = GameState.load();
        
        if (!saveData) {
            alert('无法加载游戏存档！');
            return;
        }
        
        // 更新游戏状态
        GameState.isGameStarted = true;
        GameState.playerTeam = saveData.playerTeam;
        GameState.currentRound = saveData.currentRound;
        GameState.currentSeason = saveData.currentSeason;
        
        // 切换到游戏界面
        this.showGameScreen();
    },
    
    showGameScreen() {
        // 隐藏开始界面
        document.getElementById('start-screen').classList.remove('active');
        
        // 显示游戏界面
        document.getElementById('game-screen').classList.add('active');
        
        // 更新仪表板
        Dashboard.update();
    }
};

// ==================== 应用启动 ====================
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});