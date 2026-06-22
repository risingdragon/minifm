import type { Match, Team } from '../models/types';

export function createDoubleRoundRobinSchedule(leagueId: string, teams: Team[]): Match[] {
  const ids = teams.map((team) => team.id);
  const rounds: Match[][] = [];
  const rotating = ids.slice();
  const teamCount = rotating.length;

  for (let round = 1; round < teamCount; round += 1) {
    const matches: Match[] = [];

    for (let index = 0; index < teamCount / 2; index += 1) {
      const first = rotating[index];
      const second = rotating[teamCount - 1 - index];
      const flipHome = round % 2 === 0;
      const homeTeamId = flipHome ? second : first;
      const awayTeamId = flipHome ? first : second;

      matches.push({
        id: `${leagueId}-r${round}-m${index + 1}`,
        leagueId,
        round,
        homeTeamId,
        awayTeamId,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
    }

    rounds.push(matches);
    const fixed = rotating[0];
    const moved = rotating.pop();
    if (!moved) {
      throw new Error('Cannot generate schedule without teams.');
    }
    rotating.splice(1, 0, moved);
    rotating[0] = fixed;
  }

  const secondLeg = rounds.map((matches, index) =>
    matches.map((match, matchIndex) => ({
      ...match,
      id: `${leagueId}-r${index + teamCount}-m${matchIndex + 1}`,
      round: index + teamCount,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
      homeScore: null,
      awayScore: null,
      status: 'scheduled' as const,
    })),
  );

  return [...rounds.flat(), ...secondLeg.flat()];
}
