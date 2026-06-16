extends Control

const LeagueScript = preload("res://scripts/core/league.gd")
const LINEUP_COLUMN_WIDTHS: Array[int] = [56, 150, 56, 56, 72, 72, 100, 90]
const LINEUP_HEADERS: Array[String] = ["首发", "姓名", "年龄", "位置", "能力", "潜力", "身价", "操作"]
const LINEUP_SORT_KEYS: Array[String] = ["", "name", "age", "position", "ability", "potential", "market_value", ""]
const LINEUP_TABLE_WIDTH: int = 900
const MARKET_HEADERS: Array[String] = ["姓名", "年龄", "位置", "能力", "潜力", "身价", "周薪", "球队", "操作"]
const MARKET_SORT_KEYS: Array[String] = ["name", "age", "position", "ability", "potential", "market_value", "weekly_salary", "team", ""]

@onready var round_label: Label = $Root/Header/RoundLabel
@onready var next_round_button: Button = $Root/Header/NextRoundButton
@onready var standings_view_button: Button = $Root/Header/StandingsViewButton
@onready var lineup_view_button: Button = $Root/Header/LineupViewButton
@onready var post_match_view_button: Button = $Root/Header/PostMatchViewButton
@onready var transfer_view_button: Button = $Root/Header/TransferViewButton
@onready var finance_view_button: Button = $Root/Header/FinanceViewButton
@onready var season_summary_view_button: Button = $Root/Header/SeasonSummaryViewButton
@onready var lineup_panel: VBoxContainer = $Root/LineupPanel
@onready var lineup_title: Label = $Root/LineupPanel/LineupHeader/LineupTitle
@onready var lineup_status: Label = $Root/LineupPanel/LineupHeader/LineupStatus
@onready var recommend_lineup_button: Button = $Root/LineupPanel/LineupHeader/RecommendLineupButton
@onready var lineup_error: Label = $Root/LineupPanel/LineupError
@onready var lineup_table_header: GridContainer = $Root/LineupPanel/LineupTableHeader
@onready var lineup_list: VBoxContainer = $Root/LineupPanel/LineupScroll/LineupList
@onready var post_match_panel: VBoxContainer = $Root/PostMatchPanel
@onready var post_match_title: Label = $Root/PostMatchPanel/PostMatchTitle
@onready var player_match_result: Label = $Root/PostMatchPanel/PlayerMatchResult
@onready var player_growth_list: VBoxContainer = $Root/PostMatchPanel/PlayerGrowthScroll/PlayerGrowthList
@onready var match_finance_list: VBoxContainer = $Root/PostMatchPanel/MatchFinanceList
@onready var transfer_market_panel: VBoxContainer = $Root/TransferMarketPanel
@onready var money_label: Label = $Root/TransferMarketPanel/TransferHeader/MoneyLabel
@onready var transfer_message: Label = $Root/TransferMarketPanel/TransferMessage
@onready var market_header: GridContainer = $Root/TransferMarketPanel/MarketHeader
@onready var market_list: VBoxContainer = $Root/TransferMarketPanel/MarketScroll/MarketList
@onready var transfer_log_list: VBoxContainer = $Root/TransferMarketPanel/TransferLogScroll/TransferLogList
@onready var finance_panel: VBoxContainer = $Root/FinancePanel
@onready var finance_warning: Label = $Root/FinancePanel/FinanceWarning
@onready var finance_list: GridContainer = $Root/FinancePanel/FinanceList
@onready var season_summary_panel: VBoxContainer = $Root/SeasonSummaryPanel
@onready var season_summary_title: Label = $Root/SeasonSummaryPanel/SeasonSummaryTitle
@onready var season_summary_list: VBoxContainer = $Root/SeasonSummaryPanel/SeasonSummaryScroll/SeasonSummaryList
@onready var standings_view: HSplitContainer = $Root/MainColumns
@onready var tier_selector: OptionButton = $Root/MainColumns/LeftPanel/TierSelector
@onready var standings_title: Label = $Root/MainColumns/LeftPanel/StandingsTitle
@onready var standings_header: GridContainer = $Root/MainColumns/LeftPanel/StandingsHeader
@onready var standings_list: VBoxContainer = $Root/MainColumns/LeftPanel/StandingsList
@onready var results_title: Label = $Root/MainColumns/RightPanel/ResultsTitle
@onready var results_list: VBoxContainer = $Root/MainColumns/RightPanel/ResultsScroll/ResultsList

var league: League
var lineup_sort_key: String = "position"
var lineup_sort_ascending: bool = true
var market_sort_key: String = "market_value"
var market_sort_ascending: bool = false

func _ready() -> void:
	league = LeagueScript.new()
	league.setup_default_league()

	next_round_button.pressed.connect(_on_next_round_pressed)
	standings_view_button.pressed.connect(_show_standings_view)
	lineup_view_button.pressed.connect(_show_lineup_view)
	post_match_view_button.pressed.connect(_show_post_match_view)
	transfer_view_button.pressed.connect(_show_transfer_view)
	finance_view_button.pressed.connect(_show_finance_view)
	season_summary_view_button.pressed.connect(_show_season_summary_view)
	recommend_lineup_button.pressed.connect(_on_recommend_lineup_pressed)
	tier_selector.item_selected.connect(_on_tier_selected)

	_build_lineup_view()
	_build_tier_selector()
	_build_standings_header()
	_build_market_header()
	_render_result_messages(["点击“继续”开始第一轮比赛。"])
	_show_standings_view()
	_refresh()

func _on_next_round_pressed() -> void:
	if post_match_panel.visible:
		_show_standings_view()
		return
	if season_summary_panel.visible:
		_show_standings_view()
		return

	if league.is_season_complete():
		league.start_next_season()
		_build_tier_selector()
		_build_lineup_view()
		_render_transfer_view()
		_render_result_messages(["新赛季开始，点击“继续”进行第一轮比赛。"])
		_show_standings_view()
		_refresh()
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

	results_title.text = "第 %d 轮赛果" % played_round
	_render_results(results)
	_render_post_match_view(played_round, results)
	_build_lineup_view()
	_render_transfer_view()
	if league.is_season_complete():
		_render_season_summary()
		_show_season_summary_view()
	else:
		_show_post_match_view()
	_refresh()

func _refresh() -> void:
	_sync_tier_selector_selection()
	standings_title.text = "%d赛季%s积分榜" % [league.season_year, league.active_tier_name()]
	round_label.text = "%d/%d轮" % [min(league.current_round + 1, league.total_rounds()), league.total_rounds()]
	if league.current_round == 0:
		results_title.text = "第 1 轮赛果"

	if not league.has_next_round():
		round_label.text = "赛季结束"
		next_round_button.disabled = false
		next_round_button.text = "继续"
	else:
		next_round_button.disabled = false
		next_round_button.text = "继续"

	if not league.lineup_warning.is_empty():
		lineup_error.text = league.lineup_warning

	_render_standings()
	_refresh_lineup_status()
	_refresh_money_label()
	_render_finance_view()
	_render_transfer_logs()

func _build_tier_selector() -> void:
	tier_selector.clear()
	for tier in league.tiers:
		tier_selector.add_item(tier.tier_name, tier.level)
		if tier.level == league.active_standings_level:
			tier_selector.select(tier_selector.get_item_count() - 1)

func _on_tier_selected(index: int) -> void:
	league.set_active_standings_level(tier_selector.get_item_id(index))
	_refresh()

func _sync_tier_selector_selection() -> void:
	for index in range(tier_selector.get_item_count()):
		if tier_selector.get_item_id(index) == league.active_standings_level:
			tier_selector.select(index)
			return

func _show_standings_view() -> void:
	standings_view.visible = true
	lineup_panel.visible = false
	post_match_panel.visible = false
	transfer_market_panel.visible = false
	finance_panel.visible = false
	season_summary_panel.visible = false
	standings_view_button.disabled = true
	lineup_view_button.disabled = false
	post_match_view_button.disabled = league.current_round == 0
	transfer_view_button.disabled = false
	finance_view_button.disabled = false
	season_summary_view_button.disabled = not league.is_season_complete()

func _show_lineup_view() -> void:
	standings_view.visible = false
	lineup_panel.visible = true
	post_match_panel.visible = false
	transfer_market_panel.visible = false
	finance_panel.visible = false
	season_summary_panel.visible = false
	standings_view_button.disabled = false
	lineup_view_button.disabled = true
	post_match_view_button.disabled = league.current_round == 0
	transfer_view_button.disabled = false
	finance_view_button.disabled = false
	season_summary_view_button.disabled = not league.is_season_complete()

func _show_post_match_view() -> void:
	standings_view.visible = false
	lineup_panel.visible = false
	post_match_panel.visible = true
	transfer_market_panel.visible = false
	finance_panel.visible = false
	season_summary_panel.visible = false
	standings_view_button.disabled = false
	lineup_view_button.disabled = false
	post_match_view_button.disabled = true
	transfer_view_button.disabled = false
	finance_view_button.disabled = false
	season_summary_view_button.disabled = not league.is_season_complete()

func _show_transfer_view() -> void:
	_render_transfer_view()
	standings_view.visible = false
	lineup_panel.visible = false
	post_match_panel.visible = false
	transfer_market_panel.visible = true
	finance_panel.visible = false
	season_summary_panel.visible = false
	standings_view_button.disabled = false
	lineup_view_button.disabled = false
	post_match_view_button.disabled = league.current_round == 0
	transfer_view_button.disabled = true
	finance_view_button.disabled = false
	season_summary_view_button.disabled = not league.is_season_complete()

func _show_finance_view() -> void:
	_render_finance_view()
	standings_view.visible = false
	lineup_panel.visible = false
	post_match_panel.visible = false
	transfer_market_panel.visible = false
	finance_panel.visible = true
	season_summary_panel.visible = false
	standings_view_button.disabled = false
	lineup_view_button.disabled = false
	post_match_view_button.disabled = league.current_round == 0
	transfer_view_button.disabled = false
	finance_view_button.disabled = true
	season_summary_view_button.disabled = not league.is_season_complete()

func _show_season_summary_view() -> void:
	_render_season_summary()
	standings_view.visible = false
	lineup_panel.visible = false
	post_match_panel.visible = false
	transfer_market_panel.visible = false
	finance_panel.visible = false
	season_summary_panel.visible = true
	standings_view_button.disabled = false
	lineup_view_button.disabled = false
	post_match_view_button.disabled = league.current_round == 0
	transfer_view_button.disabled = false
	finance_view_button.disabled = false
	season_summary_view_button.disabled = true

func _render_post_match_view(played_round: int, results: Array[Dictionary]) -> void:
	post_match_title.text = "第 %d 轮赛后" % played_round
	player_match_result.text = _player_match_summary(results)
	_clear_children(player_growth_list)
	_render_match_finance_logs()

	if league.last_growth_logs.is_empty():
		_add_player_growth_line("本轮没有球员能力变化")
		return

	for log_entry in league.last_growth_logs:
		var text: String = str(log_entry["text"])
		var change: int = int(log_entry["change"])
		_add_player_growth_line(text, change)

func _render_season_summary() -> void:
	_clear_children(season_summary_list)
	season_summary_title.text = "%d赛季总结" % league.season_year

	if league.last_season_summary_logs.is_empty() and league.last_finance_report_logs.is_empty():
		var empty_label: Label = Label.new()
		empty_label.text = "暂无赛季总结"
		empty_label.custom_minimum_size = Vector2(700, 24)
		season_summary_list.add_child(empty_label)
		return

	for log_line in league.last_season_summary_logs:
		var label: Label = Label.new()
		label.text = log_line
		label.custom_minimum_size = Vector2(700, 24)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		season_summary_list.add_child(label)

	for log_line in league.last_finance_report_logs:
		var label: Label = Label.new()
		label.text = log_line
		label.custom_minimum_size = Vector2(700, 24)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		season_summary_list.add_child(label)

func _render_finance_view() -> void:
	_clear_children(finance_list)
	var team: Team = league.player_team
	var warning: String = league.cash_warning(team)
	finance_warning.text = warning
	finance_warning.visible = not warning.is_empty()

	_add_finance_row("当前资金", league.format_money(team.money))
	_add_finance_row("财政状态", team.financial_status)
	_add_finance_row("当前联赛", league.player_tier_name())
	_add_finance_row("联赛等级", str(team.league_level))
	_add_finance_row("预计下赛季收入等级", league.expected_next_season_income_label())
	_add_finance_row("赛季收入", league.format_money(team.season_income))
	_add_finance_row("赛季支出", league.format_money(team.season_expense))
	_add_finance_row("门票收入", league.format_money(team.season_ticket_income))
	_add_finance_row("奖金收入", league.format_money(team.season_bonus_income))
	_add_finance_row("转会收入", league.format_money(team.season_transfer_income))
	_add_finance_row("转会支出", league.format_money(team.season_transfer_expense))
	_add_finance_row("工资支出", league.format_money(team.season_salary_expense))
	_add_finance_row("赛季利润", league.format_money(team.season_income - team.season_expense))

func _add_finance_row(name: String, value: String) -> void:
	var name_label: Label = Label.new()
	name_label.text = name
	name_label.custom_minimum_size = Vector2(160, 28)
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	finance_list.add_child(name_label)

	var value_label: Label = Label.new()
	value_label.text = value
	value_label.custom_minimum_size = Vector2(180, 28)
	value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	value_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	finance_list.add_child(value_label)

func _render_match_finance_logs() -> void:
	_clear_children(match_finance_list)
	if league.last_finance_logs.is_empty():
		_add_match_finance_line("暂无财务变化")
		return
	for log_line in league.last_finance_logs:
		_add_match_finance_line(log_line)

func _add_match_finance_line(text: String) -> void:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(520, 24)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	match_finance_list.add_child(label)

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
	_build_lineup_header()
	_clear_children(lineup_list)

	var sorted_players: Array[Player] = _sorted_lineup_players()
	for player in sorted_players:
		var row: GridContainer = GridContainer.new()
		row.columns = 8
		row.custom_minimum_size = Vector2(LINEUP_TABLE_WIDTH, 0)
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("h_separation", 0)
		row.add_theme_constant_override("v_separation", 0)

		var checkbox: CheckBox = CheckBox.new()
		checkbox.text = ""
		checkbox.custom_minimum_size = Vector2(LINEUP_COLUMN_WIDTHS[0], 28)
		checkbox.button_pressed = league.player_team.is_player_starting(player)
		checkbox.toggled.connect(_on_player_toggled.bind(player))
		row.add_child(_lineup_control_cell(checkbox, LINEUP_COLUMN_WIDTHS[0]))

		row.add_child(_lineup_label(player.player_name, LINEUP_COLUMN_WIDTHS[1]))
		row.add_child(_lineup_label(str(player.age), LINEUP_COLUMN_WIDTHS[2]))
		row.add_child(_lineup_label(player.position, LINEUP_COLUMN_WIDTHS[3]))
		row.add_child(_lineup_label(str(player.ability), LINEUP_COLUMN_WIDTHS[4]))
		row.add_child(_lineup_label(str(player.potential), LINEUP_COLUMN_WIDTHS[5]))
		row.add_child(_lineup_label(league.format_money(player.market_value), LINEUP_COLUMN_WIDTHS[6]))

		var list_button: Button = Button.new()
		list_button.custom_minimum_size = Vector2(LINEUP_COLUMN_WIDTHS[7], 28)
		list_button.text = "取消挂牌" if player.is_transfer_listed else "挂牌"
		list_button.pressed.connect(_on_toggle_player_listing.bind(player))
		row.add_child(_lineup_control_cell(list_button, LINEUP_COLUMN_WIDTHS[7]))
		lineup_list.add_child(row)

	_refresh_lineup_status()

func _build_lineup_header() -> void:
	_clear_children(lineup_table_header)
	lineup_table_header.custom_minimum_size = Vector2(LINEUP_TABLE_WIDTH, 0)
	lineup_table_header.add_theme_constant_override("h_separation", 0)
	lineup_table_header.add_theme_constant_override("v_separation", 0)

	for index in range(LINEUP_HEADERS.size()):
		var sort_key: String = LINEUP_SORT_KEYS[index]
		if sort_key.is_empty():
			lineup_table_header.add_child(_lineup_label(LINEUP_HEADERS[index], LINEUP_COLUMN_WIDTHS[index], true))
		else:
			var button: Button = Button.new()
			button.text = _lineup_header_text(index)
			button.custom_minimum_size = Vector2(LINEUP_COLUMN_WIDTHS[index], 28)
			button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			button.pressed.connect(_on_lineup_sort_pressed.bind(sort_key))
			lineup_table_header.add_child(_lineup_control_cell(button, LINEUP_COLUMN_WIDTHS[index], true))

func _sorted_lineup_players() -> Array[Player]:
	var sorted_players: Array[Player] = league.player_team.players.duplicate()
	sorted_players.sort_custom(func(a: Player, b: Player) -> bool:
		var comparison: int = _compare_lineup_players(a, b)
		if comparison == 0:
			return a.id < b.id
		if lineup_sort_ascending:
			return comparison < 0
		return comparison > 0
	)
	return sorted_players

func _compare_lineup_players(a: Player, b: Player) -> int:
	match lineup_sort_key:
		"name":
			return a.player_name.naturalnocasecmp_to(b.player_name)
		"age":
			return a.age - b.age
		"position":
			return _position_sort_order(a.position) - _position_sort_order(b.position)
		"ability":
			return a.ability - b.ability
		"potential":
			return a.potential - b.potential
		"market_value":
			return a.market_value - b.market_value
		_:
			return a.id - b.id

func _position_sort_order(position: String) -> int:
	match position:
		"GK":
			return 0
		"DF":
			return 1
		"MF":
			return 2
		"FW":
			return 3
		_:
			return 9

func _on_lineup_sort_pressed(sort_key: String) -> void:
	if lineup_sort_key == sort_key:
		lineup_sort_ascending = not lineup_sort_ascending
	else:
		lineup_sort_key = sort_key
		lineup_sort_ascending = true
	_build_lineup_view()

func _lineup_header_text(index: int) -> String:
	var text: String = LINEUP_HEADERS[index]
	if LINEUP_SORT_KEYS[index] != lineup_sort_key:
		return text
	if lineup_sort_ascending:
		return "%s ↑" % text
	return "%s ↓" % text

func _on_player_toggled(selected: bool, player: Player) -> void:
	league.player_team.set_player_starting(player, selected)
	_refresh_lineup_status()

func _on_recommend_lineup_pressed() -> void:
	league.player_team.auto_select_starting_lineup()
	lineup_error.text = ""
	_build_lineup_view()

func _refresh_lineup_status() -> void:
	var selected_count: int = league.player_team.starting_count()
	var gk_count: int = league.player_team.starting_gk_count()
	lineup_status.text = "首发 %d/11，GK %d/1" % [selected_count, gk_count]

	var error: String = league.player_team.lineup_error()
	if error.is_empty():
		lineup_error.text = ""
	elif not lineup_error.text.is_empty():
		lineup_error.text = error

func _on_toggle_player_listing(player: Player) -> void:
	transfer_message.text = league.toggle_player_listing(player)
	_build_lineup_view()
	_render_transfer_view()
	_refresh()

func _lineup_label(text: String, width: int, emphasized: bool = false) -> PanelContainer:
	var cell: PanelContainer = _lineup_cell(width, emphasized)
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(width, 28)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	if emphasized:
		label.add_theme_font_size_override("font_size", 15)
	cell.add_child(label)
	return cell

func _lineup_control_cell(control: Control, width: int, emphasized: bool = false) -> PanelContainer:
	var cell: PanelContainer = _lineup_cell(width, emphasized)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cell.add_child(control)
	return cell

func _lineup_cell(width: int, emphasized: bool = false) -> PanelContainer:
	var cell: PanelContainer = PanelContainer.new()
	cell.custom_minimum_size = Vector2(width, 30)
	cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var style: StyleBoxFlat = StyleBoxFlat.new()
	style.bg_color = Color(0.18, 0.2, 0.22, 0.35) if emphasized else Color(0.04, 0.05, 0.06, 0.12)
	style.border_color = Color(0.55, 0.62, 0.68, 0.75)
	style.set_border_width_all(1)
	style.set_content_margin_all(4.0)
	cell.add_theme_stylebox_override("panel", style)
	return cell

func _build_standings_header() -> void:
	_clear_children(standings_header)

	for text in ["排名", "球队", "赛", "胜", "平", "负", "进/失", "净胜", "积分"]:
		var label: Label = _table_label(text, true)
		standings_header.add_child(label)

func _build_market_header() -> void:
	_clear_children(market_header)

	for index in range(MARKET_HEADERS.size()):
		var sort_key: String = MARKET_SORT_KEYS[index]
		if sort_key.is_empty():
			market_header.add_child(_market_label(MARKET_HEADERS[index], true))
		else:
			var button: Button = Button.new()
			button.text = _market_header_text(index)
			button.custom_minimum_size = Vector2(82, 28)
			button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			button.pressed.connect(_on_market_sort_pressed.bind(sort_key))
			market_header.add_child(button)

func _render_transfer_view() -> void:
	_refresh_money_label()
	_clear_children(market_list)

	var listed_players: Array[Dictionary] = _sorted_market_entries(league.listed_players())
	if listed_players.is_empty():
		_add_market_message("暂无挂牌球员")
		_render_transfer_logs()
		return

	for entry in listed_players:
		var player: Player = entry["player"] as Player
		var owner: Team = entry["team"] as Team
		_add_market_row(player, owner)

	_render_transfer_logs()

func _add_market_row(player: Player, owner: Team) -> void:
	var row: GridContainer = GridContainer.new()
	row.columns = 9
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("h_separation", 8)

	var values: Array[String] = [
		player.player_name,
		str(player.age),
		player.position,
		str(player.ability),
		str(player.potential),
		league.format_money(player.market_value),
		league.format_money(player.weekly_salary),
		owner.team_name
	]

	for value in values:
		row.add_child(_market_label(value))

	var buy_button: Button = Button.new()
	buy_button.text = "购买"
	buy_button.disabled = owner == league.player_team
	buy_button.custom_minimum_size = Vector2(74, 28)
	buy_button.pressed.connect(_on_buy_player_pressed.bind(player))
	row.add_child(buy_button)
	market_list.add_child(row)

func _add_market_message(text: String) -> void:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(520, 28)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	market_list.add_child(label)

func _on_buy_player_pressed(player: Player) -> void:
	transfer_message.text = league.buy_player(player)
	_build_lineup_view()
	_render_transfer_view()
	_refresh()

func _sorted_market_entries(entries: Array[Dictionary]) -> Array[Dictionary]:
	var sorted_entries: Array[Dictionary] = entries.duplicate()
	sorted_entries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var comparison: int = _compare_market_entries(a, b)
		if comparison == 0:
			var a_player: Player = a["player"] as Player
			var b_player: Player = b["player"] as Player
			return a_player.id < b_player.id
		if market_sort_ascending:
			return comparison < 0
		return comparison > 0
	)
	return sorted_entries

func _compare_market_entries(a: Dictionary, b: Dictionary) -> int:
	var a_player: Player = a["player"] as Player
	var b_player: Player = b["player"] as Player
	var a_team: Team = a["team"] as Team
	var b_team: Team = b["team"] as Team

	match market_sort_key:
		"name":
			return a_player.player_name.naturalnocasecmp_to(b_player.player_name)
		"age":
			return a_player.age - b_player.age
		"position":
			return _position_sort_order(a_player.position) - _position_sort_order(b_player.position)
		"ability":
			return a_player.ability - b_player.ability
		"potential":
			return a_player.potential - b_player.potential
		"market_value":
			return a_player.market_value - b_player.market_value
		"weekly_salary":
			return a_player.weekly_salary - b_player.weekly_salary
		"team":
			return a_team.team_name.naturalnocasecmp_to(b_team.team_name)
		_:
			return a_player.id - b_player.id

func _on_market_sort_pressed(sort_key: String) -> void:
	if market_sort_key == sort_key:
		market_sort_ascending = not market_sort_ascending
	else:
		market_sort_key = sort_key
		market_sort_ascending = true
	_build_market_header()
	_render_transfer_view()

func _market_header_text(index: int) -> String:
	var text: String = MARKET_HEADERS[index]
	if MARKET_SORT_KEYS[index] != market_sort_key:
		return text
	if market_sort_ascending:
		return "%s ↑" % text
	return "%s ↓" % text

func _refresh_money_label() -> void:
	money_label.text = "资金：%s" % league.format_money(league.player_team.money)

func _render_transfer_logs() -> void:
	_clear_children(transfer_log_list)

	if league.transfer_logs.is_empty():
		var empty_label: Label = Label.new()
		empty_label.text = "暂无转会日志"
		empty_label.custom_minimum_size = Vector2(520, 24)
		transfer_log_list.add_child(empty_label)
		return

	for log_entry in league.transfer_logs:
		var log_data: Dictionary = log_entry as Dictionary
		var text: String = str(log_data["text"])
		var highlight: bool = bool(log_data["highlight"])
		var row_container: PanelContainer = PanelContainer.new()
		row_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if highlight:
			var highlight_style: StyleBoxFlat = StyleBoxFlat.new()
			highlight_style.bg_color = Color(0.12, 0.32, 0.18, 0.9)
			highlight_style.set_content_margin_all(5.0)
			row_container.add_theme_stylebox_override("panel", highlight_style)
		else:
			var empty_style: StyleBoxEmpty = StyleBoxEmpty.new()
			empty_style.set_content_margin_all(5.0)
			row_container.add_theme_stylebox_override("panel", empty_style)

		var label: Label = Label.new()
		label.text = text
		label.custom_minimum_size = Vector2(520, 24)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if highlight:
			label.add_theme_color_override("font_color", Color(0.95, 1.0, 0.92, 1.0))
		row_container.add_child(label)
		transfer_log_list.add_child(row_container)

func _market_label(text: String, emphasized: bool = false) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(82, 28)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	if emphasized:
		label.add_theme_font_size_override("font_size", 15)
	return label

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
