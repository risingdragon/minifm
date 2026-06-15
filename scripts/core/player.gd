class_name Player
extends RefCounted

var id: int
var player_name: String
var position: String
var age: int
var ability: int
var potential: int
var attack: int
var midfield: int
var defense: int
var goalkeeping: int

func _init(
	_id: int,
	_player_name: String,
	_position: String,
	_age: int,
	_ability: int,
	_potential: int,
	_attack: int,
	_midfield: int,
	_defense: int,
	_goalkeeping: int
) -> void:
	id = _id
	player_name = _player_name
	position = _position
	age = _age
	ability = _ability
	potential = _potential
	attack = _attack
	midfield = _midfield
	defense = _defense
	goalkeeping = _goalkeeping

func overall() -> float:
	return float(ability)

func apply_ability_change(change: int, min_ability: int, max_ability: int) -> int:
	var previous_ability: int = ability
	var capped_max: int = mini(max_ability, potential)
	ability = clampi(ability + change, min_ability, capped_max)
	ability = maxi(ability, min_ability)
	return ability - previous_ability
