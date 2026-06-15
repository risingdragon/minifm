class_name PlayerGrowthSystem
extends RefCounted

const CONFIG_PATH: String = "res://config/player_growth_config.json"

var min_ability: int = 1
var max_ability: int = 200
var age_rules: Array = []

func _init() -> void:
	_load_config()

func process_teams(teams: Array[Team], rng: RandomNumberGenerator, log_team: Team) -> Array[Dictionary]:
	var logs: Array[Dictionary] = []

	for team in teams:
		for player in team.players:
			var actual_change: int = _process_player(player, rng)
			if team == log_team and actual_change != 0:
				logs.append(_build_log(player, actual_change))

	return logs

func _process_player(player: Player, rng: RandomNumberGenerator) -> int:
	var rule: Dictionary = _rule_for_age(player.age)
	if rule.is_empty():
		return player.apply_ability_change(0, min_ability, max_ability)

	var grow_probability: float = float(rule.get("grow_probability", 0.0))
	var decline_probability: float = float(rule.get("decline_probability", 0.0))
	var change_value: int = int(rule.get("change_value", 1))
	var roll: float = rng.randf()
	var planned_change: int = 0

	if roll < grow_probability:
		planned_change = change_value
	elif roll < grow_probability + decline_probability:
		planned_change = -change_value

	return player.apply_ability_change(planned_change, min_ability, max_ability)

func _build_log(player: Player, actual_change: int) -> Dictionary:
	var change_text: String = "能力不变"
	if actual_change > 0:
		change_text = "能力 +%d" % actual_change
	elif actual_change < 0:
		change_text = "能力 %d" % actual_change

	return {
		"text": "%s %d岁：%s，当前能力 %d" % [player.player_name, player.age, change_text, player.ability],
		"change": actual_change
	}

func _rule_for_age(age: int) -> Dictionary:
	for rule_value in age_rules:
		if not (rule_value is Dictionary):
			continue

		var rule: Dictionary = rule_value as Dictionary
		var min_age: int = int(rule.get("min_age", 0))
		var max_age: int = int(rule.get("max_age", 999))
		if age >= min_age and age <= max_age:
			return rule

	return {}

func _load_config() -> void:
	var loaded_config: Dictionary = _default_config()

	if FileAccess.file_exists(CONFIG_PATH):
		var file: FileAccess = FileAccess.open(CONFIG_PATH, FileAccess.READ)
		if file != null:
			var text: String = file.get_as_text()
			var parsed: Variant = JSON.parse_string(text)
			if parsed is Dictionary:
				loaded_config = parsed as Dictionary

	min_ability = int(loaded_config.get("min_ability", 1))
	max_ability = int(loaded_config.get("max_ability", 200))
	var loaded_rules: Variant = loaded_config.get("age_rules", [])
	if loaded_rules is Array:
		age_rules = loaded_rules as Array
	else:
		var fallback_config: Dictionary = _default_config()
		age_rules = fallback_config["age_rules"] as Array

func _default_config() -> Dictionary:
	return {
		"min_ability": 1,
		"max_ability": 200,
		"age_rules": [
			{"min_age": 18, "max_age": 23, "grow_probability": 0.5, "decline_probability": 0.0, "change_value": 1},
			{"min_age": 24, "max_age": 28, "grow_probability": 0.25, "decline_probability": 0.0, "change_value": 1},
			{"min_age": 29, "max_age": 31, "grow_probability": 0.0, "decline_probability": 0.5, "change_value": 1},
			{"min_age": 32, "max_age": 200, "grow_probability": 0.0, "decline_probability": 0.75, "change_value": 1}
		]
	}
