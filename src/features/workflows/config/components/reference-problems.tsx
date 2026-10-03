import { CircleAlert, TriangleAlert } from 'lucide-react';
import { useConfigScope } from '../config-scope';

/** References in a field that will not resolve (error) or may not (warning). */
export function ReferenceProblems({ id, refs }: { id: string; refs: string[] }) {
  const { problem } = useConfigScope();
  const problems = [...new Set(refs)].map(problem).filter((p) => p !== null);
  return (
    <ul id={id} className="space-y-0.5">
      {problems.map((p) => (
        <li
          key={p.message}
          className={
            p.level === 'error'
              ? 'text-status-failed flex items-start gap-1 text-xs'
              : 'text-status-warning flex items-start gap-1 text-xs'
          }
        >
          {p.level === 'error' ? (
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          ) : (
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          )}
          <span className="font-mono break-all">{p.message}</span>
        </li>
      ))}
    </ul>
  );
}
