class_name Naming
## スクラビルド後の武器名を生成する。
##
## 基本ルール: 「素材名 + 武器名」 (例: 岩 + 棒 → 岩棒)
## ただし機械的な結合だと見た目と名前が乖離するケースがあるため
## (本家の「白銀ライネルハンマー」問題)、
## name_overrides.json の例外辞書で上書きできる。
##
## 例外辞書のキーは "素材ID:武器ID"。


## 合成名を返す。
## overrides: { "rock:stick": "岩砕き棒", ... }
static func compose(
	material_name: String,
	weapon_name: String,
	material_id: String,
	weapon_id: String,
	overrides: Dictionary
) -> String:
	var key := "%s:%s" % [material_id, weapon_id]
	if overrides.has(key):
		return String(overrides[key])
	return material_name + weapon_name


## ファイル名に使う安全なスラッグを返す。
static func slug(weapon_id: String, material_id: String, angle: int) -> String:
	return "%s__%s__deg%03d" % [weapon_id, material_id, angle]
