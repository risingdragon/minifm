class_name League
extends RefCounted

var league_name: String
var teams: Array[Team] = []
var schedule: Array = []
var current_round: int = 0
var last_results: Array[Dictionary] = []
var last_growth_logs: Array[Dictionary] = []
var last_season_summary_logs: Array[String] = []
var rng: RandomNumberGenerator = RandomNumberGenerator.new()
var player_team: Team
var growth_system: PlayerGrowthSystem = PlayerGrowthSystem.new()
var transfer_system: TransferSystem = TransferSystem.new()
var youth_system: YouthSystem = YouthSystem.new()
var transfer_logs: Array[Dictionary] = []
var lineup_warning: String = ""
var season_year: int = 2026
var season_complete: bool = false
var next_player_id: int = 1

func _init(_league_name: String = "miniFM 联赛") -> void:
	league_name = _league_name
	rng.randomize()

func setup_default_league() -> void:
	teams.clear()
	schedule.clear()
	current_round = 0
	last_results.clear()
	last_growth_logs.clear()
	last_season_summary_logs.clear()
	transfer_logs.clear()
	lineup_warning = ""
	season_year = 2026
	season_complete = false
	next_player_id = 1
	player_team = null

	var team_names: Array[String] = [
		"北城联", "海港竞技", "山谷流星", "西岸骑士", "东都FC",
		"南湖蓝鲸", "钢铁工人", "大学城", "红桥城", "绿茵游侠"
	]

	for team_index in range(team_names.size()):
		var team: Team = Team.new(team_index + 1, team_names[team_index])
		team.money = transfer_system.initial_money()
		teams.append(team)

		for player_index in range(18):
			var player: Player = _create_player(next_player_id, team_index, player_index)
			transfer_system.setup_player_finance(player, rng)
			team.add_player(player)
			next_player_id += 1

		team.auto_select_starting_lineup()

	player_team = teams[0]
	_generate_round_robin_schedule()

func has_next_round() -> bool:
	return current_round < schedule.size()

func play_next_round() -> Array[Dictionary]:
	last_results.clear()
	last_season_summary_logs.clear()

	if not has_next_round():
		return last_results

	_prepare_non_player_lineups()

	var fixtures: Array = schedule[current_round]
	for fixture in fixtures:
		var fixture_data: Dictionary = fixture as Dictionary
		var home: Team = fixture_data["home"] as Team
		var away: Team = fixture_data["away"] as Team
		last_results.append(MatchSimulator.simulate(home, away, rng))

	last_growth_logs = growth_system.process_teams(teams, rng, player_team)
	transfer_system.refresh_player_finance(teams)
	transfer_system.clear_logs()
	transfer_system.process_ai_transfers(teams, player_team)
	_sync_transfer_logs()
	lineup_warning = transfer_system.lineup_warning
	current_round += 1
	if not has_next_round():
		_finish_season()
	return last_results

func start_next_season() -> void:
	season_year += 1
	season_complete = false
	current_round = 0
	schedule.clear()
	last_results.clear()
	last_growth_logs.clear()
	last_season_summary_logs.clear()
	lineup_warning = ""

	for team in teams:
		team.reset_record()
		if team != player_team:
			team.auto_select_starting_lineup()

	_generate_round_robin_schedule()

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

func is_season_complete() -> bool:
	return season_complete

func validate_player_lineup() -> Dictionary:
	if player_team == null:
		return {"ok": false, "message": "没有可用的玩家球队。"}

	var error: String = player_team.lineup_error()
	if not error.is_empty():
		return {"ok": false, "message": error}

	return {"ok": true, "message": ""}

func listed_players() -> Array[Dictionary]:
	return transfer_system.listed_players(teams)

func buy_player(player: Player) -> String:
	var seller: Team = owner_of_player(player)
	if seller == null:
		return "球员不存在"
	transfer_system.clear_logs()
	var message: String = transfer_system.buy_player(player_team, seller, player, true)
	_sync_transfer_logs()
	return message

func toggle_player_listing(player: Player) -> String:
	transfer_system.clear_logs()
	var message: String = transfer_system.toggle_player_listing(player_team, player, true)
	_sync_transfer_logs()
	return message

func owner_of_player(player: Player) -> Team:
	for team in teams:
		if team.players.has(player):
			return team
	return null

func format_money(amount: int) -> String:
	return transfer_system.format_money(amount)

func _sync_transfer_logs() -> void:
	transfer_logs.clear()
	for log_entry in transfer_system.logs:
		if log_entry is Dictionary:
			transfer_logs.append(log_entry)

func _finish_season() -> void:
	season_complete = true
	last_season_summary_logs = youth_system.process_season_end(
		teams,
		rng,
		transfer_system,
		season_year,
		next_player_id,
		player_team
	)
	next_player_id = youth_system.next_player_id
	transfer_system.refresh_player_finance(teams)
	for team in teams:
		if team != player_team:
			team.auto_select_starting_lineup()

func _create_player(player_id: int, team_index: int, player_index: int) -> Player:
	var positions: Array[String] = ["GK", "GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW", "FW", "FW", "FW", "MF", "DF"]
	var position: String = positions[player_index]
	var base: int = 104 + team_index * 4 + rng.randi_range(-8, 16)
	var age: int = rng.randi_range(18, 34)
	var ability: int = clampi(base, 1, 200)
	var potential: int = clampi(ability + rng.randi_range(0, 32), ability, 200)
	var player_name: String = youth_system.random_name(rng)

	var attack: int = clampi(ability + rng.randi_range(-16, 24), 1, 200)
	var midfield: int = clampi(ability + rng.randi_range(-16, 24), 1, 200)
	var defense: int = clampi(ability + rng.randi_range(-16, 24), 1, 200)
	var goalkeeping: int = clampi(ability + rng.randi_range(-20, 20), 1, 200)

	match position:
		"GK":
			goalkeeping = clampi(ability + rng.randi_range(16, 36), 1, 200)
			attack = clampi(ability + rng.randi_range(-40, -16), 1, 200)
		"DF":
			defense = clampi(ability + rng.randi_range(10, 32), 1, 200)
		"MF":
			midfield = clampi(ability + rng.randi_range(10, 32), 1, 200)
		"FW":
			attack = clampi(ability + rng.randi_range(10, 32), 1, 200)

	return Player.new(player_id, player_name, position, age, ability, potential, attack, midfield, defense, goalkeeping)

func _generate_round_robin_schedule() -> void:
	var rotation: Array[Team] = teams.duplicate()
	var team_count: int = rotation.size()
	var round_count: int = team_count - 1
	var first_half_schedule: Array = []

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

		first_half_schedule.append(fixtures)

		var moved: Team = rotation.pop_back()
		rotation.insert(1, moved)

	for fixtures in first_half_schedule:
		schedule.append(fixtures)

	for fixtures in first_half_schedule:
		var reverse_fixtures: Array = []
		for fixture in fixtures:
			reverse_fixtures.append({
				"home": fixture["away"],
				"away": fixture["home"]
			})
		schedule.append(reverse_fixtures)

func _prepare_non_player_lineups() -> void:
	for team in teams:
		if team == player_team:
			continue
		team.auto_select_starting_lineup()
