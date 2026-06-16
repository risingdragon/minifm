class_name Team
extends RefCounted

var id: int
var team_name: String
var league_level: int = 1
var league_history: Array[String] = []
var money: int = 0
var financial_status: String = "HEALTHY"
var season_income: int = 0
var season_expense: int = 0
var season_transfer_income: int = 0
var season_transfer_expense: int = 0
var season_salary_expense: int = 0
var season_ticket_income: int = 0
var season_bonus_income: int = 0
var players: Array[Player] = []
var starting_players: Array[Player] = []

var played: int = 0
var won: int = 0
var drawn: int = 0
var lost: int = 0
var goals_for: int = 0
var goals_against: int = 0
var points: int = 0

func _init(_id: int, _team_name: String) -> void:
	id = _id
	team_name = _team_name

func add_player(player: Player) -> void:
	players.append(player)

func remove_player(player: Player) -> void:
	if starting_players.has(player):
		starting_players.erase(player)
	if players.has(player):
		players.erase(player)

func set_player_starting(player: Player, selected: bool) -> void:
	if selected:
		if not starting_players.has(player):
			starting_players.append(player)
	elif starting_players.has(player):
		starting_players.erase(player)

func is_player_starting(player: Player) -> bool:
	return starting_players.has(player)

func starting_count() -> int:
	return starting_players.size()

func starting_gk_count() -> int:
	var count: int = 0
	for player in starting_players:
		if player.position == "GK":
			count += 1
	return count

func lineup_error() -> String:
	if starting_count() != 11:
		return "首发人数必须正好 11 人，当前为 %d 人。" % starting_count()

	if starting_gk_count() != 1:
		return "首发 GK 必须正好 1 人，当前为 %d 人。" % starting_gk_count()

	return ""

func is_lineup_valid() -> bool:
	return lineup_error().is_empty()

func auto_select_starting_lineup() -> void:
	starting_players.clear()

	var goalkeepers: Array[Player] = _players_by_position("GK")
	goalkeepers.sort_custom(func(a: Player, b: Player) -> bool:
		return a.overall() > b.overall()
	)

	if not goalkeepers.is_empty():
		starting_players.append(goalkeepers[0])

	var outfield_players: Array[Player] = []
	for player in players:
		if player.position != "GK":
			outfield_players.append(player)

	outfield_players.sort_custom(func(a: Player, b: Player) -> bool:
		return a.overall() > b.overall()
	)

	for player in outfield_players:
		if starting_players.size() >= 11:
			break
		starting_players.append(player)

func lineup_strength() -> Dictionary:
	return {
		"attack_strength": lineup_attack_strength(),
		"defense_strength": lineup_defense_strength()
	}

func lineup_attack_strength() -> float:
	var attack_total: float = 0.0

	for player in starting_players:
		match player.position:
			"DF":
				attack_total += player.ability * 0.2
			"MF":
				attack_total += player.ability * 0.65
			"FW":
				attack_total += player.ability * 1.0

	return attack_total / 20.0

func lineup_defense_strength() -> float:
	var defense_total: float = 0.0

	for player in starting_players:
		match player.position:
			"GK":
				defense_total += player.ability * 1.2
			"DF":
				defense_total += player.ability * 1.0
			"MF":
				defense_total += player.ability * 0.55
			"FW":
				defense_total += player.ability * 0.15

	return defense_total / 20.0

func reset_record() -> void:
	played = 0
	won = 0
	drawn = 0
	lost = 0
	goals_for = 0
	goals_against = 0
	points = 0

func record_match(scored: int, conceded: int) -> void:
	played += 1
	goals_for += scored
	goals_against += conceded

	if scored > conceded:
		won += 1
		points += 3
	elif scored == conceded:
		drawn += 1
		points += 1
	else:
		lost += 1

func goal_difference() -> int:
	return goals_for - goals_against

func attack_rating() -> float:
	return _average_position_rating("FW", "attack") * 0.65 + _average_position_rating("MF", "attack") * 0.35

func midfield_rating() -> float:
	return _average_position_rating("MF", "midfield") * 0.65 + _average_position_rating("DF", "midfield") * 0.2 + _average_position_rating("FW", "midfield") * 0.15

func defense_rating() -> float:
	return _average_position_rating("DF", "defense") * 0.6 + _average_position_rating("GK", "goalkeeping") * 0.25 + _average_position_rating("MF", "defense") * 0.15

func team_rating() -> float:
	if players.is_empty():
		return 0.0

	var total: float = 0.0
	for player in players:
		total += player.overall()
	return total / players.size()

func _average_position_rating(position: String, attribute: String) -> float:
	var total: float = 0.0
	var count: int = 0

	for player in players:
		if player.position != position:
			continue

		total += _player_attribute(player, attribute)
		count += 1

	if count == 0:
		return team_rating()

	return total / count

func _players_by_position(position: String) -> Array[Player]:
	var result: Array[Player] = []
	for player in players:
		if player.position == position:
			result.append(player)
	return result

func _player_attribute(player: Player, attribute: String) -> int:
	match attribute:
		"attack":
			return player.attack
		"midfield":
			return player.midfield
		"defense":
			return player.defense
		"goalkeeping":
			return player.goalkeeping
		_:
			return 0
