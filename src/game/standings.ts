import type { Match, Standing, Team } from '../models/types';

export function calculateStandings(teams: Team[], matches: Match[]): Standing[] {
  const table = new Map<string, Standing>();

  teams.forEach((team) => {
    table.set(team.id, {
      teamId: team.id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  matches
    .filter((match) => match.status === 'played' && match.homeScore !== null && match.awayScore !== null)
    .forEach((match) => {
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);
      if (!home || !away || match.homeScore === null || match.awayScore === null) {
        return;
      }

      applyResult(home, match.homeScore, match.awayScore);
      applyResult(away, match.awayScore, match.homeScore);
    });

  return Array.from(table.values()).sort((a, b) => {
    const teamA = teams.find((team) => team.id === a.teamId);
    const teamB = teams.find((team) => team.id === b.teamId);

    return (
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      (teamA?.name ?? '').localeCompare(teamB?.name ?? '', 'zh-Hans-CN')
    );
  });
}

function applyResult(standing: Standing, goalsFor: number, goalsAgainst: number): void {
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    standing.wins += 1;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.losses += 1;
  }
}
