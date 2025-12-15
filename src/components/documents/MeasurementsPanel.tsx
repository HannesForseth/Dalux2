'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  Download,
  FileText,
  Table,
  Search,
  Ruler,
  Square,
  Hash
} from 'lucide-react'
import type { DocumentMeasurementWithCreator, MeasurementType, MeasurementUnit } from '@/types/database'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'

interface MeasurementsPanelProps {
  measurements: DocumentMeasurementWithCreator[]
  currentPage: number
  onClose: () => void
  onSelectMeasurement: (id: string) => void
  onDeleteMeasurement: (id: string) => void
  onEditMeasurement: (id: string) => void
  onGoToPage: (page: number) => void
  selectedMeasurementId: string | null
  calibrationUnit: MeasurementUnit | null
}

const TYPE_CONFIG: Record<MeasurementType, { icon: React.ReactNode; label: string; unitSuffix: string }> = {
  length: { icon: <Ruler className="h-4 w-4" />, label: 'Längd', unitSuffix: '' },
  area: { icon: <Square className="h-4 w-4" />, label: 'Area', unitSuffix: '²' },
  polyline: { icon: <span className="text-sm">〰️</span>, label: 'Polylinje', unitSuffix: '' },
  count: { icon: <Hash className="h-4 w-4" />, label: 'Antal', unitSuffix: '' },
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
}

export default function MeasurementsPanel({
  measurements,
  currentPage,
  onClose,
  onSelectMeasurement,
  onDeleteMeasurement,
  onEditMeasurement,
  onGoToPage,
  selectedMeasurementId,
  calibrationUnit,
}: MeasurementsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<MeasurementType | 'all'>('all')
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([currentPage]))
  const [isExporting, setIsExporting] = useState(false)

  // Group measurements by page
  const measurementsByPage = useMemo(() => {
    const grouped = new Map<number, DocumentMeasurementWithCreator[]>()

    measurements
      .filter(m => {
        const matchesSearch = !searchQuery ||
          m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.note?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === 'all' || m.type === filterType
        return matchesSearch && matchesType
      })
      .forEach(m => {
        const page = m.page_number
        if (!grouped.has(page)) {
          grouped.set(page, [])
        }
        grouped.get(page)!.push(m)
      })

    return grouped
  }, [measurements, searchQuery, filterType])

  // Calculate summaries
  const summaries = useMemo(() => {
    const filtered = measurements.filter(m => {
      const matchesSearch = !searchQuery ||
        m.name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || m.type === filterType
      return matchesSearch && matchesType
    })

    return {
      totalLength: filtered
        .filter(m => m.type === 'length' && m.measured_value)
        .reduce((sum, m) => sum + (m.measured_value || 0), 0),
      totalArea: filtered
        .filter(m => m.type === 'area' && m.measured_value)
        .reduce((sum, m) => sum + (m.measured_value || 0), 0),
      totalPolyline: filtered
        .filter(m => m.type === 'polyline' && m.measured_value)
        .reduce((sum, m) => sum + (m.measured_value || 0), 0),
      totalCount: filtered
        .filter(m => m.type === 'count')
        .reduce((sum, m) => sum + m.points.length, 0),
      count: filtered.length,
    }
  }, [measurements, searchQuery, filterType])

  const togglePage = (page: number) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(page)) {
      newExpanded.delete(page)
    } else {
      newExpanded.add(page)
    }
    setExpandedPages(newExpanded)
  }

  const formatValue = (measurement: DocumentMeasurementWithCreator) => {
    if (measurement.type === 'count') {
      return `${measurement.points.length} st`
    }
    if (!measurement.measured_value) {
      return 'Ej kalibrerad'
    }
    const value = measurement.measured_value
    const decimals = value < 1 ? 2 : value < 10 ? 1 : 0
    const unit = measurement.scale_unit || calibrationUnit || 'm'
    const suffix = TYPE_CONFIG[measurement.type].unitSuffix
    return `${value.toFixed(decimals)} ${unit}${suffix}`
  }

  // Export to PDF
  const exportToPDF = useCallback(() => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()

      // Header
      doc.setFontSize(20)
      doc.setTextColor(79, 70, 229)
      doc.text('Mätningsrapport', 14, 22)

      // Metadata
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(`Exporterad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 30)
      doc.text(`Totalt: ${measurements.length} mätningar`, 14, 36)

      // Table
      const tableData = measurements.map(m => [
        TYPE_CONFIG[m.type].label,
        m.name || '-',
        formatValue(m),
        `Sida ${m.page_number}`,
        m.creator?.full_name || '-',
        new Date(m.created_at).toLocaleDateString('sv-SE')
      ])

      autoTable(doc, {
        head: [['Typ', 'Namn', 'Värde', 'Sida', 'Skapad av', 'Datum']],
        body: tableData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
      })

      // Summary
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('Summering', 14, finalY)
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)

      let summaryY = finalY + 8
      if (summaries.totalLength > 0) {
        doc.text(`Total längd: ${summaries.totalLength.toFixed(2)} ${calibrationUnit || 'm'}`, 14, summaryY)
        summaryY += 6
      }
      if (summaries.totalArea > 0) {
        doc.text(`Total area: ${summaries.totalArea.toFixed(2)} ${calibrationUnit || 'm'}²`, 14, summaryY)
        summaryY += 6
      }
      if (summaries.totalPolyline > 0) {
        doc.text(`Total polylinje: ${summaries.totalPolyline.toFixed(2)} ${calibrationUnit || 'm'}`, 14, summaryY)
        summaryY += 6
      }
      if (summaries.totalCount > 0) {
        doc.text(`Totalt antal: ${summaries.totalCount} st`, 14, summaryY)
      }

      doc.save(`matningar-${new Date().toISOString().split('T')[0]}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }, [measurements, summaries, calibrationUnit])

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const csvData = measurements.map(m => ({
      Typ: TYPE_CONFIG[m.type].label,
      Namn: m.name || '',
      Värde: m.measured_value || '',
      Enhet: m.scale_unit || calibrationUnit || '',
      Sida: m.page_number,
      Anteckning: m.note || '',
      'Skapad av': m.creator?.full_name || '',
      Datum: new Date(m.created_at).toLocaleDateString('sv-SE'),
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `matningar-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [measurements, calibrationUnit])

  const sortedPages = Array.from(measurementsByPage.keys()).sort((a, b) => a - b)

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-lg flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Ruler className="h-5 w-5 text-indigo-600" />
          Mätningar
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Sök mätningar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MeasurementType | 'all')}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Alla typer</option>
          <option value="length">Längd</option>
          <option value="area">Area</option>
          <option value="polyline">Polylinje</option>
          <option value="count">Antal</option>
        </select>
      </div>

      {/* Export buttons */}
      <div className="p-3 border-b border-slate-200 flex gap-2">
        <button
          onClick={exportToPDF}
          disabled={measurements.length === 0 || isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="h-4 w-4" />
          PDF
        </button>
        <button
          onClick={exportToCSV}
          disabled={measurements.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Table className="h-4 w-4" />
          CSV
        </button>
      </div>

      {/* Measurements list */}
      <div className="flex-1 overflow-y-auto">
        {sortedPages.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            {searchQuery || filterType !== 'all'
              ? 'Inga mätningar matchar filtret'
              : 'Inga mätningar ännu'}
          </div>
        ) : (
          sortedPages.map(page => {
            const pageMeasurements = measurementsByPage.get(page) || []
            const isExpanded = expandedPages.has(page)
            const isCurrentPage = page === currentPage

            return (
              <div key={page} className="border-b border-slate-100">
                <button
                  onClick={() => togglePage(page)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-slate-50 ${
                    isCurrentPage ? 'bg-indigo-50' : ''
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="font-medium text-sm text-slate-700">
                    Sida {page}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({pageMeasurements.length} mätningar)
                  </span>
                  {!isCurrentPage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onGoToPage(page)
                      }}
                      className="ml-auto text-xs text-indigo-600 hover:underline"
                    >
                      Gå till
                    </button>
                  )}
                </button>

                {isExpanded && (
                  <div className="pb-2">
                    {pageMeasurements.map(m => {
                      const isSelected = m.id === selectedMeasurementId
                      const typeConfig = TYPE_CONFIG[m.type]

                      return (
                        <div
                          key={m.id}
                          onClick={() => onSelectMeasurement(m.id)}
                          className={`mx-2 mb-1 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-100 border border-indigo-300'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${COLOR_MAP[m.color]}`} />
                            <span className="text-slate-500">{typeConfig.icon}</span>
                            <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                              {m.name || `${typeConfig.label} ${m.id.slice(0, 4)}`}
                            </span>
                            <span className="text-sm text-slate-600">
                              {formatValue(m)}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="mt-2 flex items-center gap-2 pl-5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditMeasurement(m.id)
                                }}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Redigera"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteMeasurement(m.id)
                                }}
                                className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Ta bort"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              {m.note && (
                                <span className="text-xs text-slate-400 truncate ml-2">
                                  {m.note}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Summary footer */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          Summering {filterType !== 'all' ? `(${TYPE_CONFIG[filterType].label})` : ''}
        </h4>
        <div className="space-y-1 text-sm">
          {(filterType === 'all' || filterType === 'length') && summaries.totalLength > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Längd:</span>
              <span className="font-medium text-slate-900">
                {summaries.totalLength.toFixed(2)} {calibrationUnit || 'm'}
              </span>
            </div>
          )}
          {(filterType === 'all' || filterType === 'area') && summaries.totalArea > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Area:</span>
              <span className="font-medium text-slate-900">
                {summaries.totalArea.toFixed(2)} {calibrationUnit || 'm'}²
              </span>
            </div>
          )}
          {(filterType === 'all' || filterType === 'polyline') && summaries.totalPolyline > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Polylinje:</span>
              <span className="font-medium text-slate-900">
                {summaries.totalPolyline.toFixed(2)} {calibrationUnit || 'm'}
              </span>
            </div>
          )}
          {(filterType === 'all' || filterType === 'count') && summaries.totalCount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Antal:</span>
              <span className="font-medium text-slate-900">
                {summaries.totalCount} st
              </span>
            </div>
          )}
          {summaries.count === 0 && (
            <div className="text-slate-400 text-center">Inga mätningar</div>
          )}
        </div>
      </div>
    </div>
  )
}
