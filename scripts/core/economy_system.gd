class_name EconomySystem
extends RefCounted

const CONFIG_PATH: String = "res://config/economy_config.json"

var config: Dictionary = {}

func _init() -> void:
	_load_config()

func settle_match(result: Dictionary) -> Array[String]:
	var logs: Array[String] = []
	var home: Team = result["home"] as Team
	var away: Team = result["away"] as Team
	var home_goals: int = int(result["home_goals"])
	var away_goals: int = int(result["away_goals"])

	_add_ticket_income(home, int(config.get("home_ticket_income", 50)), logs)
	_add_ticket_income(away, int(config.get("away_ticket_income", 20)), logs)
	_add_match_bonus(home, _bonus_for_result(home_goals, away_goals), logs)
	_add_match_bonus(away, _bonus_for_result(away_goals, home_goals), logs)
	_pay_match_salary(home, logs)
	_pay_match_salary(away, logs)

	update_financial_status(home)
	update_financial_status(away)
	logs.append("%s 当前资金：%s" % [home.team_name, format_money(home.money)])
	logs.append("%s 当前资金：%s" % [away.team_name, format_money(away.money)])
	return logs

func settle_ranking_bonus(sorted_teams: Array[Team]) -> Array[String]:
	var logs: Array[String] = []
	var ranking_bonus: Dictionary = _ranking_bonus_config()

	for index in range(sorted_teams.size()):
		var rank: int = index + 1
		var team: Team = sorted_teams[index]
		var bonus: int = int(ranking_bonus.get(str(rank), 0))
		if bonus <= 0:
			continue
		team.money += bonus
		team.season_bonus_income += bonus
		team.season_income += bonus
		update_financial_status(team)
		if rank == 1:
			logs.append("%s 获得冠军奖金 %s" % [team.team_name, format_money(bonus)])
		else:
			logs.append("%s 获得第%d名奖金 %s" % [team.team_name, rank, format_money(bonus)])

	return logs

func charge_youth_cost(team: Team) -> int:
	var cost: int = int(config.get("youth_player_cost", 10))
	team.money -= cost
	team.season_expense += cost
	update_financial_status(team)
	return cost

func reset_team_finance(team: Team) -> void:
	team.season_income = 0
	team.season_expense = 0
	team.season_transfer_income = 0
	team.season_transfer_expense = 0
	team.season_salary_expense = 0
	team.season_ticket_income = 0
	team.season_bonus_income = 0
	update_financial_status(team)

func cash_warning(team: Team) -> String:
	update_financial_status(team)
	if team.financial_status == "CRISIS":
		return "严重财政危机"
	if team.financial_status == "WARNING":
		return "财政预警"
	return ""

func ai_low_cash_threshold() -> int:
	return int(config.get("ai_low_cash_threshold", 200))

func ai_low_cash_list_score() -> int:
	return int(config.get("ai_low_cash_list_score", 20))

func ai_crisis_cash_threshold() -> int:
	return int(config.get("ai_crisis_cash_threshold", 0))

func ai_crisis_cash_list_score() -> int:
	return int(config.get("ai_crisis_cash_list_score", 50))

func generate_weekly_salary(ability: int, rng: RandomNumberGenerator) -> int:
	var bracket: Dictionary = _weekly_salary_bracket(ability)
	var min_salary: int = int(bracket.get("min_salary", 1))
	var max_salary: int = maxi(min_salary, int(bracket.get("max_salary", min_salary)))
	var base_salary: int = rng.randi_range(min_salary, max_salary)
	var multiplier: float = rng.randf_range(
		float(config.get("weekly_salary_random_min", 0.8)),
		float(config.get("weekly_salary_random_max", 1.2))
	)
	return maxi(1, int(round(float(base_salary) * multiplier)))

func update_financial_status(team: Team) -> void:
	if team.money < 0:
		team.financial_status = "CRISIS"
	elif team.money <= int(config.get("financial_warning_cash", 1000)):
		team.financial_status = "WARNING"
	else:
		team.financial_status = "HEALTHY"

func format_money(amount: int) -> String:
	var sign: String = ""
	var value: int = amount
	if amount < 0:
		sign = "-"
		value = -amount
	return "%s%d万" % [sign, value]

func _add_ticket_income(team: Team, amount: int, logs: Array[String]) -> void:
	team.money += amount
	team.season_ticket_income += amount
	team.season_income += amount
	logs.append("%s 获得门票收入 %s" % [team.team_name, format_money(amount)])

func _add_match_bonus(team: Team, amount: int, logs: Array[String]) -> void:
	if amount <= 0:
		return
	team.money += amount
	team.season_bonus_income += amount
	team.season_income += amount
	logs.append("%s 获得比赛奖金 %s" % [team.team_name, format_money(amount)])

func _pay_match_salary(team: Team, logs: Array[String]) -> void:
	var total_weekly_salary: int = 0
	for player in team.players:
		total_weekly_salary += player.weekly_salary

	team.money -= total_weekly_salary
	team.season_salary_expense += total_weekly_salary
	team.season_expense += total_weekly_salary
	logs.append("%s 支付周薪 %s" % [team.team_name, format_money(total_weekly_salary)])

func _bonus_for_result(scored: int, conceded: int) -> int:
	if scored > conceded:
		return int(config.get("win_bonus", 10))
	if scored == conceded:
		return int(config.get("draw_bonus", 3))
	return int(config.get("lose_bonus", 0))

func _ranking_bonus_config() -> Dictionary:
	var value: Variant = config.get("ranking_bonus", {})
	if value is Dictionary:
		return value as Dictionary
	return {}

func _weekly_salary_bracket(ability: int) -> Dictionary:
	var brackets_value: Variant = config.get("weekly_salary_brackets", [])
	if brackets_value is Array:
		var brackets: Array = brackets_value as Array
		for bracket_value in brackets:
			if not (bracket_value is Dictionary):
				continue
			var bracket: Dictionary = bracket_value as Dictionary
			var min_ability: int = int(bracket.get("min_ability", 1))
			var max_ability: int = int(bracket.get("max_ability", 200))
			if ability >= min_ability and ability <= max_ability:
				return bracket
	return {"min_salary": 1, "max_salary": 3}

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
		"home_ticket_income": 50,
		"away_ticket_income": 20,
		"win_bonus": 10,
		"draw_bonus": 3,
		"lose_bonus": 0,
		"youth_player_cost": 10,
		"financial_warning_cash": 1000,
		"ai_low_cash_threshold": 200,
		"ai_low_cash_list_score": 20,
		"ai_crisis_cash_threshold": 0,
		"ai_crisis_cash_list_score": 50,
		"weekly_salary_random_min": 0.8,
		"weekly_salary_random_max": 1.2,
		"weekly_salary_brackets": [
			{"min_ability": 1, "max_ability": 49, "min_salary": 1, "max_salary": 3},
			{"min_ability": 50, "max_ability": 79, "min_salary": 3, "max_salary": 10},
			{"min_ability": 80, "max_ability": 119, "min_salary": 10, "max_salary": 30},
			{"min_ability": 120, "max_ability": 159, "min_salary": 30, "max_salary": 80},
			{"min_ability": 160, "max_ability": 200, "min_salary": 80, "max_salary": 200}
		],
		"ranking_bonus": {
			"1": 1000,
			"2": 800,
			"3": 600,
			"4": 500,
			"5": 400,
			"6": 300,
			"7": 250,
			"8": 200,
			"9": 150,
			"10": 100
		}
	}
