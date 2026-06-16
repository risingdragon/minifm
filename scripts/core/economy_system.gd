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

	_add_ticket_income(home, int(config.get("home_ticket_income", 500000)), logs)
	_add_ticket_income(away, int(config.get("away_ticket_income", 200000)), logs)
	_add_match_bonus(home, _bonus_for_result(home_goals, away_goals), logs)
	_add_match_bonus(away, _bonus_for_result(away_goals, home_goals), logs)
	_pay_match_salary(home, logs)
	_pay_match_salary(away, logs)

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
		if rank == 1:
			logs.append("%s 获得冠军奖金 %s" % [team.team_name, format_money(bonus)])
		else:
			logs.append("%s 获得第%d名奖金 %s" % [team.team_name, rank, format_money(bonus)])

	return logs

func charge_youth_cost(team: Team) -> int:
	var cost: int = int(config.get("youth_player_cost", 100000))
	team.money -= cost
	team.season_expense += cost
	return cost

func reset_team_finance(team: Team) -> void:
	team.season_income = 0
	team.season_expense = 0
	team.season_transfer_income = 0
	team.season_transfer_expense = 0
	team.season_salary_expense = 0
	team.season_ticket_income = 0
	team.season_bonus_income = 0

func cash_warning(team: Team) -> String:
	if team.money < 0:
		return "严重财政危机"
	if team.money < int(config.get("minimum_cash_warning", 0)):
		return "财政赤字"
	return ""

func ai_low_cash_threshold() -> int:
	return int(config.get("ai_low_cash_threshold", 2000000))

func ai_low_cash_list_score() -> int:
	return int(config.get("ai_low_cash_list_score", 20))

func format_money(amount: int) -> String:
	var sign: String = ""
	var value: int = amount
	if amount < 0:
		sign = "-"
		value = -amount
	if value >= 10000:
		return "%s%d万" % [sign, int(round(float(value) / 10000.0))]
	return "%s%d" % [sign, value]

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
	var divisor: int = maxi(1, int(config.get("salary_divisor_per_match", 30)))
	var total_salary: int = 0
	for player in team.players:
		total_salary += int(round(float(player.salary) / float(divisor)))

	team.money -= total_salary
	team.season_salary_expense += total_salary
	team.season_expense += total_salary
	logs.append("%s 支付工资 %s" % [team.team_name, format_money(total_salary)])

func _bonus_for_result(scored: int, conceded: int) -> int:
	if scored > conceded:
		return int(config.get("win_bonus", 100000))
	if scored == conceded:
		return int(config.get("draw_bonus", 30000))
	return int(config.get("lose_bonus", 0))

func _ranking_bonus_config() -> Dictionary:
	var value: Variant = config.get("ranking_bonus", {})
	if value is Dictionary:
		return value as Dictionary
	return {}

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
		"home_ticket_income": 500000,
		"away_ticket_income": 200000,
		"win_bonus": 100000,
		"draw_bonus": 30000,
		"lose_bonus": 0,
		"salary_divisor_per_match": 30,
		"youth_player_cost": 100000,
		"minimum_cash_warning": 0,
		"ai_low_cash_threshold": 2000000,
		"ai_low_cash_list_score": 20,
		"ranking_bonus": {
			"1": 10000000,
			"2": 8000000,
			"3": 6000000,
			"4": 5000000,
			"5": 4000000,
			"6": 3000000,
			"7": 2500000,
			"8": 2000000,
			"9": 1500000,
			"10": 1000000
		}
	}
