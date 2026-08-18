import * as v from 'valibot'

/**
 * 検証の結果。valibot の safeParse に合わせて、失敗も戻り値で表す。
 * 例外は投げないので、失敗をどう扱うか (400 を返す / 落とす / 無視する) は
 * 呼び出し側が決める。
 */
export type ParseResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false
      readonly message: string
      readonly issues: readonly v.BaseIssue<unknown>[]
    }

/**
 * スキーマで検証する。
 * `label` には「どのデータか」(ファイルパスやエンドポイント) を入れると、
 * そのままログやレスポンスに出せるメッセージになる。
 */
export function parse<TSchema extends v.GenericSchema>(
  schema: TSchema,
  input: unknown,
  label?: string,
): ParseResult<v.InferOutput<TSchema>> {
  const result = v.safeParse(schema, input)
  if (result.success) return { ok: true, value: result.output }

  const detail = formatIssues(result.issues)
  return {
    ok: false,
    message: label ? `${label}: ${detail}` : detail,
    issues: result.issues,
  }
}

/** どのフィールドがどう駄目だったかを 1 行にまとめる。 */
export function formatIssues(issues: readonly v.BaseIssue<unknown>[]): string {
  return issues
    .map(issue => {
      const path = v.getDotPath(issue)
      return path ? `${path} ${issue.message}` : issue.message
    })
    .join(' / ')
}
