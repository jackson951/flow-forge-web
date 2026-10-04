/** Expanded-platform node types whose forms arrive in a later part (Part 16, FR-16.8). */
export function upcomingFormPart(type: string): number | null {
  if (type.startsWith('jira.')) return 21;
  if (type.startsWith('gmail.')) return 22;
  return null;
}
