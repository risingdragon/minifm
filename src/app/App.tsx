import { useEffect, useMemo, useState, type ReactNode } from 'react';
import jerseyImage from '../../assets/lineup-jersey.png';
import { resetGame, startNewSeason, loadGame, saveGame } from '../data/storage';
import { selectAutoLineup } from '../game/lineup';
import { getSeasonMovement } from '../game/season';
import { simulateRound } from '../game/simulator';
import { calculateStandings } from '../game/standings';
import type { GameState, League, Match, Player, Standing, Team, View } from '../models/types';

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [view, setView] = useState<View>('dashboard');
  const userTeam = game.teams.find((team) => team.id === game.userTeamId) ?? game.teams.find((team) => team.isUserControlled) ?? game.teams[0];
  const userLeague = findLeague(game.leagues, userTeam.leagueId);
  const [selectedLeagueId, setSelectedLeagueId] = useState(userLeague.id);
  const currentRound = Math.min(userLeague.currentRound, userLeague.totalRounds);
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

  function updateGame(nextGame: GameState): void {
    setGame(nextGame);
  }

  function handleAutoLineup(): void {
    const nextPlayers = game.players.filter((player) => player.teamId !== userTeam.id || !player.isGeneratedFillIn);
    const userPlayers = selectAutoLineup(userTeam, nextPlayers);
    updateGame({
      ...game,
      players: [...nextPlayers.filter((player) => player.teamId !== userTeam.id), ...userPlayers],
    });
  }

  function handleSimulateRound(): void {
    const result = simulateRound(userLeague.currentRound, game.matches, game.teams, game.players);
    updateGame({
      ...game,
      matches: result.matches,
      players: result.players,
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

    updateGame({ ...game, leagues });
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
            <strong>miniFM</strong>
            <span>第 {game.leagueSystem.season} 赛季</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="主导航">
          <NavButton label="首页" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavButton label="阵容" active={view === 'squad'} onClick={() => setView('squad')} />
          <NavButton label="比赛" active={view === 'match'} onClick={() => setView('match')} />
          <NavButton label="积分榜" active={view === 'standings'} onClick={() => setView('standings')} />
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
            roundComplete={roundComplete}
          />
        )}

        {view === 'squad' && (
          <SquadPage
            team={userTeam}
            league={userLeague}
            players={game.players.filter((player) => player.teamId === userTeam.id)}
            onAutoLineup={handleAutoLineup}
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

        {view === 'seasonEnd' && (
          <SeasonEndPage
            game={game}
            userTeam={userTeam}
            userLeague={userLeague}
            standings={userStandings}
            movement={seasonMovement}
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
  roundComplete,
}: {
  game: GameState;
  userTeam: Team;
  userLeague: League;
  userMatch?: Match;
  standings: Standing[];
  roundComplete: boolean;
}) {
  const rank = standings.findIndex((standing) => standing.teamId === userTeam.id) + 1;
  const opponentId = userMatch?.homeTeamId === userTeam.id ? userMatch.awayTeamId : userMatch?.homeTeamId;
  const opponent = game.teams.find((team) => team.id === opponentId);

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

      <section className="summary-grid">
        <InfoPanel title="所在级别">
          <strong>{formatLeagueLevel(userLeague)}</strong>
        </InfoPanel>
        <InfoPanel title="下一场">
          <strong>{opponent ? opponent.name : '赛季已完成'}</strong>
          <span>{userMatch ? formatVenue(userMatch, userTeam.id) : '没有待赛比赛'}</span>
        </InfoPanel>
        <InfoPanel title="首发人数">
          <strong>{game.players.filter((player) => player.teamId === userTeam.id && player.isStarter).length} / 11</strong>
        </InfoPanel>
      </section>
    </>
  );
}

function SquadPage({ team, league, players, onAutoLineup }: { team: Team; league: League; players: Player[]; onAutoLineup: () => void }) {
  const orderedPlayers = [...players].sort(
    (a, b) => Number(b.isStarter) - Number(a.isStarter) || positionWeight(a.position) - positionWeight(b.position) || b.overall - a.overall,
  );

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">{league.name}</span>
          <h1>{team.name}</h1>
        </div>
        <button type="button" onClick={onAutoLineup}>自动选择首发</button>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>姓名</th>
              <th>年龄</th>
              <th>位置</th>
              <th>能力</th>
            </tr>
          </thead>
          <tbody>
            {orderedPlayers.map((player) => (
              <tr key={player.id}>
                <td>{player.isStarter ? <span className="tag">首发</span> : <span className="muted">替补</span>}</td>
                <td>{player.name}</td>
                <td>{player.age}</td>
                <td>{player.position}</td>
                <td><strong>{player.overall}</strong></td>
              </tr>
            ))}
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
}: {
  game: GameState;
  userTeam: Team;
  userLeague: League;
  userMatch?: Match;
  currentRoundMatches: Match[];
  roundComplete: boolean;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">{userLeague.name} · 第 {Math.min(userLeague.currentRound, userLeague.totalRounds)} 轮</span>
          <h1>比赛中心</h1>
        </div>
        <span className={roundComplete ? 'tag' : 'tag warning'}>{roundComplete ? '本轮完成' : '等待模拟'}</span>
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
    </>
  );
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
  onStartNextSeason,
  onReset,
}: {
  game: GameState;
  userTeam: Team;
  userLeague: League;
  standings: Standing[];
  movement: { promoted: Team[]; relegated: Team[] };
  onStartNextSeason: () => void;
  onReset: () => void;
}) {
  const userRank = standings.findIndex((standing) => standing.teamId === userTeam.id) + 1;
  const userLeagueStandings = getStandingsByLeague(game)[userLeague.id] ?? [];
  const userLeagueChampionStanding = userLeagueStandings[0];
  const userLeagueChampion = userLeagueChampionStanding ? findTeam(game.teams, userLeagueChampionStanding.teamId) : undefined;

  return (
    <>
      <header className="page-header hero-band">
        <div>
          <span className="eyebrow">第 {game.leagueSystem.season} 赛季结束</span>
          <h1>{userTeam.name} 排名第 {userRank || '-'}</h1>
          <p>
            {userLeague.level === 1 ? '一级联赛' : '二级联赛'}冠军：{userLeagueChampion?.name ?? '待定'}。
          </p>
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
    </>
  );
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

function findLeagueByLevel(leagues: League[], level: number): League {
  const league = leagues.find((item) => item.level === level);
  if (!league) {
    throw new Error(`Missing league level ${level}`);
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

function positionWeight(position: Player['position']): number {
  return ['GK', 'DF', 'MF', 'FW'].indexOf(position);
}
