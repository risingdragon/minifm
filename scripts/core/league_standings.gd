class_name LeagueStandings
extends RefCounted

static func sorted_teams(teams: Array[Team]) -> Array[Team]:
	var sorted: Array[Team] = teams.duplicate()
	sorted.sort_custom(func(a: Team, b: Team) -> bool:
		if a.points != b.points:
			return a.points > b.points
		if a.goal_difference() != b.goal_difference():
			return a.goal_difference() > b.goal_difference()
		if a.goals_for != b.goals_for:
			return a.goals_for > b.goals_for
		return a.team_name < b.team_name
	)
	return sorted
