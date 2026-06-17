import * as XLSX from 'xlsx-js-style'
import { ElMessage } from 'element-plus'

/**
 * 列宽配置接口
 */
export interface ColumnWidth {
  wch: number // 字符宽度
}

/**
 * 导出 Excel 配置
 */
export interface ExportExcelOptions {
  data: any[] // 数据数组
  filename: string // 文件名（不含扩展名）
  sheetName?: string // 工作表名称，默认为 'Sheet1'
  columnWidths?: ColumnWidth[] // 列宽配置数组
  autoWidth?: boolean // 是否自动计算列宽，默认 true
  merges?: XLSX.Range[] // 合并单元格配置
  withBorder?: boolean // 是否添加单元格边框，默认 true
  transformWorksheet?: (worksheet: XLSX.WorkSheet, headers: string[]) => void // 工作表二次处理
}

export interface ExportStyledAoaOptions {
  data: Array<Array<string | number>>
  filename: string
  sheetName?: string
  columnWidths?: Array<{ wch?: number; wpx?: number }>
  rowHeights?: Array<{ hpx?: number }>
  merges?: XLSX.Range[]
  headerRowCount?: number
  highlightRows?: number[]
  transformWorksheet?: (worksheet: XLSX.WorkSheet) => void
}

function applyWorksheetBorder(
  worksheet: XLSX.WorkSheet,
  headers: string[],
  dataLength: number
): void {
  const border = {
    top: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } }
  }

  for (let rowIndex = 0; rowIndex <= dataLength; rowIndex += 1) {
    for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
      const cell = worksheet[cellAddress]
      if (!cell) continue

      const isHeaderRow = rowIndex === 0
      cell.s = {
        ...(cell.s || {}),
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border,
        font: {
          ...(cell.s?.font || {}),
          bold: isHeaderRow
        }
      }
    }
  }
}

/**
 * 计算列宽
 * @param data 数据数组
 * @param headers 表头数组
 * @returns 列宽配置数组
 */
function calculateColumnWidths(data: any[], headers: string[]): ColumnWidth[] {
  const widths: ColumnWidth[] = []

  headers.forEach((header) => {
    // 计算表头宽度
    let maxWidth = header.length

    // 遍历数据计算最大宽度
    data.forEach((row) => {
      const value = String(row[header] || '')
      // 中文字符按 2 个字符计算，英文按 1 个字符计算
      const length = value.replace(/[\u4e00-\u9fa5]/g, 'aa').length
      if (length > maxWidth) {
        maxWidth = length
      }
    })

    // 设置最小宽度为 10，最大宽度为 50
    widths.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 50) })
  })

  return widths
}

/**
 * 导出数据到 Excel
 * @param options 导出配置
 */
export function exportToExcel(options: ExportExcelOptions): void {
  const {
    data,
    filename,
    sheetName = 'Sheet1',
    columnWidths,
    autoWidth = true,
    merges,
    withBorder = true,
    transformWorksheet
  } = options

  if (!data || data.length === 0) {
    ElMessage.warning('导出数据为空')
    return
  }

  // 获取表头
  const headers = Object.keys(data[0])

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  if (columnWidths) {
    worksheet['!cols'] = columnWidths
  } else if (autoWidth) {
    worksheet['!cols'] = calculateColumnWidths(data, headers)
  }

  if (merges && merges.length > 0) {
    worksheet['!merges'] = merges
  }

  if (withBorder) {
    applyWorksheetBorder(worksheet, headers, data.length)
  }

  transformWorksheet?.(worksheet, headers)

  // 创建工作簿
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // 导出文件
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * 导出数据到 Excel（简化版）
 * @param data 数据数组
 * @param filename 文件名
 */
export function simpleExportToExcel(
  data: any[],
  filename: string,
  options?: Omit<ExportExcelOptions, 'data' | 'filename'>
): void {
  exportToExcel({
    data,
    filename,
    autoWidth: true,
    ...options
  })
}

export function exportStyledAoaToExcel(options: ExportStyledAoaOptions): void {
  const {
    data,
    filename,
    sheetName = 'Sheet1',
    columnWidths,
    rowHeights,
    merges,
    headerRowCount = 1,
    highlightRows = [],
    transformWorksheet
  } = options

  if (!data || data.length === 0) {
    ElMessage.warning('导出数据为空')
    return
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const rangeRef = worksheet['!ref']

  if (columnWidths) {
    worksheet['!cols'] = columnWidths
  }

  if (rowHeights) {
    worksheet['!rows'] = rowHeights
  }

  if (merges && merges.length > 0) {
    worksheet['!merges'] = merges
  }

  if (rangeRef) {
    const range = XLSX.utils.decode_range(rangeRef)
    const border = {
      top: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } }
    }
    const highlightRowSet = new Set(highlightRows)

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
        const cell = worksheet[cellAddress]
        if (!cell) continue

        const isHeaderRow = rowIndex < headerRowCount
        const isHighlightRow = highlightRowSet.has(rowIndex)

        cell.s = {
          ...(cell.s || {}),
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          border,
          fill: {
            fgColor: {
              rgb: isHighlightRow ? 'FFE4BD' : isHeaderRow ? 'F7F7F7' : 'FFFFFF'
            }
          },
          font: {
            ...(cell.s?.font || {}),
            bold: isHeaderRow || isHighlightRow,
            color: { rgb: isHeaderRow || isHighlightRow ? '303133' : '1F2D3D' },
            sz: 12
          }
        }
      }
    }
  }

  transformWorksheet?.(worksheet)

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
