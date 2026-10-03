import axe, { type Result } from 'axe-core';

/**
 * Accessibility check with axe-core (Part 12, AC-12.1): serious and critical violations only.
 * Colour contrast cannot be computed in jsdom (no layout or styles), so it is checked by
 * design tokens and in the browser instead.
 */
export async function axeViolations(root: Element = document.body): Promise<string[]> {
  const result = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations
    .filter((v: Result) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v: Result) =>
        `${v.id} (${v.impact}): ${v.help} — ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
    );
}
