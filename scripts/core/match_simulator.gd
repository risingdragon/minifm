class_name MatchSimulator
extends RefCounted

const HOME_ADVANTAGE: float = 4.0

static func simulate(home: Team, away: Team, rng: RandomNumberGenerator) -> Dictionary:
	var home_strength: float = home.attack_rating() * 0.42 + home.midfield_rating() * 0.25 - away.defense_rating() * 0.28 + HOME_ADVANTAGE
	var away_strength: float = away.attack_rating() * 0.42 + away.midfield_rating() * 0.25 - home.defense_rating() * 0.28

	var home_expected: float = clampf(1.25 + home_strength / 45.0, 0.15, 4.2)
	var away_expected: float = clampf(1.05 + away_strength / 45.0, 0.15, 4.0)

	var home_goals: int = _roll_goals(home_expected, rng)
	var away_goals: int = _roll_goals(away_expected, rng)

	home.record_match(home_goals, away_goals)
	away.record_match(away_goals, home_goals)

	return {
		"home": home,
		"away": away,
		"home_goals": home_goals,
		"away_goals": away_goals,
		"summary": _build_summary(home, away, home_goals, away_goals)
	}

static func _roll_goals(expected_goals: float, rng: RandomNumberGenerator) -> int:
	var goals: int = 0
	var chance: float = expected_goals

	while chance > 0.0:
		if rng.randf() < min(chance, 1.0):
			goals += 1
		chance -= 1.0

	if goals > 0 and rng.randf() < 0.18:
		goals -= 1

	return clampi(goals, 0, 8)

static func _build_summary(home: Team, away: Team, home_goals: int, away_goals: int) -> String:
	var result_text: String = "战平"
	if home_goals > away_goals:
		result_text = "主队取胜"
	elif away_goals > home_goals:
		result_text = "客队取胜"

	return "%s %d-%d %s  %s" % [home.team_name, home_goals, away_goals, away.team_name, result_text]
