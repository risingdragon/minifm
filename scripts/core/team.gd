class_name Team
extends RefCounted

var id: int
var team_name: String
var players: Array[Player] = []

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

		total += player.get(attribute)
		count += 1

	if count == 0:
		return team_rating()

	return total / count
