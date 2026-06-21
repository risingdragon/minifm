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

        document.getElementById('advance-game-btn').addEventListener('click', () => {
            this.advanceGame();
        });

        this.updateAdvanceButton();

        console.log('游戏初始化完成！');
    },

    checkSavedGame() {
        if (Storage.hasSave()) {
            document.getElementById('load-game-btn').disabled = false;
        }
    },

    updateAdvanceButton() {
        const advanceBtn = document.getElementById('advance-game-btn');
        if (!advanceBtn) return;

        advanceBtn.hidden = !gameState.isInitialized;
        advanceBtn.disabled = !gameState.isInitialized;
    },

    advanceGame() {
        if (!gameState.isInitialized) return;
        if (Navigation.currentPage !== 'match') {
            Navigation.navigateTo('match');
        }
        MatchModule.advanceGame();
        this.updateAdvanceButton();
    },

    startNewGame() {
        if (Storage.hasSave() && !confirm('开始新游戏将覆盖现有存档，确定继续吗？')) {
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
        gameState.isInitialized = true;

        // 生成初始转会市场
        gameState.transferMarket = DataGenerator.generateTransferMarket(gameState.currentLeagueLevel, 15);

        // 保存游戏
        Storage.save(gameState);

        // 启动自动保存
        Storage.startAutoSave();

        alert(`新游戏已创建！\n你的球队"${gameState.playerTeam.name}"已加入第${gameState.currentLeagueLevel}级联赛。\n球队资金: ${Economy.formatMoney(gameState.playerTeam.cash)}\n球员数量: ${gameState.playerTeam.players.length}人`);

        // 启用继续游戏按钮
        document.getElementById('load-game-btn').disabled = false;
        this.updateAdvanceButton();

        // 跳转到球队页面
        Navigation.navigateTo('team');
    },

    loadGame() {
        const savedGame = Storage.load();
        if (savedGame) {
            gameState = savedGame;
            gameState.isInitialized = true;

            if (this.repairSchedulesIfNeeded()) {
                Storage.save(gameState);
            }
            
            // 启动自动保存
            Storage.startAutoSave();

            this.updateAdvanceButton();
            
            Navigation.navigateTo('team');
        }
    },

    repairSchedulesIfNeeded() {
        if (!Array.isArray(gameState.leagues)) return false;

        let repaired = false;
        for (const league of gameState.leagues) {
            if (league && typeof league.repairScheduleIfNeeded === 'function') {
                repaired = league.repairScheduleIfNeeded() || repaired;
            }
        }

        return repaired;
    }
};

// ========================================
// 启动游戏
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
