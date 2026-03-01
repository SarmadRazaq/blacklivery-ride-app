import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Table = ({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="w-full overflow-auto">
        <table className={twMerge(clsx('w-full caption-bottom text-sm', className))} {...props}>
            {children}
        </table>
    </div>
);

export const TableHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={twMerge(clsx('[&_tr]:border-b', className))} {...props}>
        {children}
    </thead>
);

export const TableBody = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={twMerge(clsx('[&_tr:last-child]:border-0', className))} {...props}>
        {children}
    </tbody>
);

export const TableRow = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
        className={twMerge(
            clsx(
                'border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50',
                className
            )
        )}
        {...props}
    >
        {children}
    </tr>
);

export const TableHead = ({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
        className={twMerge(
            clsx(
                'h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0',
                className
            )
        )}
        {...props}
    >
        {children}
    </th>
);

export const TableCell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
        className={twMerge(clsx('p-4 align-middle [&:has([role=checkbox])]:pr-0', className))}
        {...props}
    >
        {children}
    </td>
);
