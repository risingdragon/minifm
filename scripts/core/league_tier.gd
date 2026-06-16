class_name LeagueTier
extends RefCounted

var id: int
var tier_name: String
var level: int
var teams: Array[Team] = []
var schedule: Array = []
var preferred_ability_min: int = 1
var preferred_ability_max: int = 200

func _init(
	_id: int = 0,
	_tier_name: String = "",
	_level: int = 1,
	_preferred_ability_min: int = 1,
	_preferred_ability_max: int = 200
) -> void:
	id = _id
	tier_name = _tier_name
	level = _level
	preferred_ability_min = _preferred_ability_min
	preferred_ability_max = _preferred_ability_max
