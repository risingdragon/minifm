class_name League
extends RefCounted

const CONFIG_PATH: String = "res://config/league_config.json"

var league_name: String
var teams: Array[Team] = []
var tiers: Array[LeagueTier] = []
var current_round: int = 0
var last_results: Array[Dictionary] = []
var last_growth_logs: Array[Dictionary] = []
var last_season_summary_logs: Array[String] = []
var rng: RandomNumberGenerator = RandomNumberGenerator.new()
var player_team: Team
var growth_system: PlayerGrowthSystem = PlayerGrowthSystem.new()
var transfer_system: TransferSystem = TransferSystem.new()
var youth_system: YouthSystem = YouthSystem.new()
var economy_system: EconomySystem = EconomySystem.new()
var transfer_logs: Array[Dictionary] = []
var last_finance_logs: Array[String] = []
var last_finance_report_logs: Array[String] = []
var lineup_warning: String = ""
var season_year: int = 2026
var season_complete: bool = false
var next_player_id: int = 1
var active_standings_level: int = 1
var league_config: Dictionary = {}

func _init(_league_name: String = "miniFM 联赛") -> void:
	league_name = _league_name
	rng.randomize()
	_load_config()

func setup_default_league() -> void:
	teams.clear()
	tiers.clear()
	current_round = 0
	last_results.clear()
	last_growth_logs.clear()
	last_season_summary_logs.clear()
	last_finance_logs.clear()
	last_finance_report_logs.clear()
	transfer_logs.clear()
	lineup_warning = ""
	season_year = 2026
	season_complete = false
	next_player_id = 1
	player_team = null

	_create_tiers_from_config()
	_create_default_teams()
	player_team = _default_player_team()
	active_standings_level = player_team.league_level
	_apply_league_config_to_systems()
	_generate_all_schedules()

func has_next_round() -> bool:
	return current_round < total_rounds()

func play_next_round() -> Array[Dictionary]:
	last_results.clear()
	last_season_summary_logs.clear()
	last_finance_logs.clear()
	last_finance_report_logs.clear()

	if not has_next_round():
		return last_results

	_prepare_non_player_lineups()

	for tier in tiers:
		if current_round >= tier.schedule.size():
			continue
		var fixtures: Array = tier.schedule[current_round]
		for fixture in fixtures:
			var fixture_data: Dictionary = fixture as Dictionary
			var home: Team = fixture_data["home"] as Team
			var away: Team = fixture_data["away"] as Team
			var result: Dictionary = MatchSimulator.simulate(home, away, rng)
			last_results.append(result)
			_append_finance_logs(economy_system.settle_match(result), home, away)

	last_growth_logs = growth_system.process_teams(teams, rng, player_team)
	transfer_system.refresh_player_finance(teams)
	_apply_league_config_to_systems()
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
	last_results.clear()
	last_growth_logs.clear()
	last_season_summary_logs.clear()
	last_finance_logs.clear()
	last_finance_report_logs.clear()
	lineup_warning = ""

	for team in teams:
		_migrate_team_fields(team)
		team.reset_record()
		economy_system.reset_team_finance(team)
		if team != player_team:
			team.auto_select_starting_lineup()

	active_standings_level = player_team.league_level
	_rebuild_tier_teams()
	_generate_all_schedules()

func standings(level: int = -1) -> Array[Team]:
	var target_level: int = level
	if target_level == -1:
		target_level = active_standings_level
	var tier: LeagueTier = tier_by_level(target_level)
	if tier == null:
		return []
	return LeagueStandings.sorted_teams(tier.teams)

func total_rounds() -> int:
	var max_rounds: int = 0
	for tier in tiers:
		max_rounds = maxi(max_rounds, tier.schedule.size())
	return max_rounds

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
	return economy_system.format_money(amount)

func cash_warning(team: Team) -> String:
	return economy_system.cash_warning(team)

func set_active_standings_level(level: int) -> void:
	if tier_by_level(level) != null:
		active_standings_level = level

func tier_by_level(level: int) -> LeagueTier:
	for tier in tiers:
		if tier.level == level:
			return tier
	return null

func player_tier() -> LeagueTier:
	return tier_by_level(player_team.league_level)

func active_tier_name() -> String:
	var tier: LeagueTier = tier_by_level(active_standings_level)
	if tier == null:
		return ""
	return tier.tier_name

func player_tier_name() -> String:
	var tier: LeagueTier = player_tier()
	if tier == null:
		return ""
	return tier.tier_name

func tier_income_label(level: int) -> String:
	var multiplier: float = economy_system.tier_income_multiplier(level)
	return "%d%%" % int(round(multiplier * 100.0))

func expected_next_season_income_label() -> String:
	return "%s（%s）" % [player_tier_name(), tier_income_label(player_team.league_level)]

func _sync_transfer_logs() -> void:
	transfer_logs.clear()
	for log_entry in transfer_system.logs:
		if log_entry is Dictionary:
			transfer_logs.append(log_entry)

func _finish_season() -> void:
	season_complete = true
	_record_team_rank_history()
	last_season_summary_logs = youth_system.process_season_end(
		teams,
		rng,
		transfer_system,
		economy_system,
		season_year,
		next_player_id,
		player_team
	)
	next_player_id = youth_system.next_player_id
	last_season_summary_logs.append_array(_player_ranking_bonus_logs())
	last_season_summary_logs.append_array(_promotion_relegation_logs())
	last_finance_report_logs = _build_player_finance_report()
	transfer_system.refresh_player_finance(teams)
	_rebuild_tier_teams()
	for team in teams:
		if team != player_team:
			team.auto_select_starting_lineup()

func _append_finance_logs(logs: Array[String], home: Team, away: Team) -> void:
	if home != player_team and away != player_team:
		return
	for log_line in logs:
		if log_line.begins_with(player_team.team_name):
			last_finance_logs.append(log_line)

func _player_ranking_bonus_logs() -> Array[String]:
	var logs: Array[String] = []
	for tier in tiers:
		var bonus_logs: Array[String] = economy_system.settle_ranking_bonus(LeagueStandings.sorted_teams(tier.teams))
		for log_line in bonus_logs:
			if log_line.begins_with(player_team.team_name):
				logs.append(log_line)
	return logs

func _build_player_finance_report() -> Array[String]:
	return [
		"%d赛季财务报告" % season_year,
		"当前联赛：%s" % player_tier_name(),
		"联赛等级：%d" % player_team.league_level,
		"预计下赛季收入等级：%s" % expected_next_season_income_label(),
		"门票收入：%s" % format_money(player_team.season_ticket_income),
		"奖金收入：%s" % format_money(player_team.season_bonus_income),
		"转会收入：%s" % format_money(player_team.season_transfer_income),
		"转会支出：%s" % format_money(player_team.season_transfer_expense),
		"工资支出：%s" % format_money(player_team.season_salary_expense),
		"赛季利润：%s" % format_money(player_team.season_income - player_team.season_expense),
		"赛季结束资金：%s" % format_money(player_team.money)
	]

func _create_tiers_from_config() -> void:
	var tiers_value: Variant = league_config.get("tiers", [])
	var tier_index: int = 0
	if tiers_value is Array:
		for tier_value in tiers_value:
			if not (tier_value is Dictionary):
				continue
			var tier_config: Dictionary = tier_value as Dictionary
			var level: int = int(tier_config.get("level", tier_index + 1))
			var tier: LeagueTier = LeagueTier.new(
				tier_index + 1,
				str(tier_config.get("name", "联赛%d" % level)),
				level,
				int(tier_config.get("preferred_ability_min", 1)),
				int(tier_config.get("preferred_ability_max", 200))
			)
			tiers.append(tier)
			tier_index += 1

	if tiers.is_empty():
		tiers.append(LeagueTier.new(1, "超级联赛", 1, 120, 200))
		tiers.append(LeagueTier.new(2, "甲级联赛", 2, 70, 150))

	tiers.sort_custom(func(a: LeagueTier, b: LeagueTier) -> bool:
		return a.level < b.level
	)

func _create_default_teams() -> void:
	var team_names: Array[String] = [
		"北城联", "海港竞技", "山谷流星", "西岸骑士", "东都FC",
		"南湖蓝鲸", "钢铁工人", "大学城", "红桥城", "绿茵游侠",
		"广州塔", "南京雨燕", "成都火锅", "武汉江城", "重庆山城",
		"青岛海风", "大连港", "厦门白鹭", "苏州园林", "杭州钱塘"
	]

	var team_id: int = 1
	var name_index: int = 0
	for tier in tiers:
		var team_count: int = _team_count_for_tier(tier)
		for tier_team_index in range(team_count):
			var team_name: String = team_names[name_index] if name_index < team_names.size() else "%s %d" % [tier.tier_name, tier_team_index + 1]
			var team: Team = Team.new(team_id, team_name)
			_migrate_team_fields(team)
			team.league_level = tier.level
			team.money = transfer_system.initial_money()
			economy_system.reset_team_finance(team)
			teams.append(team)
			tier.teams.append(team)

			for player_index in range(18):
				var player: Player = _create_player(next_player_id, tier.level, tier_team_index, player_index)
				transfer_system.setup_player_finance(player, rng, economy_system)
				team.add_player(player)
				next_player_id += 1

			team.auto_select_starting_lineup()
			team_id += 1
			name_index += 1

func _default_player_team() -> Team:
	if tiers.is_empty():
		return teams[0]
	var lowest_tier: LeagueTier = tiers[tiers.size() - 1]
	if not lowest_tier.teams.is_empty():
		return lowest_tier.teams[0]
	return teams[0]

func _team_count_for_tier(tier: LeagueTier) -> int:
	var tiers_value: Variant = league_config.get("tiers", [])
	if tiers_value is Array:
		for tier_value in tiers_value:
			if not (tier_value is Dictionary):
				continue
			var tier_config: Dictionary = tier_value as Dictionary
			if int(tier_config.get("level", 0)) == tier.level:
				return int(tier_config.get("team_count", 10))
	return 10

func _create_player(player_id: int, league_level: int, team_index: int, player_index: int) -> Player:
	var positions: Array[String] = ["GK", "GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW", "FW", "FW", "FW", "MF", "DF"]
	var position: String = positions[player_index]
	var level_base: int = 116 if league_level == 1 else 74
	var base: int = level_base + team_index * 3 + rng.randi_range(-8, 16)
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

func _generate_all_schedules() -> void:
	for tier in tiers:
		tier.schedule = _generate_round_robin_schedule(tier.teams)

func _generate_round_robin_schedule(tier_teams: Array[Team]) -> Array:
	var generated_schedule: Array = []
	var rotation: Array[Team] = tier_teams.duplicate()
	var team_count: int = rotation.size()
	if team_count < 2:
		return generated_schedule
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
		generated_schedule.append(fixtures)

	for fixtures in first_half_schedule:
		var reverse_fixtures: Array = []
		for fixture in fixtures:
			reverse_fixtures.append({
				"home": fixture["away"],
				"away": fixture["home"]
			})
		generated_schedule.append(reverse_fixtures)

	return generated_schedule

func _prepare_non_player_lineups() -> void:
	for team in teams:
		if team == player_team:
			continue
		team.auto_select_starting_lineup()

func _promotion_relegation_logs() -> Array[String]:
	var logs: Array[String] = []
	var promotion_count: int = int(league_config.get("promotion_count", 2))
	var relegation_count: int = int(league_config.get("relegation_count", 2))
	if tiers.size() < 2:
		return logs

	var top_tier: LeagueTier = tiers[0]
	var lower_tier: LeagueTier = tiers[1]
	var top_standings: Array[Team] = LeagueStandings.sorted_teams(top_tier.teams)
	var lower_standings: Array[Team] = LeagueStandings.sorted_teams(lower_tier.teams)

	var relegated: Array[Team] = []
	var promoted: Array[Team] = []
	for index in range(relegation_count):
		var relegation_index: int = top_standings.size() - 1 - index
		if relegation_index >= 0:
			relegated.append(top_standings[relegation_index])
	for index in range(promotion_count):
		if index < lower_standings.size():
			promoted.append(lower_standings[index])

	for team in promoted:
		var rank: int = lower_standings.find(team) + 1
		team.league_level = top_tier.level
		var title: String = "第%d名" % rank
		if rank == 1:
			title = "冠军"
		elif rank == 2:
			title = "亚军"
		team.league_history.append("%d 升级" % season_year)
		logs.append("%s获得%s%s，升入%s" % [team.team_name, lower_tier.tier_name, title, top_tier.tier_name])
		if team == player_team:
			logs.append("恭喜升级至%s" % top_tier.tier_name)

	for team in relegated:
		team.league_level = lower_tier.level
		team.league_history.append("%d 降级" % season_year)
		logs.append("%s降入%s" % [team.team_name, lower_tier.tier_name])
		if team == player_team:
			logs.append("球队降入%s" % lower_tier.tier_name)

	active_standings_level = player_team.league_level
	return logs

func _record_team_rank_history() -> void:
	for tier in tiers:
		var sorted: Array[Team] = LeagueStandings.sorted_teams(tier.teams)
		for index in range(sorted.size()):
			var team: Team = sorted[index]
			team.league_history.append("%d %s 第%d名" % [season_year, tier.tier_name, index + 1])

func _rebuild_tier_teams() -> void:
	for tier in tiers:
		tier.teams.clear()
	for team in teams:
		_migrate_team_fields(team)
		var tier: LeagueTier = tier_by_level(team.league_level)
		if tier == null:
			tier = tiers[0]
			team.league_level = tier.level
		tier.teams.append(team)

func _apply_league_config_to_systems() -> void:
	transfer_system.low_cash_threshold = economy_system.ai_low_cash_threshold()
	transfer_system.low_cash_list_score = economy_system.ai_low_cash_list_score()
	transfer_system.crisis_cash_threshold = economy_system.ai_crisis_cash_threshold()
	transfer_system.crisis_cash_list_score = economy_system.ai_crisis_cash_list_score()
	transfer_system.preferred_ability_ranges = _preferred_ability_ranges()
	youth_system.tier_youth_ability_bonus = _tier_youth_ability_bonus()

func _preferred_ability_ranges() -> Dictionary:
	var result: Dictionary = {}
	for tier in tiers:
		result[str(tier.level)] = {
			"min": tier.preferred_ability_min,
			"max": tier.preferred_ability_max
		}
	return result

func _tier_youth_ability_bonus() -> Dictionary:
	var value: Variant = league_config.get("tier_youth_ability_bonus", {})
	if value is Dictionary:
		return value as Dictionary
	return {}

func _migrate_team_fields(team: Team) -> void:
	if team.league_level <= 0:
		team.league_level = 1

func _load_config() -> void:
	league_config = _default_config()
	if not FileAccess.file_exists(CONFIG_PATH):
		return

	var file: FileAccess = FileAccess.open(CONFIG_PATH, FileAccess.READ)
	if file == null:
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		league_config = parsed as Dictionary

func _default_config() -> Dictionary:
	return {
		"promotion_count": 2,
		"relegation_count": 2,
		"tier_youth_ability_bonus": {
			"1": 10,
			"2": 0
		},
		"tiers": [
			{
				"name": "超级联赛",
				"level": 1,
				"team_count": 10,
				"preferred_ability_min": 120,
				"preferred_ability_max": 200
			},
			{
				"name": "甲级联赛",
				"level": 2,
				"team_count": 10,
				"preferred_ability_min": 70,
				"preferred_ability_max": 150
			}
		]
	}
