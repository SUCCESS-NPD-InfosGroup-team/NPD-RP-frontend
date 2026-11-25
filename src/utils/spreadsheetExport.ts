export interface ExportPage<T> {
  items: T[]
  totalPages: number
}

export type SpreadsheetRow = Record<string, string | number>
export type SpreadsheetExportFormat = 'xlsx' | 'csv'

export async function fetchAllPages<T>(
  loadPage: (page: number) => Promise<ExportPage<T>>,
): Promise<T[]> {
  const firstPage = await loadPage(1)
  const items = [...firstPage.items]
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) => loadPage(index + 2)),
  )
  remainingPages.forEach((page) => items.push(...page.items))

  return items
}

export function spreadsheetFileName(
  name: string,
  today = new Date(),
  format: SpreadsheetExportFormat = 'xlsx',
): string {
  return `${name}_${today.toISOString().slice(0, 10)}.${format}`
}

export async function downloadExcel(
  rows: SpreadsheetRow[],
  fileName: string,
  sheetName: string,
): Promise<void> {
  const [XLSX, { saveAs }] = await Promise.all([
    import('xlsx'),
    import('file-saver'),
  ])
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const file = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([file], { type: 'application/octet-stream' }), fileName)
}

export async function downloadSpreadsheet(
  rows: SpreadsheetRow[],
  fileName: string,
  sheetName: string,
  format: SpreadsheetExportFormat,
): Promise<void> {
  if (format === 'xlsx') {
    await downloadExcel(rows, fileName, sheetName)
    return
  }

  const [{ utils }, { saveAs }] = await Promise.all([
    import('xlsx'),
    import('file-saver'),
  ])
  const safeRows = rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === 'string' && /^\s*[=+\-@]/.test(value) ? `'${value}` : value,
    ]),
  ))
  const worksheet = utils.json_to_sheet(safeRows)
  const csv = utils.sheet_to_csv(worksheet)
  saveAs(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), fileName)
}
