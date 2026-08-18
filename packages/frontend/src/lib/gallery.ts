import { mediaUrl } from './api'
import { ICON_ANGLE } from './types'
import type { Combo, ComboPair, Manifest, Shot } from './types'

/** manifest のフラットな entries を「武器 x 素材」単位にたたむ。 */
export function toCombos(manifest: Manifest | null): Combo[] {
  if (!manifest) return []

  const byKey = new Map<string, Combo>()
  for (const entry of manifest.entries) {
    const key = comboKey(entry.weapon_id, entry.material_id)
    let combo = byKey.get(key)
    if (!combo) {
      combo = {
        key,
        weaponId: entry.weapon_id,
        materialId: entry.material_id,
        name: entry.name,
        build: manifest.build,
        shots: {},
        angles: [],
      }
      byKey.set(key, combo)
    }
    combo.shots[entry.angle] = {
      angle: entry.angle,
      file: entry.file,
      url: mediaUrl(manifest.build, entry.file, manifest.created_at),
    }
  }

  for (const combo of byKey.values()) {
    combo.angles = Object.keys(combo.shots)
      .map(Number)
      .filter(angle => angle !== ICON_ANGLE)
      .sort((a, b) => a - b)
  }

  return [...byKey.values()]
}

export function comboKey(weaponId: string, materialId: string): string {
  return `${weaponId}:${materialId}`
}

/** グリッドのサムネイルはアイコンがあれば優先し、無ければ指定角のショットを使う。 */
export function thumbShot(combo: Combo | null, angle: number): Shot | null {
  if (!combo) return null
  return combo.shots[angle] ?? combo.shots[ICON_ANGLE] ?? combo.shots[0] ?? null
}

export function shotAt(combo: Combo | null, angle: number): Shot | null {
  if (!combo) return null
  return combo.shots[angle] ?? null
}

/**
 * 比較元 (base) と表示中 (current) の組み合わせを突き合わせる。
 * base が null のときは current を並べるだけの単一ビルド表示になる。
 */
export function pairCombos(base: Combo[] | null, current: Combo[]): ComboPair[] {
  const mapBase = new Map((base ?? []).map(combo => [combo.key, combo]))
  const mapCurrent = new Map(current.map(combo => [combo.key, combo]))
  const keys = [...new Set([...mapBase.keys(), ...mapCurrent.keys()])]

  return keys.map(key => {
    const comboBase = mapBase.get(key) ?? null
    const comboCurrent = mapCurrent.get(key) ?? null
    const primary = (comboCurrent ?? comboBase)!
    const status: ComboPair['status'] = !base
      ? 'shared'
      : comboBase && comboCurrent
        ? 'shared'
        : comboCurrent
          ? 'added'
          : 'removed'

    return {
      key,
      weaponId: primary.weaponId,
      materialId: primary.materialId,
      name: primary.name,
      a: comboBase,
      b: comboCurrent,
      status,
      renamed: Boolean(comboBase && comboCurrent && comboBase.name !== comboCurrent.name),
    }
  })
}

/** 撮影対象の一覧 (フィルタ用)。両ビルドの和集合を出現順で返す。 */
export function collectIds(combos: Combo[], field: 'weaponId' | 'materialId'): string[] {
  const seen = new Set<string>()
  for (const combo of combos) seen.add(combo[field])
  return [...seen].sort()
}

export function formatAngle(angle: number): string {
  return angle === ICON_ANGLE ? 'アイコン' : `${angle}°`
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  // Godot は UTC の "2026-08-01T08:13:10" を出す (Z なし)
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
