import { useEffect, useMemo, useState, type ReactNode } from 'react';
import jerseyImage from '../../assets/lineup-jersey.png';
import { resetGame, startNewSeason, loadGame, saveGame } from '../data/storage';
import { selectAutoLineup, detectLineupWarnings } from '../game/lineup';
import { calculateTeamAnnualWages, calculateWageHealthPercent, getLeagueAnnualRevenue } from '../game/finance';
import { getSeasonMovement } from '../game/season';
import { simulateRound } from '../game/simulator';
import { calculateStandings } from '../game/standings';
import { buyPlayer, countRegularPlayers, createTransferMarket, MAX_REGULAR_PLAYERS_PER_TEAM, MIN_REGULAR_PLAYERS_PER_TEAM, sellPlayer } from '../game/transfer';
import type { FinanceSummary, GameState, League, Match, Player, PlayerGrowthChange, Position, Standing, Team, View } from '../models/types';

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [view, setView] = useState<View>('dashboard');
  const userTeam = game.teams.find((team) => team.id === game.userTeamId) ?? game.teams.find((team) => team.isUserControlled) ?? game.teams[0];
  const userLeague = findLeague(game.leagues, userTeam.leagueId);
  const [selectedLeagueId, setSelectedLeagueId] = useState(userLeague.id);
  const currentLeagueMatches = getLeagueRoundMatches(game, userLeague.id, userLeague.currentRound);
  const currentRoundMatches = getAllCurrentRoundMatches(game);
  const userMatch = currentLeagueMatches.find((match) => match.homeTeamId === userTeam.id || match.awayTeamId === userTeam.id);
  const standingsByLeague = useMemo(() => getStandingsByLeague(game), [game]);
  const userStandings = standingsByLeague[userLeague.id] ?? [];
  const seasonFinished = game.leagues.every((league) => league.currentRound > league.totalRounds);
  const roundComplete = isRoundComplete(currentRoundMatches);
  const seasonMovement = useMemo(() => (seasonFinished ? getSeasonMovement(game) : { promoted: [], relegated: [] }), [game, seasonFinished]);

  useEffect(() => {
    saveGame(game);
  }, [game]);

  useEffect(() => {
    setSelectedLeagueId(userLeague.id);
  }, [userLeague.id]);

  useEffect(() => {
    if (seasonFinished) {
      setView('seasonEnd');
    }
  }, [seasonFinished]);

  function handleAutoLineup(): void {
    const nextPlayers = game.players;
    const userPlayers = selectAutoLineup(userTeam, nextPlayers);
    setGame({
      ...game,
      players: [...nextPlayers.filter((player) => player.teamId !== userTeam.id), ...userPlayers],
    });
  }

  function handleSimulateRound(): void {
    const result = simulateRound(
      userLeague.currentRound,
      game.matches,
      game.teams,
      game.players,
      game.seasonHomeIncomeByLeague,
      game.leagueSystem.season,
      userTeam.id,
    );
    setGame({
      ...game,
      teams: result.teams,
      matches: result.matches,
      players: result.players,
      financeLogs: [...game.financeLogs, ...result.financeLogs],
      lastFinanceSummary: result.financeSummary,
      lastGrowthChanges: result.growthChanges,
      seasonGrowthChanges: [...(game.seasonGrowthChanges || []), ...result.growthChanges],
    });
    setView('match');
  }

  function handleNextRound(): void {
    if (!roundComplete) {
      return;
    }

    const leagues = game.leagues.map((league) => ({
      ...league,
      currentRound: league.currentRound + 1,
    }));
    const nextRound = findLeague(leagues, userLeague.id).currentRound;

    setGame({
      ...game,
      leagues,
      transferMarket: createTransferMarket(game.players, game.userTeamId, game.leagueSystem.season, nextRound),
    });
    setView(leagues.every((league) => league.currentRound > league.totalRounds) ? 'seasonEnd' : 'dashboard');
  }

  function handleStartNextSeason(): void {
    const nextGame = startNewSeason(game);
    setGame(nextGame);
    setView('dashboard');
  }

  function handleContinue(): void {
    if (seasonFinished) {
      handleStartNextSeason();
      return;
    }

    if (roundComplete) {
      handleNextRound();
      return;
    }

    handleSimulateRound();
  }

  function handleBuyPlayer(playerId: string): void {
    setGame((current) => buyPlayer(current, playerId));
  }

  function handleSellPlayer(playerId: string): void {
    setGame((current) => sellPlayer(current, playerId));
  }

  function handleReset(): void {
    const freshGame = resetGame();
    setGame(freshGame);
    setView('dashboard');
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">mF</div>
          <div>
            <strong>迷你足球经理</strong>
            <span>第 {game.leagueSystem.season} 赛季</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="主导航">
          <NavButton label="首页" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavButton label="阵容" active={view === 'squad'} onClick={() => setView('squad')} />
          <NavButton label="比赛" active={view === 'match'} onClick={() => setView('match')} />
          <NavButton label="积分榜" active={view === 'standings'} onClick={() => setView('standings')} />
          <NavButton label="转会" active={view === 'transfers'} onClick={() => setView('transfers')} />

        </nav>

        <button className="continue-button" type="button" onClick={handleContinue}>
          继续
        </button>

        <button className="secondary-button" type="button" onClick={handleReset}>
          重新开始
        </button>
      </aside>

      <section className="content">
        {view === 'dashboard' && (
          <DashboardPage
            game={game}
            userTeam={userTeam}
            userLeague={userLeague}
            userMatch={userMatch}
            standings={userStandings}
          />
        )}

        {view === 'squad' && (
          <SquadPage
            team={userTeam}
            league={userLeague}
            players={game.players.filter((player) => player.teamId === userTeam.id)}
            onAutoLineup={handleAutoLineup}
            onSellPlayer={handleSellPlayer}
          />
        )}

        {view === 'match' && (
          <MatchPage
            game={game}
            userTeam={userTeam}
            userLeague={userLeague}
            userMatch={userMatch}
            currentRoundMatches={currentLeagueMatches}
            roundComplete={roundComplete}
            seasonFinished={seasonFinished}
            standings={userStandings}
            movement={seasonMovement}
            seasonGrowthChanges={game.seasonGrowthChanges || []}
          />
        )}

        {view === 'standings' && (
          <StandingsPage
            game={game}
            standingsByLeague={standingsByLeague}
            selectedLeagueId={selectedLeagueId}
            onSelectLeague={setSelectedLeagueId}
          />
        )}

        {view === 'transfers' && (
          <TransferMarketPage
            game={game}
            userTeam={userTeam}
            onBuyPlayer={handleBuyPlayer}
          />
        )}

        {view === 'seasonEnd' && (
          <SeasonEndPage
            game={game}
            userTeam={userTeam}
            userLeague={userLeague}
            standings={userStandings}
            movement={seasonMovement}
            seasonGrowthChanges={game.seasonGrowthChanges || []}
            onStartNextSeason={handleStartNextSeason}
            onReset={handleReset}
          />
        )}
      </section>
    </main>
  );
}

function DashboardPage({
  game,
  userTeam,
  userLeague,
  userMatch,
  standings,
}: {
  game: GameState;
  userTeam: Team;
  userLeague: League;
  userMatch?: Match;
  standings: Standing[];
}) {
  const rank = standings.findIndex((standing) => standing.teamId === userTeam.id) + 1;
  const opponentId = userMatch?.homeTeamId === userTeam.id ? userMatch.awayTeamId : userMatch?.homeTeamId;
  const opponent = game.teams.find((team) => team.id === opponentId);
  const userPlayers = game.players.filter((player) => player.teamId === userTeam.id);
  const annualRevenue = getLeagueAnnualRevenue(userLeague.level);
  const annualWages = calculateTeamAnnualWages(userTeam.id, game.players);
  const wageHealthPercent = calculateWageHealthPercent(userTeam, game.players);
  const wageHealth = getWageHealthStatus(wageHealthPercent);
  const lineupWarnings = detectLineupWarnings(userTeam, game.players);
  const retirementWarnings = userPlayers
    .filter((player) => player.age >= 30)
    .sort((a, b) => b.age - a.age || b.weeklyWage - a.weeklyWage)
    .slice(0, 4);
  const promotedYouthPlayers = (game.lastYouthPlayerIds ?? [])
    .map((playerId) => game.players.find((player) => player.id === playerId && player.teamId === userTeam.id))
    .filter((player): player is Player => Boolean(player));
  const showYouthPromotion =
    promotedYouthPlayers.length > 0 &&
    game.leagues.every((league) => league.currentRound === 1) &&
    game.matches.filter((match) => match.round === 1).every((match) => match.status === 'scheduled');

  return (
    <>
      <header className="page-header hero-band">
        <div>
          <span className="eyebrow">{userLeague.name}</span>
          <h1>{userTeam.name}</h1>
          <p>
            第 {Math.min(userLeague.currentRound, userLeague.totalRounds)} / {userLeague.totalRounds} 轮，
            当前排名第 {rank || '-'}。
          </p>
        </div>
        <img className="jersey-art" src={jerseyImage} alt="" />
      </header>

      {showYouthPromotion && (
        <section className="growth-panel">
          <div>
            <span className="eyebrow">新赛季提拔</span>
            <h2>16 岁新秀加入一线队</h2>
          </div>
          <div className="growth-list">
            {promotedYouthPlayers.map((player) => (
              <div className="growth-item" key={player.id}>
                <span>{player.name}</span>
                <strong>{player.position}</strong>
                <small>能力 {player.overall} · 潜力 {player.potential}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {lineupWarnings.length > 0 && (
        <section className="warning-band">
          <div className="warning-header">
            <span>阵容提示</span>
          </div>
          <div className="warning-list">
            {lineupWarnings.slice(0, 3).map((warning, index) => (
              <div key={index} className="warning-item">
                <span className="warning-position">{warning.position}</span>
                <span className="warning-substitute">{warning.substitute.name} ({warning.substitute.overall})</span>
                <span className="warning-arrow">→</span>
                <span className="warning-starter">{warning.starter.name} ({warning.starter.overall})</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {retirementWarnings.length > 0 && (
        <section className="warning-band retirement-band">
          <div className="warning-header">
            <span>35 岁退役预警</span>
          </div>
          <div className="warning-list">
            {retirementWarnings.map((player) => (
              <div key={player.id} className="warning-item">
                <span className="warning-position">{player.age} 岁</span>
                <span className="warning-substitute">{player.name}</span>
                <span>{getRetirementMessage(player)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="summary-grid">
        <InfoPanel title="所在级别">
          <strong>{formatLeagueLevel(userLeague)}</strong>
        </InfoPanel>
        <InfoPanel title="现金余额">
          <strong>{formatMoney(userTeam.balance)}</strong>
        </InfoPanel>
        <InfoPanel title="下一场">
          <strong>{opponent ? opponent.name : '赛季结束'}</strong>
          <span>{userMatch ? formatVenue(userMatch, userTeam.id) : '对手尚未确定'}</span>
        </InfoPanel>
      </section>

      <section className="summary-grid">
        <InfoPanel title="赛季营收">
          <strong>{formatMoney(annualRevenue)}</strong>
          <span>转播 + 赞助</span>
        </InfoPanel>
        <InfoPanel title="全队年薪">
          <strong>{formatMoney(annualWages)}</strong>
          <span>周薪 × 52</span>
        </InfoPanel>
        <InfoPanel title="薪资健康度">
          <strong>{formatPercent(wageHealthPercent)}</strong>
          <span className={wageHealth.className}>{wageHealth.label}</span>
        </InfoPanel>
      </section>
    </>
  );
}

function SquadPage({
  team,
  league,
  players,
  onAutoLineup,
  onSellPlayer,
}: {
  team: Team;
  league: League;
  players: Player[];
  onAutoLineup: () => void;
  onSellPlayer: (playerId: string) => void;
}) {
  const [sort, setSort] = useState<SquadSortState>({ key: 'status', direction: 'asc' });
  const regularPlayerCount = players.length;

  function handleSort(key: SquadSortKey): void {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const orderedPlayers = [...players].sort((a, b) => compareSquadPlayers(a, b, sort));

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">{league.name}</span>
          <h1>{team.name}</h1>
        </div>
        <button type="button" onClick={onAutoLineup}>最强阵容</button>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader label="状态" sortKey="status" sort={sort} onSort={handleSort} />
              <SortableHeader label="姓名" sortKey="name" sort={sort} onSort={handleSort} />
              <SortableHeader label="年龄" sortKey="age" sort={sort} onSort={handleSort} />
              <SortableHeader label="位置" sortKey="position" sort={sort} onSort={handleSort} />
              <SortableHeader label="能力" sortKey="overall" sort={sort} onSort={handleSort} />
              <SortableHeader label="潜力" sortKey="potential" sort={sort} onSort={handleSort} />
              <SortableHeader label="身价" sortKey="marketValue" sort={sort} onSort={handleSort} />
              <SortableHeader label="周薪" sortKey="weeklyWage" sort={sort} onSort={handleSort} />
              <SortableHeader label="合同" sortKey="contractYears" sort={sort} onSort={handleSort} />
              <th>退役预警</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {orderedPlayers.map((player) => {
              const cannotSell = regularPlayerCount <= MIN_REGULAR_PLAYERS_PER_TEAM;
              return (
                <tr key={player.id}>
                  <td>{player.isStarter ? <span className="tag">首发</span> : <span className="muted">替补</span>}</td>
                  <td>{player.name}</td>
                  <td>{player.age}</td>
                  <td>{player.position}</td>
                  <td><strong>{player.overall}</strong></td>
                  <td>{player.potential}</td>
                  <td>{formatMoney(player.marketValue)}</td>
                  <td>{formatWeeklyWage(player.weeklyWage)}</td>
                  <td>{player.contractYears} 年</td>
                  <td>{renderRetirementTag(player)}</td>
                  <td>
                    <button type="button" disabled={cannotSell} onClick={() => onSellPlayer(player.id)}>
                      卖出
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MatchPage({
  game,
  userTeam,
  userLeague,
  userMatch,
  currentRoundMatches,
  roundComplete,
  seasonFinished,
  standings,
  movement,
  seasonGrowthChanges,
}: {
  game: GameState;
  userTeam: Team;
  userLeague: League;
  userMatch?: Match;
  currentRoundMatches: Match[];
  roundComplete: boolean;
  seasonFinished: boolean;
  standings: Standing[];
  movement: { promoted: Team[]; relegated: Team[] };
  seasonGrowthChanges: PlayerGrowthChange[];
}) {
  const userPlayers = game.players.filter((player) => player.teamId === userTeam.id);

  // 赛季结束时显示赛季总结
  if (seasonFinished) {
    const userRank = standings.findIndex((standing) => standing.teamId === userTeam.id) + 1;
    const userLeagueStandings = getStandingsByLeague(game)[userLeague.id] ?? [];
    const userLeagueChampionStanding = userLeagueStandings[0];
    const userLeagueChampion = userLeagueChampionStanding ? findTeam(game.teams, userLeagueChampionStanding.teamId) : undefined;
    const userTeamPlayerIds = new Set(userPlayers.map((player) => player.id));
    const aggregatedChanges = aggregateGrowthChanges(seasonGrowthChanges).filter((change) => userTeamPlayerIds.has(change.playerId));
    const topGrowth = aggregatedChanges.filter((change) => change.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    const topDecline = aggregatedChanges.filter((change) => change.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);

    return (
      <>
        <header className="page-header hero-band">
          <div>
            <span className="eyebrow">第 {game.leagueSystem.season} 赛季结束</span>
            <h1>{userTeam.name} 排名第 {userRank || '-'}</h1>
            <p>{formatLeagueLevel(userLeague)}冠军：{userLeagueChampion?.name ?? '待定'}。</p>
          </div>
        </header>

        <section className="summary-grid">
          <InfoPanel title="升级球队">
            <strong>{movement.promoted.map((team) => team.name).join('、') || '-'}</strong>
          </InfoPanel>
          <InfoPanel title="降级球队">
            <strong>{movement.relegated.map((team) => team.name).join('、') || '-'}</strong>
          </InfoPanel>
          <InfoPanel title="下一赛季">
            <strong>第 {parseInt(game.leagueSystem.season, 10) + 1} 赛季</strong>
          </InfoPanel>
        </section>

        <section className="growth-panel">
          <div>
            <span className="eyebrow">赛季成长总结</span>
            <h2>球员能力变化</h2>
          </div>
          <div className="growth-summary-grid">
            <SeasonGrowthList title="成长最快" changes={topGrowth} players={game.players} positive />
            <SeasonGrowthList title="衰退最大" changes={topDecline} players={game.players} />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">{userLeague.name} · 第 {Math.min(userLeague.currentRound, userLeague.totalRounds)} 轮</span>
          <h1>比赛中心</h1>
        </div>
      </header>

      {userMatch && (
        <section className="scoreboard">
          <TeamScore team={findTeam(game.teams, userMatch.homeTeamId)} score={userMatch.homeScore} highlight={userMatch.homeTeamId === userTeam.id} />
          <span className="score-divider">:</span>
          <TeamScore team={findTeam(game.teams, userMatch.awayTeamId)} score={userMatch.awayScore} highlight={userMatch.awayTeamId === userTeam.id} />
        </section>
      )}

      <div className="fixture-list">
        {currentRoundMatches.map((match) => (
          <div className="fixture" key={match.id}>
            <span>{findTeam(game.teams, match.homeTeamId).name}</span>
            <strong>{match.status === 'played' ? `${match.homeScore} - ${match.awayScore}` : 'vs'}</strong>
            <span>{findTeam(game.teams, match.awayTeamId).name}</span>
          </div>
        ))}
      </div>

      {roundComplete && (
        <>
          <FinanceSummaryPanel summary={game.lastFinanceSummary ?? { revenueIncome: 0, wageExpense: 0, net: 0 }} />
          <GrowthSummary changes={game.lastGrowthChanges ?? []} players={userPlayers} />
        </>
      )}
    </>
  );
}

function TransferMarketPage({ game, userTeam, onBuyPlayer }: { game: GameState; userTeam: Team; onBuyPlayer: (playerId: string) => void }) {
  const [sort, setSort] = useState<TransferSortState>({ key: 'marketValue', direction: 'desc' });
  const [positionFilter, setPositionFilter] = useState<TransferPositionFilter>('ALL');
  const [ageFilter, setAgeFilter] = useState<TransferAgeFilter>('ALL');
  const marketPlayers = game.transferMarket.listedPlayerIds
    .map((playerId) => game.players.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player))
    .filter((player) => positionFilter === 'ALL' || player.position === positionFilter)
    .filter((player) => ageFilter === 'ALL' || player.age < 30)
    .sort((a, b) => compareTransferPlayers(a, b, game.teams, sort));

  function handleSort(key: TransferSortKey): void {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">转会市场</span>
          <h1>可购买球员</h1>
          <p>当前余额：{formatMoney(userTeam.balance)}</p>
        </div>
      </header>
      <section className="filter-row" aria-label="位置筛选">
        {TRANSFER_POSITION_FILTERS.map((option) => (
          <button
            className={positionFilter === option.value ? 'filter-button active' : 'filter-button'}
            type="button"
            key={option.value}
            onClick={() => setPositionFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </section>
      <section className="filter-row" aria-label="年龄筛选">
        {TRANSFER_AGE_FILTERS.map((option) => (
          <button
            className={ageFilter === option.value ? 'filter-button active' : 'filter-button'}
            type="button"
            key={option.value}
            onClick={() => setAgeFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader label="球员" sortKey="name" sort={sort} onSort={handleSort} />
              <SortableHeader label="球队" sortKey="team" sort={sort} onSort={handleSort} />
              <SortableHeader label="年龄" sortKey="age" sort={sort} onSort={handleSort} />
              <SortableHeader label="位置" sortKey="position" sort={sort} onSort={handleSort} />
              <SortableHeader label="能力" sortKey="overall" sort={sort} onSort={handleSort} />
              <SortableHeader label="潜力" sortKey="potential" sort={sort} onSort={handleSort} />
              <SortableHeader label="身价" sortKey="marketValue" sort={sort} onSort={handleSort} />
              <SortableHeader label="周薪" sortKey="weeklyWage" sort={sort} onSort={handleSort} />
              <SortableHeader label="合同" sortKey="contractYears" sort={sort} onSort={handleSort} />
              <th>退役预警</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {marketPlayers.map((player) => {
              const seller = findTeam(game.teams, player.teamId);
              const cannotBuy =
                userTeam.balance < player.marketValue ||
                countRegularPlayers(game.players, userTeam.id) >= MAX_REGULAR_PLAYERS_PER_TEAM ||
                countRegularPlayers(game.players, seller.id) <= MIN_REGULAR_PLAYERS_PER_TEAM;
              return (
                <tr key={player.id}>
                  <td><strong>{player.name}</strong></td>
                  <td>{seller.name}</td>
                  <td>{player.age}</td>
                  <td>{player.position}</td>
                  <td>{player.overall}</td>
                  <td>{player.potential}</td>
                  <td>{formatMoney(player.marketValue)}</td>
                  <td>{formatWeeklyWage(player.weeklyWage)}</td>
                  <td>{player.contractYears} 年</td>
                  <td>{renderRetirementTag(player)}</td>
                  <td>
                    <button type="button" disabled={cannotBuy} onClick={() => onBuyPlayer(player.id)}>购买</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

type TransferSortKey = 'name' | 'team' | 'age' | 'position' | 'overall' | 'potential' | 'marketValue' | 'weeklyWage' | 'contractYears';
type TransferPositionFilter = 'ALL' | Position;
type TransferSortState = {
  key: TransferSortKey;
  direction: 'asc' | 'desc';
};

const TRANSFER_POSITION_FILTERS: Array<{ label: string; value: TransferPositionFilter }> = [
  { label: '全部', value: 'ALL' },
  { label: 'GK', value: 'GK' },
  { label: 'DF', value: 'DF' },
  { label: 'MF', value: 'MF' },
  { label: 'FW', value: 'FW' },
];

type TransferAgeFilter = 'ALL' | 'UNDER_30';

const TRANSFER_AGE_FILTERS: Array<{ label: string; value: TransferAgeFilter }> = [
  { label: '全部年龄', value: 'ALL' },
  { label: '30岁以下', value: 'UNDER_30' },
];

function compareTransferPlayers(a: Player, b: Player, teams: Team[], sort: TransferSortState): number {
  const direction = sort.direction === 'asc' ? 1 : -1;
  const aValue = getTransferSortValue(a, teams, sort.key);
  const bValue = getTransferSortValue(b, teams, sort.key);
  const result =
    typeof aValue === 'number' && typeof bValue === 'number'
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue), 'zh-CN');

  return (result || a.name.localeCompare(b.name, 'zh-CN')) * direction;
}

function getTransferSortValue(player: Player, teams: Team[], key: TransferSortKey): string | number {
  switch (key) {
    case 'name':
      return player.name;
    case 'team':
      return teams.find((team) => team.id === player.teamId)?.name ?? '';
    case 'age':
      return player.age;
    case 'position':
      return player.position;
    case 'overall':
      return player.overall;
    case 'potential':
      return player.potential;
    case 'marketValue':
      return player.marketValue;
    case 'weeklyWage':
      return player.weeklyWage;
    case 'contractYears':
      return player.contractYears;
  }
}

type SquadSortKey = 'status' | 'name' | 'age' | 'position' | 'overall' | 'potential' | 'marketValue' | 'weeklyWage' | 'contractYears';
type SquadSortState = {
  key: SquadSortKey;
  direction: 'asc' | 'desc';
};

interface SortableHeaderProps<T extends string> {
  label: string;
  sortKey: T;
  sort: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: T) => void;
}

function SortableHeader<T extends string>({ label, sortKey, sort, onSort }: SortableHeaderProps<T>) {
  const active = sort.key === sortKey;
  return (
    <th>
      <button className={active ? 'sort-header active' : 'sort-header'} type="button" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span aria-hidden="true">{active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

function compareSquadPlayers(a: Player, b: Player, sort: SquadSortState): number {
  const direction = sort.direction === 'asc' ? 1 : -1;

  // 先按主排序字段比较
  const aValue = getSquadSortValue(a, sort.key);
  const bValue = getSquadSortValue(b, sort.key);
  const result =
    typeof aValue === 'number' && typeof bValue === 'number'
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue), 'zh-CN');

  if (result !== 0) {
    return result * direction;
  }

  // 状态相同时，按位置排序（GK → DF → MF → FW）
  const positionOrder = { GK: 0, DF: 1, MF: 2, FW: 3 };
  const positionCompare = (positionOrder[a.position] - positionOrder[b.position]) || a.name.localeCompare(b.name, 'zh-CN');
  if (positionCompare !== 0) {
    return positionCompare;
  }

  // 同状态同位置时，按名字排序
  return a.name.localeCompare(b.name, 'zh-CN');
}

function getSquadSortValue(player: Player, key: SquadSortKey): string | number {
  switch (key) {
    case 'status':
      return player.isStarter ? 0 : 1;
    case 'name':
      return player.name;
    case 'age':
      return player.age;
    case 'position':
      return player.position;
    case 'overall':
      return player.overall;
    case 'potential':
      return player.potential;
    case 'marketValue':
      return player.marketValue;
    case 'weeklyWage':
      return player.weeklyWage;
    case 'contractYears':
      return player.contractYears;
  }
}

function StandingsPage({
  game,
  standingsByLeague,
  selectedLeagueId,
  onSelectLeague,
}: {
  game: GameState;
  standingsByLeague: Record<string, Standing[]>;
  selectedLeagueId: string;
  onSelectLeague: (leagueId: string) => void;
}) {
  const selectedLeague = findLeague(game.leagues, selectedLeagueId);
  const standings = standingsByLeague[selectedLeague.id] ?? [];
  const teams = game.teams.filter((team) => team.leagueId === selectedLeague.id);

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">第 {Math.min(selectedLeague.currentRound, selectedLeague.totalRounds)} 轮后</span>
          <h1>积分榜</h1>
        </div>
        <div className="league-tabs" aria-label="联赛切换">
          {game.leagues
            .slice()
            .sort((a, b) => a.level - b.level)
            .map((league) => (
              <button
                className={league.id === selectedLeague.id ? 'tab-button active' : 'tab-button'}
                type="button"
                key={league.id}
                onClick={() => onSelectLeague(league.id)}
              >
                {formatLeagueLevel(league)}
              </button>
            ))}
        </div>
      </header>
      <StandingsTable league={selectedLeague} teams={teams} standings={standings} />
    </>
  );
}

function SeasonEndPage({
  game,
  userTeam,
  userLeague,
  standings,
  movement,
  seasonGrowthChanges,
  onStartNextSeason,
  onReset,
}: {
  game: GameState;
  userTeam: Team;
  userLeague: League;
  standings: Standing[];
  movement: { promoted: Team[]; relegated: Team[] };
  seasonGrowthChanges: PlayerGrowthChange[];
  onStartNextSeason: () => void;
  onReset: () => void;
}) {
  const userRank = standings.findIndex((standing) => standing.teamId === userTeam.id) + 1;
  const userLeagueStandings = getStandingsByLeague(game)[userLeague.id] ?? [];
  const userLeagueChampionStanding = userLeagueStandings[0];
  const userLeagueChampion = userLeagueChampionStanding ? findTeam(game.teams, userLeagueChampionStanding.teamId) : undefined;
  const userTeamPlayerIds = new Set(game.players.filter((player) => player.teamId === userTeam.id).map((player) => player.id));
  const aggregatedChanges = aggregateGrowthChanges(seasonGrowthChanges).filter((change) => userTeamPlayerIds.has(change.playerId));
  const topGrowth = aggregatedChanges.filter((change) => change.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const topDecline = aggregatedChanges.filter((change) => change.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const retiringPlayers = game.players
    .filter((player) => player.teamId === userTeam.id && player.age + 1 >= 36)
    .sort((a, b) => b.overall - a.overall);

  return (
    <>
      <header className="page-header hero-band">
        <div>
          <span className="eyebrow">第 {game.leagueSystem.season} 赛季结束</span>
          <h1>{userTeam.name} 排名第 {userRank || '-'}</h1>
          <p>{formatLeagueLevel(userLeague)}冠军：{userLeagueChampion?.name ?? '待定'}。</p>
        </div>
      </header>

      <section className="summary-grid">
        <InfoPanel title="升级球队">
          <strong>{movement.promoted.map((team) => team.name).join('、') || '-'}</strong>
          <span>二级联赛前 3 名</span>
        </InfoPanel>
        <InfoPanel title="降级球队">
          <strong>{movement.relegated.map((team) => team.name).join('、') || '-'}</strong>
          <span>一级联赛后 3 名</span>
        </InfoPanel>
        <InfoPanel title="下一赛季">
          <strong>第 {parseInt(game.leagueSystem.season, 10) + 1} 赛季</strong>
        </InfoPanel>
      </section>

      <section className="growth-panel">
        <div>
          <span className="eyebrow">赛季成长总结</span>
          <h2>球员能力变化</h2>
        </div>
        <div className="growth-summary-grid">
          <SeasonGrowthList title="成长最快" changes={topGrowth} players={game.players} positive />
          <SeasonGrowthList title="衰退最大" changes={topDecline} players={game.players} />
        </div>
      </section>

      <section className="growth-panel">
        <div>
          <span className="eyebrow">阵容变化</span>
          <h2>退役球员</h2>
        </div>
        <RetiringPlayerList players={retiringPlayers} />
      </section>
    </>
  );
}

function RetiringPlayerList({ players }: { players: Player[] }) {
  return (
    <div className="growth-summary-section">
      <h3>即将退役</h3>
      {players.length === 0 ? (
        <p className="muted">本赛季无球员退役。</p>
      ) : (
        <div className="growth-list">
          {players.map((player) => (
            <div className="growth-item" key={player.id}>
              <span>{player.name}</span>
              <strong>{player.position}</strong>
              <small>{player.age} 岁 · 能力 {player.overall}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeasonGrowthList({ title, changes, players, positive = false }: { title: string; changes: PlayerGrowthChange[]; players: Player[]; positive?: boolean }) {
  return (
    <div className="growth-summary-section">
      <h3>{title}</h3>
      {changes.length === 0 ? (
        <p className="muted">暂无变化。</p>
      ) : (
        <div className="growth-list">
          {changes.map((change) => (
            <div className="growth-item" key={change.playerId}>
              <span>{players.find((player) => player.id === change.playerId)?.name ?? change.playerId}</span>
              <strong className={positive ? 'growth-up' : 'growth-down'}>{positive ? '+' : ''}{change.delta}</strong>
              <small>{change.previousOverall} → {change.nextOverall}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GrowthSummary({ changes, players }: { changes: PlayerGrowthChange[]; players: Player[] }) {
  const playerIds = new Set(players.map((player) => player.id));
  const playerChanges = aggregateGrowthChanges(changes)
    .filter((change) => playerIds.has(change.playerId))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  return (
    <section className="growth-panel">
      <div>
        <span className="eyebrow">能力变化</span>
        <h2>本轮球员成长与衰退</h2>
      </div>
      {playerChanges.length === 0 ? (
        <p className="muted">本轮无明显能力变化。</p>
      ) : (
        <div className="growth-list">
          {playerChanges.map((change) => {
            const player = players.find((item) => item.id === change.playerId);
            return (
              <div className="growth-item" key={`${change.playerId}-${change.previousOverall}-${change.nextOverall}`}>
                <span>{player?.name ?? change.playerId}</span>
                <strong className={change.delta > 0 ? 'growth-up' : 'growth-down'}>
                  {change.delta > 0 ? '+' : ''}{change.delta}
                </strong>
                <small>{change.previousOverall} → {change.nextOverall}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FinanceSummaryPanel({ summary }: { summary: FinanceSummary }) {
  return (
    <section className="finance-panel">
      <div>
        <span className="eyebrow">财政</span>
        <h2>本轮收支</h2>
      </div>
      <div className="finance-grid">
        <InfoPanel title="联赛营收"><strong>{formatMoney(summary.revenueIncome)}</strong></InfoPanel>
        <InfoPanel title="周薪支出"><strong>{formatMoney(summary.wageExpense)}</strong></InfoPanel>
        <InfoPanel title="净变化"><strong>{formatMoney(summary.net)}</strong></InfoPanel>
      </div>
    </section>
  );
}

function aggregateGrowthChanges(changes: PlayerGrowthChange[]): PlayerGrowthChange[] {
  const merged = new Map<string, PlayerGrowthChange>();

  changes.forEach((change) => {
    const existing = merged.get(change.playerId);
    if (!existing) {
      merged.set(change.playerId, { ...change });
      return;
    }

    merged.set(change.playerId, {
      playerId: change.playerId,
      previousOverall: existing.previousOverall,
      nextOverall: change.nextOverall,
      delta: change.nextOverall - existing.previousOverall,
    });
  });

  return Array.from(merged.values()).filter((change) => change.delta !== 0);
}

function StandingsTable({ league, teams, standings }: { league: League; teams: Team[]; standings: Standing[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>排名</th>
            <th>球队</th>
            <th>状态</th>
            <th>场</th>
            <th>胜</th>
            <th>平</th>
            <th>负</th>
            <th>进</th>
            <th>失</th>
            <th>净</th>
            <th>分</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => {
            const team = findTeam(teams, standing.teamId);
            return (
              <tr key={standing.teamId} className={team.isUserControlled ? 'user-row' : undefined}>
                <td>{index + 1}</td>
                <td><strong>{team.name}</strong></td>
                <td>{renderStandingZone(league, index, standings.length)}</td>
                <td>{standing.played}</td>
                <td>{standing.wins}</td>
                <td>{standing.draws}</td>
                <td>{standing.losses}</td>
                <td>{standing.goalsFor}</td>
                <td>{standing.goalsAgainst}</td>
                <td>{standing.goalDifference}</td>
                <td><strong>{standing.points}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamScore({ team, score, highlight }: { team: Team; score: number | null; highlight: boolean }) {
  return (
    <div className={highlight ? 'team-score highlight' : 'team-score'}>
      <span>{team.name}</span>
      <strong>{score ?? '-'}</strong>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="info-panel">
      <span>{title}</span>
      {children}
    </article>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function getStandingsByLeague(game: GameState): Record<string, Standing[]> {
  return Object.fromEntries(
    game.leagues.map((league) => [
      league.id,
      calculateStandings(
        game.teams.filter((team) => team.leagueId === league.id),
        game.matches.filter((match) => match.leagueId === league.id),
      ),
    ]),
  );
}

function getLeagueRoundMatches(game: GameState, leagueId: string, round: number): Match[] {
  return game.matches.filter((match) => match.leagueId === leagueId && match.round === round);
}

function getAllCurrentRoundMatches(game: GameState): Match[] {
  return game.leagues.flatMap((league) => getLeagueRoundMatches(game, league.id, league.currentRound));
}

function isRoundComplete(matches: Match[]): boolean {
  return matches.length > 0 && matches.every((match) => match.status === 'played');
}

function findTeam(teams: Team[], id: string): Team {
  const team = teams.find((item) => item.id === id);
  if (!team) {
    throw new Error(`Missing team ${id}`);
  }
  return team;
}

function findLeague(leagues: League[], id: string): League {
  const league = leagues.find((item) => item.id === id);
  if (!league) {
    throw new Error(`Missing league ${id}`);
  }
  return league;
}

function formatLeagueLevel(league: League): string {
  return league.level === 1 ? '一级联赛' : '二级联赛';
}

function formatVenue(match: Match, userTeamId: string): string {
  return match.homeTeamId === userTeamId ? '主场作战' : '客场挑战';
}

function renderStandingZone(league: League, index: number, totalTeams: number): ReactNode {
  if (league.level === 2 && index < 3) {
    return <span className="tag">升级</span>;
  }

  if (league.level === 1 && index >= totalTeams - 3) {
    return <span className="tag danger">降级</span>;
  }

  return <span className="muted">-</span>;
}

function renderRetirementTag(player: Player): ReactNode {
  if (player.age >= 35) {
    return <span className="tag danger">赛季末退役</span>;
  }

  if (player.age >= 33) {
    return <span className="tag warning">身价下行</span>;
  }

  if (player.age >= 30) {
    return <span className="tag muted-tag">剩 {35 - player.age} 年</span>;
  }

  return <span className="muted">-</span>;
}

function getRetirementMessage(player: Player): string {
  if (player.age >= 35) {
    return '本赛季结束后退役';
  }

  if (player.age >= 33) {
    return '处于身价下行通道，建议规划接班';
  }

  return `距离退役还有 ${35 - player.age} 年，续约年限需谨慎`;
}

function getWageHealthStatus(percent: number): { label: string; className: string } {
  if (percent >= 80) {
    return { label: '超支风险', className: 'finance-danger' };
  }

  if (percent >= 60) {
    return { label: '需要注意', className: 'finance-warning' };
  }

  return { label: '财务健康', className: 'finance-good' };
}

function positionWeight(position: Player['position']): number {
  return ['GK', 'DF', 'MF', 'FW'].indexOf(position);
}

function formatMoney(value: number): string {
  const amount = Math.round(value);

  if (Math.abs(amount) >= 100_000_000) {
    return `¥${(amount / 100_000_000).toFixed(1)}亿`;
  }

  if (Math.abs(amount) >= 10_000_000) {
    return `¥${Math.round(amount / 10_000).toLocaleString('zh-CN')}万`;
  }

  if (Math.abs(amount) >= 10_000) {
    return `¥${formatOneDecimal(amount / 10_000)}万`;
  }

  return `¥${amount.toLocaleString('zh-CN')}`;
}

function formatWeeklyWage(value: number): string {
  const amount = Math.round(value);

  if (Math.abs(amount) >= 100_000) {
    return `¥${(amount / 10_000).toFixed(1)}万/周`;
  }

  if (Math.abs(amount) >= 10_000) {
    return `¥${Math.round(amount / 1000)}k/周`;
  }

  return `¥${amount.toLocaleString('zh-CN')}元/周`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
