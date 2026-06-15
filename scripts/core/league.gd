class_name League
extends RefCounted

var league_name: String
var teams: Array[Team] = []
var schedule: Array = []
var current_round: int = 0
var last_results: Array[Dictionary] = []
var rng: RandomNumberGenerator = RandomNumberGenerator.new()

func _init(_league_name: String = "miniFM 联赛") -> void:
	league_name = _league_name
	rng.randomize()

func setup_default_league() -> void:
	teams.clear()
	schedule.clear()
	current_round = 0
	last_results.clear()

	var team_names: Array[String] = [
		"北城联", "海港竞技", "山谷流星", "西岸骑士", "东都FC",
		"南湖蓝鲸", "钢铁工人", "大学城", "红桥城", "绿茵游侠"
	]

	var player_id: int = 1
	for team_index in range(team_names.size()):
		var team: Team = Team.new(team_index + 1, team_names[team_index])
		teams.append(team)

		for player_index in range(18):
			team.add_player(_create_player(player_id, team_index, player_index))
			player_id += 1

	_generate_round_robin_schedule()

func has_next_round() -> bool:
	return current_round < schedule.size()

func play_next_round() -> Array[Dictionary]:
	last_results.clear()

	if not has_next_round():
		return last_results

	var fixtures: Array = schedule[current_round]
	for fixture in fixtures:
		last_results.append(MatchSimulator.simulate(fixture["home"], fixture["away"], rng))

	current_round += 1
	return last_results

func standings() -> Array[Team]:
	var sorted_teams: Array[Team] = teams.duplicate()
	sorted_teams.sort_custom(func(a: Team, b: Team) -> bool:
		if a.points != b.points:
			return a.points > b.points
		if a.goal_difference() != b.goal_difference():
			return a.goal_difference() > b.goal_difference()
		if a.goals_for != b.goals_for:
			return a.goals_for > b.goals_for
		return a.team_name < b.team_name
	)
	return sorted_teams

func total_rounds() -> int:
	return schedule.size()

func _create_player(player_id: int, team_index: int, player_index: int) -> Player:
	var positions: Array[String] = ["GK", "GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW", "FW", "FW", "FW", "MF", "DF"]
	var position: String = positions[player_index]
	var base: int = 52 + team_index * 2 + rng.randi_range(-4, 8)
	var player_name: String = "%s %02d" % [_position_name(position), player_index + 1]

	var attack: int = clampi(base + rng.randi_range(-8, 12), 35, 92)
	var midfield: int = clampi(base + rng.randi_range(-8, 12), 35, 92)
	var defense: int = clampi(base + rng.randi_range(-8, 12), 35, 92)
	var goalkeeping: int = clampi(base + rng.randi_range(-10, 10), 30, 90)

	match position:
		"GK":
			goalkeeping = clampi(base + rng.randi_range(8, 18), 45, 95)
			attack = clampi(base + rng.randi_range(-20, -8), 20, 65)
		"DF":
			defense = clampi(base + rng.randi_range(5, 16), 45, 95)
		"MF":
			midfield = clampi(base + rng.randi_range(5, 16), 45, 95)
		"FW":
			attack = clampi(base + rng.randi_range(5, 16), 45, 95)

	return Player.new(player_id, player_name, position, attack, midfield, defense, goalkeeping)

func _position_name(position: String) -> String:
	match position:
		"GK":
			return "门将"
		"DF":
			return "后卫"
		"MF":
			return "中场"
		"FW":
			return "前锋"
		_:
			return "球员"

func _generate_round_robin_schedule() -> void:
	var rotation: Array[Team] = teams.duplicate()
	var team_count: int = rotation.size()
	var round_count: int = team_count - 1

	for round_index in range(round_count):
		var fixtures: Array = []
		for pair_index in range(int(team_count / 2)):
			var home: Team = rotation[pair_index]
			var away: Team = rotation[team_count - 1 - pair_index]

			if round_index % 2 == 1:
				var temp: Team = home
				home = away
				away = temp

			fixtures.append({"home": home, "away": away})

		schedule.append(fixtures)

		var moved: Team = rotation.pop_back()
		rotation.insert(1, moved)
