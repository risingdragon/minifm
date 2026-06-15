extends Control

const LeagueScript = preload("res://scripts/core/league.gd")

@onready var round_label: Label = $Root/Header/RoundLabel
@onready var next_round_button: Button = $Root/Header/NextRoundButton
@onready var standings_header: GridContainer = $Root/MainColumns/LeftPanel/StandingsHeader
@onready var standings_list: VBoxContainer = $Root/MainColumns/LeftPanel/StandingsList
@onready var results_title: Label = $Root/MainColumns/RightPanel/ResultsTitle
@onready var results_list: VBoxContainer = $Root/MainColumns/RightPanel/ResultsList

var league: League

func _ready() -> void:
	league = LeagueScript.new()
	league.setup_default_league()

	next_round_button.pressed.connect(_on_next_round_pressed)

	_build_standings_header()
	_render_results(["点击“下一轮”开始第一轮比赛。"])
	_refresh()

func _on_next_round_pressed() -> void:
	if not league.has_next_round():
		return

	var played_round: int = league.current_round + 1
	var results: Array[Dictionary] = league.play_next_round()
	var lines: Array = []
	for result in results:
		lines.append(result["summary"])

	results_title.text = "第 %d 轮赛果" % played_round
	_render_results(lines)
	_refresh()

func _refresh() -> void:
	round_label.text = "%d/%d轮" % [min(league.current_round + 1, league.total_rounds()), league.total_rounds()]
	if league.current_round == 0:
		results_title.text = "第 1 轮赛果"

	if not league.has_next_round():
		round_label.text = "赛季结束"
		next_round_button.disabled = true
		next_round_button.text = "已结束"

	_render_standings()

func _build_standings_header() -> void:
	_clear_children(standings_header)

	for text in ["排名", "球队", "赛", "胜", "平", "负", "进/失", "净胜", "积分"]:
		var label: Label = _table_label(text, true)
		standings_header.add_child(label)

func _render_standings() -> void:
	_clear_children(standings_list)

	var rank: int = 1
	for team in league.standings():
		var row: GridContainer = GridContainer.new()
		row.columns = 9
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("h_separation", 10)

		var values: Array[String] = [
			str(rank),
			team.team_name,
			str(team.played),
			str(team.won),
			str(team.drawn),
			str(team.lost),
			"%d/%d" % [team.goals_for, team.goals_against],
			str(team.goal_difference()),
			str(team.points)
		]

		for index in range(values.size()):
			row.add_child(_table_label(values[index], index == 1 or index == 8))

		standings_list.add_child(row)
		rank += 1

func _render_results(lines: Array) -> void:
	_clear_children(results_list)

	for line in lines:
		var label: Label = Label.new()
		label.text = line
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		results_list.add_child(label)

func _table_label(text: String, emphasized: bool = false) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(66, 28)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER

	if emphasized:
		label.add_theme_font_size_override("font_size", 16)

	return label

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
