class_name Player
extends RefCounted

var id: int
var player_name: String
var position: String
var attack: int
var midfield: int
var defense: int
var goalkeeping: int

func _init(
	_id: int,
	_player_name: String,
	_position: String,
	_attack: int,
	_midfield: int,
	_defense: int,
	_goalkeeping: int
) -> void:
	id = _id
	player_name = _player_name
	position = _position
	attack = _attack
	midfield = _midfield
	defense = _defense
	goalkeeping = _goalkeeping

func overall() -> float:
	match position:
		"GK":
			return goalkeeping * 0.7 + defense * 0.2 + midfield * 0.1
		"DF":
			return defense * 0.55 + midfield * 0.25 + attack * 0.2
		"MF":
			return midfield * 0.55 + attack * 0.25 + defense * 0.2
		"FW":
			return attack * 0.65 + midfield * 0.25 + defense * 0.1
		_:
			return (attack + midfield + defense + goalkeeping) / 4.0

