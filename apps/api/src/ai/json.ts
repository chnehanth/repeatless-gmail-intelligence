import { z } from 'zod';

/**
 * Robustly parse JSON out of an LLM response. Models occasionally wrap JSON in
 * ```json fences or add stray prose despite instructions, so we strip fences
 * and fall back to extracting the first balanced {...} / [...] block.
 */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  // Strip markdown code fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back: find the first balanced object/array.
    const start = candidate.search(/[{[]/);
    if (start === -1) throw new Error('No JSON found in model output');
    const open = candidate[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < candidate.length; i += 1) {
      const ch = candidate[i];
      if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(candidate.slice(start, i + 1));
        }
      }
    }
    throw new Error('Unbalanced JSON in model output');
  }
}

/** Parse + validate against a schema, throwing a clear error on mismatch.
 * Returns the schema's *output* type (so `.default()` fields are non-optional). */
export function parseJson<S extends z.ZodTypeAny>(raw: string, schema: S): z.infer<S> {
  return schema.parse(extractJson(raw));
}
