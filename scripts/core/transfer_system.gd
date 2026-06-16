class_name TransferSystem
extends RefCounted

const CONFIG_PATH: String = "res://config/transfer_config.json"

var config: Dictionary = {}
var logs: Array[Dictionary] = []
var lineup_warning: String = ""
var low_cash_threshold: int = 200
var low_cash_list_score: int = 20
var crisis_cash_threshold: int = 0
var crisis_cash_list_score: int = 50
var preferred_ability_ranges: Dictionary = {}

func _init() -> void:
	_load_config()

func initial_money() -> int:
	return int(config.get("initial_money", 200000))

func clear_logs() -> void:
	logs.clear()

func setup_player_finance(player: Player, rng: RandomNumberGenerator, economy_system: EconomySystem) -> void:
	player.market_value = calculate_market_value(player)
	player.weekly_salary = economy_system.generate_weekly_salary(player.ability, rng)
	player.contract_years = rng.randi_range(1, 5)
	player.is_transfer_listed = false

func refresh_player_finance(teams: Array[Team]) -> void:
	for team in teams:
		for player in team.players:
			player.market_value = calculate_market_value(player)

func calculate_market_value(player: Player) -> int:
	var market_value: float = float(player.ability) * float(config.get("value_ability_multiplier", 1.0))
	market_value += float(player.potential) * float(config.get("value_potential_multiplier", 0.5))

	if player.age <= int(config.get("young_age_bonus_max_age", 24)):
		market_value *= float(config.get("young_age_bonus_multiplier", 1.3))

	if player.age >= int(config.get("old_age_discount_min_age", 32)):
		market_value *= float(config.get("old_age_discount_multiplier", 0.6))

	return maxi(1, int(round(market_value)))

func listed_players(teams: Array[Team]) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for team in teams:
		for player in team.players:
			if player.is_transfer_listed:
				result.append({"player": player, "team": team})
	return result

func toggle_player_listing(team: Team, player: Player, highlight_log: bool = false) -> String:
	if not team.players.has(player):
		return "球员不属于该球队"

	if player.is_transfer_listed:
		player.is_transfer_listed = false
		_add_log("%s 取消挂牌 %s" % [team.team_name, player.player_name], highlight_log)
		return "已取消挂牌"

	if team.players.size() <= 11:
		return "球队人数不足，无法挂牌"

	player.is_transfer_listed = true
	_add_log("%s 挂牌 %s（身价%s）" % [team.team_name, player.player_name, format_money(player.market_value)], highlight_log)
	return "已挂牌"

func buy_player(buyer: Team, seller: Team, player: Player, highlight_log: bool = false) -> String:
	if buyer == seller:
		return "不能购买本队球员"

	if not seller.players.has(player):
		return "球员已不在卖方球队"

	if seller.players.size() <= 11:
		return "卖方球队人数不足，无法出售"

	if buyer.money < player.market_value:
		return "资金不足"

	buyer.money -= player.market_value
	seller.money += player.market_value
	_update_financial_status(buyer)
	_update_financial_status(seller)
	buyer.season_transfer_expense += player.market_value
	buyer.season_expense += player.market_value
	seller.season_transfer_income += player.market_value
	seller.season_income += player.market_value
	seller.remove_player(player)
	buyer.add_player(player)
	player.is_transfer_listed = false

	_add_log("%s 签下 %s 的 %s（转会费%s）" % [
		buyer.team_name,
		seller.team_name,
		player.player_name,
		format_money(player.market_value)
	], highlight_log)
	return "转会成功"

func process_ai_transfers(teams: Array[Team], player_team: Team) -> void:
	lineup_warning = ""
	_process_ai_listing(teams, player_team)
	_process_ai_buying(teams, player_team)

func format_money(amount: int) -> String:
	return "%d万" % amount

func _process_ai_listing(teams: Array[Team], player_team: Team) -> void:
	var max_per_team: int = int(config.get("ai_list_max_per_team_per_round", 1))
	var min_team_size: int = int(config.get("ai_list_min_team_size", 14))
	var threshold: int = int(config.get("ai_list_score_threshold", 40))

	for team in teams:
		if team == player_team or team.players.size() <= min_team_size:
			continue

		var listed_count: int = 0
		var best_player: Player = null
		var best_score: int = -999
		for player in team.players:
			if player.is_transfer_listed:
				continue
			var score: int = _listing_score(team, player)
			if score > best_score:
				best_score = score
				best_player = player

		if best_player != null and best_score >= threshold and listed_count < max_per_team:
			best_player.is_transfer_listed = true
			_add_log("%s 挂牌 %s（身价%s）" % [team.team_name, best_player.player_name, format_money(best_player.market_value)], false)
			listed_count += 1

func _process_ai_buying(teams: Array[Team], player_team: Team) -> void:
	for buyer in teams:
		if buyer == player_team or buyer.players.size() >= 18:
			continue

		var best_player: Player = null
		var best_seller: Team = null
		var best_score: int = -999999

		for seller in teams:
			if seller == buyer:
				continue
			for player in seller.players:
				if not player.is_transfer_listed or buyer.money < player.market_value:
					continue
				if seller.players.size() <= 11:
					continue
				var score: int = player.ability * 2 + player.potential - player.age
				score += _tier_buy_score_adjustment(buyer, player)
				if score > best_score:
					best_score = score
					best_player = player
					best_seller = seller

		if best_player != null and best_seller != null:
			var was_player_seller: bool = best_seller == player_team
			buy_player(buyer, best_seller, best_player, was_player_seller)
			if was_player_seller:
				lineup_warning = "%s 已转会离队，请重新调整阵容" % best_player.player_name

func _add_log(text: String, highlight: bool = false) -> void:
	logs.append({"text": text, "highlight": highlight})

func _tier_buy_score_adjustment(team: Team, player: Player) -> int:
	var range_value: Variant = preferred_ability_ranges.get(str(team.league_level), {})
	if not (range_value is Dictionary):
		return 0
	var ability_range: Dictionary = range_value as Dictionary
	var min_ability: int = int(ability_range.get("min", 1))
	var max_ability: int = int(ability_range.get("max", 200))
	if player.ability >= min_ability and player.ability <= max_ability:
		return 60
	if player.ability > max_ability:
		return -30
	return -60

func _update_financial_status(team: Team) -> void:
	if team.money < 0:
		team.financial_status = "CRISIS"
	elif team.money <= 1000:
		team.financial_status = "WARNING"
	else:
		team.financial_status = "HEALTHY"

func _listing_score(team: Team, player: Player) -> int:
	var score: int = 0
	if team.money < crisis_cash_threshold:
		score += crisis_cash_list_score
	elif team.money < low_cash_threshold:
		score += low_cash_list_score
	if player.age >= int(config.get("ai_list_old_age", 32)):
		score += int(config.get("ai_list_old_age_score", 30))
	if player.age >= int(config.get("ai_list_very_old_age", 35)):
		score += int(config.get("ai_list_very_old_age_extra_score", 20))
	if player.ability < _position_average_ability(team, player.position):
		score += int(config.get("ai_list_low_position_ability_score", 20))
	if player.potential <= player.ability + 5:
		score += int(config.get("ai_list_low_potential_score", 15))
	if player.weekly_salary > _average_weekly_salary(team):
		score += int(config.get("ai_list_high_weekly_salary_score", 10))
	if team.money < low_cash_threshold:
		score += int(round(float(player.weekly_salary) * float(config.get("ai_list_weekly_salary_pressure_multiplier", 0.2))))
	if _position_count(team, player.position) > _expected_position_count(player.position):
		score += int(config.get("ai_list_surplus_position_score", 15))
	if team.is_player_starting(player):
		score -= int(config.get("ai_list_starter_penalty", 50))
	return score

func _position_average_ability(team: Team, position: String) -> float:
	var total: float = 0.0
	var count: int = 0
	for player in team.players:
		if player.position == position:
			total += player.ability
			count += 1
	if count == 0:
		return 0.0
	return total / count

func _average_weekly_salary(team: Team) -> float:
	if team.players.is_empty():
		return 0.0
	var total: float = 0.0
	for player in team.players:
		total += player.weekly_salary
	return total / team.players.size()

func _position_count(team: Team, position: String) -> int:
	var count: int = 0
	for player in team.players:
		if player.position == position:
			count += 1
	return count

func _expected_position_count(position: String) -> int:
	match position:
		"GK":
			return 2
		"DF":
			return 6
		"MF":
			return 6
		"FW":
			return 4
		_:
			return 4

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
		"initial_money": 200000,
		"value_ability_multiplier": 1.0,
		"value_potential_multiplier": 0.5,
		"young_age_bonus_max_age": 24,
		"young_age_bonus_multiplier": 1.3,
		"old_age_discount_min_age": 32,
		"old_age_discount_multiplier": 0.6,
		"ai_list_max_per_team_per_round": 1,
		"ai_list_min_team_size": 14,
		"ai_list_score_threshold": 40,
		"ai_list_old_age": 32,
		"ai_list_very_old_age": 35,
		"ai_list_old_age_score": 30,
		"ai_list_very_old_age_extra_score": 20,
		"ai_list_low_position_ability_score": 20,
		"ai_list_low_potential_score": 15,
		"ai_list_high_weekly_salary_score": 10,
		"ai_list_weekly_salary_pressure_multiplier": 0.2,
		"ai_list_surplus_position_score": 15,
		"ai_list_starter_penalty": 50
	}
