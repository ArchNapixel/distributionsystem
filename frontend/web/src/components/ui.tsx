// Small shadcn-style primitives (Tailwind 4, neutral greys, green accent).
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

const button = cva(
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-green-700 text-white hover:bg-green-800',
        outline: 'border border-neutral-300 hover:bg-neutral-100',
        ghost: 'hover:bg-neutral-100',
        danger: 'bg-red-700 text-white hover:bg-red-800',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

export function Button({
  className,
  variant,
  type = 'button',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button type={type} className={cn(button({ variant }), className)} {...p} />;
}

const control =
  'min-h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-green-600 disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(control, className)} {...p} />,
);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => <select ref={ref} className={cn(control, className)} {...p} />,
);
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, 'py-2', className)} {...p} />
));

/** Visible label, control and inline error. */
export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const tones = {
  neutral: 'bg-neutral-100 text-neutral-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
};
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border border-neutral-200 bg-white p-4', className)} {...p} />
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Notice({
  tone = 'red',
  children,
}: {
  tone?: 'red' | 'green';
  children: ReactNode;
}) {
  return (
    <p
      role={tone === 'red' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'red'
          ? 'border-red-300 bg-red-50 text-red-900'
          : 'border-green-300 bg-green-50 text-green-900',
      )}
    >
      {children}
    </p>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Wide tables scroll inside their own container, never the page. */
export function DataTable<T>({
  rows,
  columns,
  empty = 'Nothing to show.',
  rowKey,
}: {
  rows: T[];
  columns: Column<T>[];
  empty?: string;
  rowKey: (row: T, i: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                className={cn('whitespace-nowrap px-3 py-2 font-medium', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-neutral-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={rowKey(r, i)}>
                {columns.map((c) => (
                  <td key={c.header} className={cn('whitespace-nowrap px-3 py-2', c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
