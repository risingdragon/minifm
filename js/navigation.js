// ========================================
// 导航模块
// ========================================
const Navigation = {
    currentPage: 'home',

    init() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });
    },

    navigateTo(pageName) {
        // 更新按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageName) {
                btn.classList.add('active');
            }
        });

        // 更新页面显示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = pageName;

        // 触发页面加载事件
        this.onPageLoad(pageName);
    },

    onPageLoad(pageName) {
        switch (pageName) {
            case 'team':
                TeamModule.render();
                break;
            case 'transfer':
                TransferModule.render();
                break;
            case 'match':
                MatchModule.render();
                break;
            case 'league':
                LeagueModule.render();
                break;
        }
    }
};

