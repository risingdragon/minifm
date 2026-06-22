import { useEffect, useMemo, useState, type ReactNode } from 'react';
import jerseyImage from '../../assets/lineup-jersey.png';
import { resetGame, startNewSeason, loadGame, saveGame } from '../data/storage';
import { selectAutoLineup } from '../game/lineup';
import { simulateRound } from '../game/simulator';
import { calculateStandings } from '../game/standings';
import type { GameState, Match, Player, Standing, Team, View } from '../models/types';

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [view, setView] = useState<View>('dashboard');

  const userTeam = game.teams.find((team) => team.isUserControlled) ?? game.teams[0];
  const currentRoundMatches = game.matches.filter((match) => match.round === game.league.currentRound);
  const userMatch = currentRoundMatches.find(
    (match) => match.homeTeamId === userTeam.id || match.awayTeamId === userTeam.id,
  );
  const standings = useMemo(() => calculateStandings(game.teams, game.matches), [game.matches, game.teams]);
  const seasonFinished = game.league.currentRound > game.league.totalRounds;

  useEffect(() => {
    saveGame(game);
  }, [game]);

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
    const result = simulateRound(game.league.currentRound, game.matches, game.teams, game.players);
    updateGame({
      ...game,
      matches: result.matches,
      players: result.players,
    });
    setView('match');
  }

  function handleNextRound(): void {
    if (!isRoundComplete(currentRoundMatches)) {
      return;
    }

    updateGame({
      ...game,
      league: {
        ...game.league,
        currentRound: game.league.currentRound + 1,
      },
    });
    setView(game.league.currentRound + 1 > game.league.totalRounds ? 'seasonEnd' : 'dashboard');
  }

  function handleContinue(): void {
    if (seasonFinished) {
      const freshGame = startNewSeason();
      setGame(freshGame);
      setView('dashboard');
      return;
    }

    if (roundComplete) {
      if (view === 'standings') {
        handleNextRound();
      } else {
        setView('standings');
      }
      return;
    }

    handleSimulateRound();
  }

  function handleReset(): void {
    const freshGame = restartGame();
    setGame(freshGame);
    setView('dashboard');
  }

  const roundComplete = isRoundComplete(currentRoundMatches);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">mF</div>
          <div>
            <strong>miniFM</strong>
            <span>第 {game.league.season} 赛季</span>
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
            userMatch={userMatch}
            standings={standings}
            roundComplete={roundComplete}
            onGoSquad={() => setView('squad')}
            onGoMatch={() => setView('match')}
            onGoStandings={() => setView('standings')}
            onSimulate={handleSimulateRound}
            onNextRound={handleNextRound}
          />
        )}

        {view === 'squad' && (
          <SquadPage
            team={userTeam}
            players={game.players.filter((player) => player.teamId === userTeam.id)}
            onAutoLineup={handleAutoLineup}
          />
        )}

        {view === 'match' && (
          <MatchPage
            game={game}
            userTeam={userTeam}
            userMatch={userMatch}
            currentRoundMatches={currentRoundMatches}
            roundComplete={roundComplete}
            onSimulate={handleSimulateRound}
            onNextRound={handleNextRound}
            onGoStandings={() => setView('standings')}
          />
        )}

        {view === 'standings' && (
          <StandingsPage
            teams={game.teams}
            standings={standings}
            currentRound={game.league.currentRound}
            totalRounds={game.league.totalRounds}
            roundComplete={roundComplete}
            onNextRound={handleNextRound}
          />
        )}

        {view === 'seasonEnd' && <SeasonEndPage teams={game.teams} standings={standings} onReset={handleReset} />}
      </section>
    </main>
  );
}

function DashboardPage({
  game,
  userTeam,
  userMatch,
  standings,
  roundComplete,
  onGoSquad,
  onGoMatch,
  onGoStandings,
  onSimulate,
  onNextRound,
}: {
  game: GameState;
  userTeam: Team;
  userMatch?: Match;
  standings: Standing[];
  roundComplete: boolean;
  onGoSquad: () => void;
  onGoMatch: () => void;
  onGoStandings: () => void;
  onSimulate: () => void;
  onNextRound: () => void;
}) {
  const rank = standings.findIndex((standing) => standing.teamId === userTeam.id) + 1;
  const opponentId = userMatch?.homeTeamId === userTeam.id ? userMatch.awayTeamId : userMatch?.homeTeamId;
  const opponent = game.teams.find((team) => team.id === opponentId);

  return (
    <>
      <header className="page-header hero-band">
        <div>
          <span className="eyebrow">{game.league.name}</span>
          <h1>{userTeam.name}</h1>
          <p>
            第 {Math.min(game.league.currentRound, game.league.totalRounds)} / {game.league.totalRounds} 轮，
            当前排名第 {rank || '-'}。
          </p>
        </div>
        <img className="jersey-art" src={jerseyImage} alt="" />
      </header>

      <section className="summary-grid">
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

function SquadPage({ team, players, onAutoLineup }: { team: Team; players: Player[]; onAutoLineup: () => void }) {
  const orderedPlayers = [...players].sort(
    (a, b) => Number(b.isStarter) - Number(a.isStarter) || positionWeight(a.position) - positionWeight(b.position) || b.overall - a.overall,
  );

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">球队阵容</span>
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
  userMatch,
  currentRoundMatches,
  roundComplete,
  onSimulate,
  onNextRound,
  onGoStandings,
}: {
  game: GameState;
  userTeam: Team;
  userMatch?: Match;
  currentRoundMatches: Match[];
  roundComplete: boolean;
  onSimulate: () => void;
  onNextRound: () => void;
  onGoStandings: () => void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">第 {game.league.currentRound} 轮</span>
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
    </>
  );
}

function StandingsPage({
  teams,
  standings,
  currentRound,
  totalRounds,
  roundComplete,
  onNextRound,
}: {
  teams: Team[];
  standings: Standing[];
  currentRound: number;
  totalRounds: number;
  roundComplete: boolean;
  onNextRound: () => void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">第 {Math.min(currentRound, totalRounds)} 轮后</span>
          <h1>积分榜</h1>
        </div>
      </header>
      <StandingsTable teams={teams} standings={standings} />
    </>
  );
}

function SeasonEndPage({ teams, standings, onReset }: { teams: Team[]; standings: Standing[]; onReset: () => void }) {
  const champion = teams.find((team) => team.id === standings[0]?.teamId);
  const userTeam = teams.find((team) => team.isUserControlled);
  const userRank = standings.findIndex((standing) => standing.teamId === userTeam?.id) + 1;

  return (
    <>
      <header className="page-header hero-band">
        <div>
          <span className="eyebrow">赛季结束</span>
          <h1>{userTeam?.name} 最终排名第 {userRank || '-'}</h1>
        </div>
      </header>
      <StandingsTable teams={teams} standings={standings} />
    </>
  );
}

function StandingsTable({ teams, standings }: { teams: Team[]; standings: Standing[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>排名</th>
            <th>球队</th>
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

function formatVenue(match: Match, userTeamId: string): string {
  return match.homeTeamId === userTeamId ? '主场作战' : '客场挑战';
}

function positionWeight(position: Player['position']): number {
  return ['GK', 'DF', 'MF', 'FW'].indexOf(position);
}
