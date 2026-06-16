class_name YouthSystem
extends RefCounted

const CONFIG_PATH: String = "res://config/youth_config.json"

var config: Dictionary = {}
var next_player_id: int = 1

func _init() -> void:
	_load_config()

func process_season_end(
	teams: Array[Team],
	rng: RandomNumberGenerator,
	transfer_system: TransferSystem,
	economy_system: EconomySystem,
	_season_year: int,
	start_player_id: int,
	log_team: Team
) -> Array[String]:
	next_player_id = start_player_id
	var logs: Array[String] = []

	for team in teams:
		_age_and_retire_players(team, rng, logs, log_team)

	for team in teams:
		_generate_base_youth_players(team, rng, transfer_system, economy_system, logs, log_team)
		_fill_team_to_minimum_size(team, rng, transfer_system, economy_system, logs, log_team)

	return logs

func random_name(rng: RandomNumberGenerator) -> String:
	return _random_name(rng)

func _age_and_retire_players(team: Team, rng: RandomNumberGenerator, logs: Array[String], log_team: Team) -> void:
	var retired_players: Array[Player] = []

	for player in team.players:
		player.age += 1
		if _should_retire(player.age, rng):
			retired_players.append(player)

	for player in retired_players:
		team.remove_player(player)
		if team == log_team:
			logs.append("%s 退役了" % player.player_name)

func _generate_base_youth_players(
	team: Team,
	rng: RandomNumberGenerator,
	transfer_system: TransferSystem,
	economy_system: EconomySystem,
	logs: Array[String],
	log_team: Team
) -> void:
	var count: int = int(config.get("youth_players_per_team_per_season", 2))
	for _index in range(count):
		var player: Player = _create_youth_player(rng, transfer_system)
		team.add_player(player)
		var cost: int = economy_system.charge_youth_cost(team)
		if team == log_team:
			logs.append("%s，青训成本%s" % [_youth_log(team, player), economy_system.format_money(cost)])

func _fill_team_to_minimum_size(
	team: Team,
	rng: RandomNumberGenerator,
	transfer_system: TransferSystem,
	economy_system: EconomySystem,
	logs: Array[String],
	log_team: Team
) -> void:
	var min_size: int = int(config.get("min_team_size_after_season", 18))
	while team.players.size() < min_size:
		var player: Player = _create_youth_player(rng, transfer_system)
		team.add_player(player)
		var cost: int = economy_system.charge_youth_cost(team)
		if team == log_team:
			logs.append("人数不足，补充青训 %s，%d岁，%s，能力%d，潜力%d，青训成本%s" % [
				player.player_name,
				player.age,
				player.position,
				player.ability,
				player.potential,
				economy_system.format_money(cost)
			])

func _create_youth_player(rng: RandomNumberGenerator, transfer_system: TransferSystem) -> Player:
	var positions_value: Variant = config.get("positions", ["GK", "DF", "MF", "FW"])
	var positions: Array = ["GK", "DF", "MF", "FW"]
	if positions_value is Array:
		positions = positions_value as Array
	if positions.is_empty():
		positions = ["GK", "DF", "MF", "FW"]
	var position: String = str(positions[rng.randi_range(0, positions.size() - 1)])
	var age_min: int = int(config.get("youth_age_min", 16))
	var age_max: int = maxi(age_min, int(config.get("youth_age_max", 18)))
	var ability_min: int = clampi(int(config.get("youth_ability_min", 30)), 1, 200)
	var ability_max: int = clampi(maxi(ability_min, int(config.get("youth_ability_max", 80))), 1, 200)
	var potential_max: int = clampi(maxi(ability_min, int(config.get("youth_potential_max", 200))), 1, 200)
	var age: int = rng.randi_range(age_min, age_max)
	var ability: int = rng.randi_range(ability_min, ability_max)
	var potential: int = rng.randi_range(ability, maxi(ability, potential_max))
	var player_name: String = _random_name(rng)

	var player: Player = Player.new(
		next_player_id,
		player_name,
		position,
		age,
		ability,
		potential,
		ability,
		ability,
		ability,
		ability
	)
	next_player_id += 1
	transfer_system.setup_player_finance(player, rng)
	player.contract_years = int(config.get("youth_contract_years", 3))
	player.is_transfer_listed = false
	return player

func _youth_log(_team: Team, player: Player) -> String:
	return "青训提拔 %s，%d岁，%s，能力%d，潜力%d" % [
		player.player_name,
		player.age,
		player.position,
		player.ability,
		player.potential
	]

func _random_name(rng: RandomNumberGenerator) -> String:
	var first_names_value: Variant = config.get("first_names", ["张", "王", "李", "赵", "陈", "刘"])
	var last_names_value: Variant = config.get("last_names", ["伟", "强", "磊", "明", "超", "博", "宇", "杰"])
	var first_names: Array = ["张", "王", "李", "赵", "陈", "刘"]
	var last_names: Array = ["伟", "强", "磊", "明", "超", "博", "宇", "杰"]
	if first_names_value is Array:
		first_names = first_names_value as Array
	if last_names_value is Array:
		last_names = last_names_value as Array
	if first_names.is_empty():
		first_names = ["张", "王", "李", "赵", "陈", "刘"]
	if last_names.is_empty():
		last_names = ["伟", "强", "磊", "明", "超", "博", "宇", "杰"]
	var first_name: String = str(first_names[rng.randi_range(0, first_names.size() - 1)])
	var last_name: String = str(last_names[rng.randi_range(0, last_names.size() - 1)])
	return "%s%s" % [first_name, last_name]

func _should_retire(age: int, rng: RandomNumberGenerator) -> bool:
	var rules_value: Variant = config.get("retirement_rules", [])
	var rules: Array = []
	if rules_value is Array:
		rules = rules_value as Array
	for rule_value in rules:
		if not (rule_value is Dictionary):
			continue
		var rule: Dictionary = rule_value as Dictionary
		var min_age: int = int(rule.get("min_age", 0))
		var max_age: int = int(rule.get("max_age", 99))
		if age >= min_age and age <= max_age:
			return rng.randf() < float(rule.get("probability", 0.0))
	return false

func _load_config() -> void:
	config = _default_config()
	if not FileAccess.file_exists(CONFIG_PATH):
		return

	var file: FileAccess = FileAccess.open(CONFIG_PATH, FileAccess.READ)
	if file == null:
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		config = parsed as Dictionary

func _default_config() -> Dictionary:
	return {
		"retirement_rules": [
			{"min_age": 36, "max_age": 37, "probability": 0.3},
			{"min_age": 38, "max_age": 39, "probability": 0.6},
			{"min_age": 40, "max_age": 99, "probability": 1.0}
		],
		"youth_players_per_team_per_season": 2,
		"youth_age_min": 16,
		"youth_age_max": 18,
		"youth_ability_min": 30,
		"youth_ability_max": 80,
		"youth_potential_max": 200,
		"youth_contract_years": 3,
		"min_team_size_after_season": 18,
		"positions": ["GK", "DF", "MF", "FW"],
		"first_names": ["张", "王", "李", "赵", "陈", "刘"],
		"last_names": ["伟", "强", "磊", "明", "超", "博", "宇", "杰"]
	}
