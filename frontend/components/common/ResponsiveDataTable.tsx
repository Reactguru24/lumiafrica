import type { ReactNode } from 'react'

export interface TableColumn {
  key: string
  label: string
  width?: string
  format?: (value: unknown) => string
}

export interface TableRow {
  id: string
  [key: string]: unknown
}

interface ResponsiveDataTableProps {
  columns: TableColumn[]
  rows: TableRow[]
  renderCell?: (key: string, row: TableRow, column: TableColumn) => ReactNode
  renderActions?: (row: TableRow) => ReactNode
}

function getCellValue(row: TableRow, column: TableColumn): string {
  const value = row[column.key]
  if (column.format) return column.format(value)
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ResponsiveDataTable({ columns, rows, renderCell, renderActions }: ResponsiveDataTableProps) {
  if (!rows.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    )
  }

  return (
    <>
      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="card p-4 space-y-3">
            {columns.map((column) => (
              <div key={column.key} className="flex justify-between items-start gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-fit">{column.label}</span>
                <div className="text-right flex-1 text-sm">
                  {renderCell?.(column.key, row, column) ?? getCellValue(row, column)}
                </div>
              </div>
            ))}
            {renderActions && (
              <div className="flex gap-2 flex-wrap justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                {renderActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden md:block table-responsive">
        <table className="data-table">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300" style={{ width: column.width }}>
                  {column.label}
                </th>
              ))}
              {renderActions && (
                <th className="text-right p-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="p-4 text-sm" style={{ width: column.width }}>
                    {renderCell?.(column.key, row, column) ?? getCellValue(row, column)}
                  </td>
                ))}
                {renderActions && (
                  <td className="p-4 text-right">
                    <div className="flex gap-1 justify-end">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
