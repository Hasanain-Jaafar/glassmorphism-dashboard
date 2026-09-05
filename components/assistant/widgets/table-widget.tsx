import type { AssistantTableWidget } from "@/lib/ai/widgets";

export function TableWidget({ columns, rows }: AssistantTableWidget) {
  return (
    <div className="overflow-x-auto rounded-xl border border-glass-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-foreground/[0.03]">
            {columns.map((column, index) => (
              <th
                key={index}
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-text-tertiary"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-glass-border">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-3 py-2 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
