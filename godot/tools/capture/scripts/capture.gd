extends Node3D
## スクラビルド撮影ツール (メインスクリプト)
##
## 起動するとコマンドライン引数を読み、武器 x 素材の全組み合わせを
## 生成 → 多方向撮影 → PNG + manifest.json 保存 → 終了する。
## ゲームとしての操作は一切ない。CLI ツールとして扱うこと。
##
## 使い方 (リポジトリルートから):
##   godot --path tools/capture -- --build=123
##   godot --path tools/capture -- --build=123 --only=stick:rock,sword:mushroom
##   xvfb-run godot --path tools/capture -- --build=$GITHUB_RUN_NUMBER   # CI
##
## 引数:
##   --build=<番号>   ビルド番号 (必須。出力ディレクトリ名になる)
##   --only=<w:m,..>  撮影する組み合わせを限定 (差分撮影用。TS 側で対象を決めて渡す)
##   --data=<dir>     データディレクトリ (省略時: <repo>/data)
##   --out=<dir>      出力先 (省略時: <repo>/out/builds/<build>)
##
## 設計メモ:
## - カメラ・ライトは全てこのスクリプト内で数値指定する。
##   シーンファイルに散らばらせず、決定論性に関わる値を 1 箇所に集める。
## - アセット (glb) が見つからない場合はプレースホルダー形状で代替する。
##   アセットを 1 つも用意しなくてもパイプライン全体が動作確認できる。

const ANGLES: Array[int] = [0, 90, 180, 270]
const ICON_SIZE := 128
const CAMERA_FOV := 40.0
const FRAME_MARGIN := 1.35  # 被写体AABBに対するカメラの余白係数

@onready var _camera: Camera3D = $Camera3D
@onready var _key_light: DirectionalLight3D = $KeyLight
@onready var _fill_light: DirectionalLight3D = $FillLight
@onready var _turntable: Node3D = $Turntable

var _errors: Array[Dictionary] = []


func _ready() -> void:
	var args := _parse_args()
	if not args.has("build"):
		push_error("--build=<番号> が必要です")
		get_tree().quit(1)
		return

	_setup_studio()

	var repo_root := ProjectSettings.globalize_path("res://").path_join("../..")
	var data_dir: String = args.get("data", repo_root.path_join("data"))
	var out_dir: String = args.get(
		"out", repo_root.path_join("out/builds").path_join(args["build"])
	)

	var weapons := _load_json_array(data_dir.path_join("weapons.json"))
	var materials := _load_json_array(data_dir.path_join("materials.json"))
	var overrides := _load_json_dict(data_dir.path_join("name_overrides.json"))
	if weapons.is_empty() or materials.is_empty():
		push_error("weapons.json / materials.json が読めないか空です: " + data_dir)
		get_tree().quit(1)
		return

	var only := _parse_only_filter(args.get("only", ""))

	print("=== scrabuild-capture ===")
	print("build: %s / weapons: %d / materials: %d / angles: %d" % [
		args["build"], weapons.size(), materials.size(), ANGLES.size()
	])

	var manifest := await _run_all(weapons, materials, overrides, only, out_dir, args["build"])
	_save_manifest(out_dir, manifest)

	print("done: %d shots, %d errors -> %s" % [
		manifest["entries"].size(), _errors.size(), out_dir
	])
	get_tree().quit(0 if _errors.is_empty() else 2)


# --- 撮影ループ -------------------------------------------------------------

func _run_all(
	weapons: Array, materials: Array, overrides: Dictionary,
	only: Dictionary, out_dir: String, build: String
) -> Dictionary:
	DirAccess.make_dir_recursive_absolute(out_dir)
	var entries: Array[Dictionary] = []

	for w in weapons:
		for m in materials:
			var pair_key := "%s:%s" % [w["id"], m["id"]]
			if not only.is_empty() and not only.has(pair_key):
				continue
			var shot_entries := await _capture_combination(w, m, overrides, out_dir, build)
			entries.append_array(shot_entries)

	return {
		"build": build,
		"created_at": Time.get_datetime_string_from_system(true),
		"angles": ANGLES,
		"entries": entries,
		"errors": _errors,
	}


## 1 つの組み合わせ (武器 + 素材) を組み立てて全アングル撮影する。
func _capture_combination(
	w: Dictionary, m: Dictionary, overrides: Dictionary,
	out_dir: String, build: String
) -> Array[Dictionary]:
	var entries: Array[Dictionary] = []

	# --- 組み立て ---
	var weapon_node := _instantiate_mesh(w, Color.SLATE_GRAY)
	var socket := _make_socket(w)
	weapon_node.add_child(socket)
	var material_node := _instantiate_mesh(m, Color.SANDY_BROWN)
	if m.has("scale"):
		material_node.scale = Vector3.ONE * float(m["scale"])
	if m.has("rotation_degrees"):
		var r: Array = m["rotation_degrees"]
		material_node.rotation_degrees = Vector3(r[0], r[1], r[2])
	if m.has("position"):
		var p: Array = m["position"]
		material_node.position = Vector3(p[0], p[1], p[2])
	socket.add_child(material_node)
	_turntable.add_child(weapon_node)

	# 大きさの違う武器でも画角が揃うよう、AABB からカメラ距離を決定論的に算出
	_frame_camera(weapon_node)

	var composed_name: String = Naming.compose(
		m.get("name_ja", m["id"]), w.get("name_ja", w["id"]),
		m["id"], w["id"], overrides
	)

	# --- 各アングル撮影 ---
	for angle in ANGLES:
		_turntable.rotation.y = deg_to_rad(angle)
		# 描画完了を 2 フレーム待つ。待たないと前の組み合わせが写り込む
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw

		var img := get_viewport().get_texture().get_image()
		var fname := Naming.slug(w["id"], m["id"], angle) + ".png"
		var err := img.save_png(out_dir.path_join(fname))
		if err != OK:
			_errors.append({"pair": "%s:%s" % [w["id"], m["id"]], "angle": angle, "code": err})
			continue

		entries.append({
			"weapon_id": w["id"],
			"material_id": m["id"],
			"name": composed_name,
			"angle": angle,
			"file": fname,
			"build": build,
		})

		# 正面 (0 度) からアイコン用サムネイルも生成
		if angle == 0:
			var icon := img.duplicate() as Image
			icon.resize(ICON_SIZE, ICON_SIZE, Image.INTERPOLATE_LANCZOS)
			var icon_name := Naming.slug(w["id"], m["id"], angle) + "_icon.png"
			icon.save_png(out_dir.path_join(icon_name))
			entries.append({
				"weapon_id": w["id"],
				"material_id": m["id"],
				"name": composed_name,
				"angle": -1,  # -1 = アイコン
				"file": icon_name,
				"build": build,
			})

	# --- 後片付け ---
	_turntable.rotation.y = 0.0
	weapon_node.queue_free()
	# queue_free はフレーム末尾処理なので、次の組み合わせ前に確実に消えるよう 1 フレーム待つ
	await get_tree().process_frame
	return entries


# --- シーン構築ヘルパー -----------------------------------------------------

## カメラ・ライト・背景を数値で固定する。決定論性の要。
func _setup_studio() -> void:
	get_viewport().transparent_bg = true
	_camera.fov = CAMERA_FOV
	_key_light.rotation_degrees = Vector3(-45, -30, 0)
	_key_light.light_energy = 1.2
	_fill_light.rotation_degrees = Vector3(-20, 140, 0)
	_fill_light.light_energy = 0.4

	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(1, 1, 1)
	env.ambient_light_energy = 0.35
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)


## glb をロードして返す。見つからなければプレースホルダー形状で代替。
func _instantiate_mesh(def: Dictionary, fallback_tint: Color) -> Node3D:
	var path: String = def.get("mesh", "")
	if path != "" and ResourceLoader.exists(path):
		var scene := load(path) as PackedScene
		if scene != null:
			return scene.instantiate()

	# --- プレースホルダー ---
	# アセット未配置でもパイプライン全体を動かせるようにするための代替。
	# ID からハッシュで色を決め、組み合わせごとに見分けがつくようにする。
	var mi := MeshInstance3D.new()
	var kind: String = def.get("placeholder", "box")
	match kind:
		"sphere":
			var s := SphereMesh.new()
			s.radius = 0.25
			s.height = 0.5
			mi.mesh = s
		"cylinder":
			var c := CylinderMesh.new()
			c.top_radius = 0.06
			c.bottom_radius = 0.06
			c.height = 1.4
			mi.mesh = c
		_:
			var b := BoxMesh.new()
			b.size = Vector3(0.3, 0.3, 0.3)
			mi.mesh = b

	var mat := StandardMaterial3D.new()
	var hue := float(hash(def["id"]) % 360) / 360.0
	mat.albedo_color = Color.from_hsv(hue, 0.55, 0.85).lerp(fallback_tint, 0.3)
	mi.material_override = mat
	return mi


## 武器定義の socket 情報から取り付け位置ノードを作る。
func _make_socket(w: Dictionary) -> Node3D:
	var socket := Node3D.new()
	socket.name = "AttachSocket"
	var s: Dictionary = w.get("socket", {})
	var pos: Array = s.get("position", [0.0, 0.7, 0.0])
	socket.position = Vector3(pos[0], pos[1], pos[2])
	var rot: Array = s.get("rotation_degrees", [0.0, 0.0, 0.0])
	socket.rotation_degrees = Vector3(rot[0], rot[1], rot[2])
	return socket


## ターンテーブル上の全メッシュの AABB を集計し、カメラ位置を決める。
func _frame_camera(root: Node3D) -> void:
	var aabb := _collect_aabb(root)
	if aabb.size == Vector3.ZERO:
		aabb = AABB(Vector3(-0.5, -0.5, -0.5), Vector3.ONE)
	var center := aabb.get_center()
	var radius := aabb.size.length() * 0.5
	var dist := radius * FRAME_MARGIN / tan(deg_to_rad(CAMERA_FOV * 0.5))
	_camera.position = center + Vector3(0, dist * 0.35, dist)
	_camera.look_at(center)


func _collect_aabb(node: Node) -> AABB:
	var result := AABB()
	var first := true
	for child in _walk(node):
		if child is MeshInstance3D and child.mesh != null:
			var local: AABB = child.get_aabb()
			var xformed: AABB = (child as MeshInstance3D).global_transform * local
			if first:
				result = xformed
				first = false
			else:
				result = result.merge(xformed)
	return result


func _walk(node: Node) -> Array[Node]:
	var out: Array[Node] = [node]
	for c in node.get_children():
		out.append_array(_walk(c))
	return out


# --- I/O ヘルパー -----------------------------------------------------------

func _parse_args() -> Dictionary:
	var out := {}
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--") and arg.contains("="):
			var kv := arg.trim_prefix("--").split("=", true, 1)
			out[kv[0]] = kv[1]
	return out


## "--only=stick:rock,sword:mushroom" → { "stick:rock": true, ... }
func _parse_only_filter(raw: String) -> Dictionary:
	var out := {}
	for pair in raw.split(",", false):
		out[pair.strip_edges()] = true
	return out


func _load_json_array(path: String) -> Array:
	var parsed = _load_json(path)
	return parsed if parsed is Array else []


func _load_json_dict(path: String) -> Dictionary:
	var parsed = _load_json(path)
	return parsed if parsed is Dictionary else {}


func _load_json(path: String):
	if not FileAccess.file_exists(path):
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	return JSON.parse_string(f.get_as_text())


func _save_manifest(out_dir: String, manifest: Dictionary) -> void:
	var f := FileAccess.open(out_dir.path_join("manifest.json"), FileAccess.WRITE)
	f.store_string(JSON.stringify(manifest, "  "))
	f.close()
