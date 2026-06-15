extends Control

const LeagueScript = preload("res://scripts/core/league.gd")

@onready var round_label: Label = $Root/Header/RoundLabel
@onready var next_round_button: Button = $Root/Header/NextRoundButton
@onready var standings_view_button: Button = $Root/Header/StandingsViewButton
@onready var lineup_view_button: Button = $Root/Header/LineupViewButton
@onready var post_match_view_button: Button = $Root/Header/PostMatchViewButton
@onready var lineup_panel: VBoxContainer = $Root/LineupPanel
@onready var lineup_title: Label = $Root/LineupPanel/LineupHeader/LineupTitle
@onready var lineup_status: Label = $Root/LineupPanel/LineupHeader/LineupStatus
@onready var lineup_error: Label = $Root/LineupPanel/LineupError
@onready var gk_players_list: VBoxContainer = $Root/LineupPanel/LineupColumns/GKColumn/Players
@onready var df_players_list: VBoxContainer = $Root/LineupPanel/LineupColumns/DFColumn/Players
@onready var mf_players_list: VBoxContainer = $Root/LineupPanel/LineupColumns/MFColumn/Players
@onready var fw_players_list: VBoxContainer = $Root/LineupPanel/LineupColumns/FWColumn/Players
@onready var post_match_panel: VBoxContainer = $Root/PostMatchPanel
@onready var post_match_title: Label = $Root/PostMatchPanel/PostMatchTitle
@onready var player_match_result: Label = $Root/PostMatchPanel/PlayerMatchResult
@onready var player_growth_list: VBoxContainer = $Root/PostMatchPanel/PlayerGrowthScroll/PlayerGrowthList
@onready var standings_view: HSplitContainer = $Root/MainColumns
@onready var standings_header: GridContainer = $Root/MainColumns/LeftPanel/StandingsHeader
@onready var standings_list: VBoxContainer = $Root/MainColumns/LeftPanel/StandingsList
@onready var results_title: Label = $Root/MainColumns/RightPanel/ResultsTitle
@onready var results_list: VBoxContainer = $Root/MainColumns/RightPanel/ResultsScroll/ResultsList

var league: League

func _ready() -> void:
	league = LeagueScript.new()
	league.setup_default_league()

	next_round_button.pressed.connect(_on_next_round_pressed)
	standings_view_button.pressed.connect(_show_standings_view)
	lineup_view_button.pressed.connect(_show_lineup_view)
	post_match_view_button.pressed.connect(_show_post_match_view)

	_build_lineup_view()
	_build_standings_header()
	_render_result_messages(["点击“继续”开始第一轮比赛。"])
	_show_standings_view()
	_refresh()

func _on_next_round_pressed() -> void:
	if post_match_panel.visible:
		_show_standings_view()
		return

	if not league.has_next_round():
		return

	var lineup_validation: Dictionary = league.validate_player_lineup()
	if not bool(lineup_validation["ok"]):
		lineup_error.text = str(lineup_validation["message"])
		_show_lineup_view()
		return

	lineup_error.text = ""
	var played_round: int = league.current_round + 1
	var results: Array[Dictionary] = league.play_next_round()
	var lines: Array[String] = []
	for result in results:
		lines.append(str(result["summary"]))

	results_title.text = "第 %d 轮赛果" % played_round
	_render_results(results)
	_render_post_match_view(played_round, results)
	_build_lineup_view()
	_show_post_match_view()
	_refresh()

func _refresh() -> void:
	round_label.text = "%d/%d轮" % [min(league.current_round + 1, league.total_rounds()), league.total_rounds()]
	if league.current_round == 0:
		results_title.text = "第 1 轮赛果"

	if not league.has_next_round():
		round_label.text = "赛季结束"
		next_round_button.disabled = true
		next_round_button.text = "已结束"
	else:
		next_round_button.disabled = false
		next_round_button.text = "继续"

	_render_standings()
	_refresh_lineup_status()

func _show_standings_view() -> void:
	standings_view.visible = true
	lineup_panel.visible = false
	post_match_panel.visible = false
	standings_view_button.disabled = true
	lineup_view_button.disabled = false
	post_match_view_button.disabled = league.current_round == 0

func _show_lineup_view() -> void:
	standings_view.visible = false
	lineup_panel.visible = true
	post_match_panel.visible = false
	standings_view_button.disabled = false
	lineup_view_button.disabled = true
	post_match_view_button.disabled = league.current_round == 0

func _show_post_match_view() -> void:
	standings_view.visible = false
	lineup_panel.visible = false
	post_match_panel.visible = true
	standings_view_button.disabled = false
	lineup_view_button.disabled = false
	post_match_view_button.disabled = true

func _render_post_match_view(played_round: int, results: Array[Dictionary]) -> void:
	post_match_title.text = "第 %d 轮赛后" % played_round
	player_match_result.text = _player_match_summary(results)
	_clear_children(player_growth_list)

	if league.last_growth_logs.is_empty():
		_add_player_growth_line("本轮没有球员能力变化")
		return

	for log_entry in league.last_growth_logs:
		var text: String = str(log_entry["text"])
		var change: int = int(log_entry["change"])
		_add_player_growth_line(text, change)

func _add_player_growth_line(text: String, change: int = 0) -> void:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(520, 0)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if change > 0:
		label.add_theme_color_override("font_color", Color(0.16, 0.68, 0.28, 1.0))
	elif change < 0:
		label.add_theme_color_override("font_color", Color(0.86, 0.18, 0.16, 1.0))
	player_growth_list.add_child(label)

func _player_match_summary(results: Array[Dictionary]) -> String:
	for result in results:
		var home: Team = result["home"] as Team
		var away: Team = result["away"] as Team
		if home == league.player_team or away == league.player_team:
			return str(result["summary"])

	return "本轮玩家球队没有比赛。"

func _build_lineup_view() -> void:
	lineup_title.text = "%s 阵容" % league.player_team.team_name
	_clear_children(gk_players_list)
	_clear_children(df_players_list)
	_clear_children(mf_players_list)
	_clear_children(fw_players_list)

	for player in league.player_team.players:
		var checkbox: CheckBox = CheckBox.new()
		checkbox.text = _player_lineup_text(player)
		checkbox.clip_text = true
		checkbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		checkbox.button_pressed = league.player_team.is_player_starting(player)
		checkbox.toggled.connect(_on_player_toggled.bind(player))
		_position_list(player.position).add_child(checkbox)

	_refresh_lineup_status()

func _on_player_toggled(selected: bool, player: Player) -> void:
	league.player_team.set_player_starting(player, selected)
	_refresh_lineup_status()

func _refresh_lineup_status() -> void:
	var selected_count: int = league.player_team.starting_count()
	var gk_count: int = league.player_team.starting_gk_count()
	lineup_status.text = "首发 %d/11，GK %d/1" % [selected_count, gk_count]

	var error: String = league.player_team.lineup_error()
	if error.is_empty():
		lineup_error.text = ""
	elif not lineup_error.text.is_empty():
		lineup_error.text = error

func _player_lineup_text(player: Player) -> String:
	return "%s %d岁  能力/潜力 %d/%d" % [player.player_name, player.age, player.ability, player.potential]

func _position_list(position: String) -> VBoxContainer:
	match position:
		"GK":
			return gk_players_list
		"DF":
			return df_players_list
		"MF":
			return mf_players_list
		"FW":
			return fw_players_list
		_:
			return mf_players_list

func _build_standings_header() -> void:
	_clear_children(standings_header)

	for text in ["排名", "球队", "赛", "胜", "平", "负", "进/失", "净胜", "积分"]:
		var label: Label = _table_label(text, true)
		standings_header.add_child(label)

func _render_standings() -> void:
	_clear_children(standings_list)

	var rank: int = 1
	for team in league.standings():
		var row_container: PanelContainer = PanelContainer.new()
		row_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if team == league.player_team:
			var highlight: StyleBoxFlat = StyleBoxFlat.new()
			highlight.bg_color = Color(0.12, 0.32, 0.18, 0.9)
			highlight.set_content_margin_all(4.0)
			row_container.add_theme_stylebox_override("panel", highlight)
		else:
			var empty_style: StyleBoxEmpty = StyleBoxEmpty.new()
			empty_style.set_content_margin_all(4.0)
			row_container.add_theme_stylebox_override("panel", empty_style)

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
			var label: Label = _table_label(values[index], index == 1 or index == 8)
			if team == league.player_team:
				label.add_theme_color_override("font_color", Color(0.95, 1.0, 0.92, 1.0))
			row.add_child(label)

		row_container.add_child(row)
		standings_list.add_child(row_container)
		rank += 1

func _render_results(results: Array) -> void:
	_clear_children(results_list)

	for result in results:
		var result_data: Dictionary = result as Dictionary
		var line: String = str(result_data["summary"])
		var home: Team = result_data["home"] as Team
		var away: Team = result_data["away"] as Team
		var is_player_match: bool = home == league.player_team or away == league.player_team

		var row_container: PanelContainer = PanelContainer.new()
		row_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if is_player_match:
			var highlight: StyleBoxFlat = StyleBoxFlat.new()
			highlight.bg_color = Color(0.12, 0.32, 0.18, 0.9)
			highlight.set_content_margin_all(6.0)
			row_container.add_theme_stylebox_override("panel", highlight)
		else:
			var empty_style: StyleBoxEmpty = StyleBoxEmpty.new()
			empty_style.set_content_margin_all(6.0)
			row_container.add_theme_stylebox_override("panel", empty_style)

		var label: Label = Label.new()
		label.text = line
		label.custom_minimum_size = Vector2(360, 0)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if is_player_match:
			label.add_theme_color_override("font_color", Color(0.95, 1.0, 0.92, 1.0))

		row_container.add_child(label)
		results_list.add_child(row_container)

func _render_result_messages(lines: Array[String]) -> void:
	_clear_children(results_list)

	for line in lines:
		var label: Label = Label.new()
		label.text = line
		label.custom_minimum_size = Vector2(360, 0)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		results_list.add_child(label)

func _table_label(text: String, emphasized: bool = false) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(52, 28)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER

	if emphasized:
		label.add_theme_font_size_override("font_size", 16)

	return label

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
