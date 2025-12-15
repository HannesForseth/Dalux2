'use client'

import { useCallback, useMemo } from 'react'
import type {
  DocumentMeasurementWithCreator,
  MeasurementType,
  MeasurementPoint,
  MeasurementColor
} from '@/types/database'

interface MeasurementOverlayProps {
  measurements: DocumentMeasurementWithCreator[]
  currentPage: number
  pageWidth: number
  pageHeight: number
  scale: number
  // Drawing state
  measurementMode: MeasurementType | null
  drawingPoints: MeasurementPoint[]
  mousePosition: MeasurementPoint | null
  selectedColor: MeasurementColor
  // Calibration
  isCalibrating: boolean
  calibrationPoints: MeasurementPoint[]
  // Interaction
  selectedMeasurementId: string | null
  onMeasurementClick?: (id: string) => void
}

// Color mapping for measurements
const MEASUREMENT_COLORS: Record<MeasurementColor, { stroke: string; fill: string; text: string }> = {
  blue: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)', text: '#1d4ed8' },
  red: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)', text: '#b91c1c' },
  green: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.2)', text: '#15803d' },
  orange: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.2)', text: '#c2410c' },
  purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.2)', text: '#7c3aed' },
}

// Convert percentage coordinates to pixel coordinates
function toPixel(point: MeasurementPoint, width: number, height: number): { x: number; y: number } {
  return {
    x: (point.x / 100) * width,
    y: (point.y / 100) * height,
  }
}

// Calculate distance between two points in pixels
function calculatePixelDistance(
  p1: MeasurementPoint,
  p2: MeasurementPoint,
  width: number,
  height: number
): number {
  const px1 = toPixel(p1, width, height)
  const px2 = toPixel(p2, width, height)
  const dx = px2.x - px1.x
  const dy = px2.y - px1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Calculate polygon centroid
function calculateCentroid(points: MeasurementPoint[], width: number, height: number): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 }
  const pixelPoints = points.map(p => toPixel(p, width, height))
  const sum = pixelPoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

// Format measurement value
function formatValue(value: number | null, unit: string | null, type: MeasurementType): string {
  if (value === null) return '—'

  if (type === 'count') {
    return `${Math.round(value)} st`
  }

  const decimals = value < 1 ? 2 : value < 10 ? 1 : 0
  const formattedValue = value.toFixed(decimals)

  if (type === 'area') {
    return `${formattedValue} ${unit || 'px'}²`
  }

  return `${formattedValue} ${unit || 'px'}`
}

// Length measurement component
function LengthMeasurement({
  points,
  color,
  value,
  unit,
  name,
  isSelected,
  onClick,
  pageWidth,
  pageHeight,
}: {
  points: MeasurementPoint[]
  color: MeasurementColor
  value: number | null
  unit: string | null
  name: string | null
  isSelected: boolean
  onClick?: (e: React.MouseEvent) => void
  pageWidth: number
  pageHeight: number
}) {
  if (points.length < 2) return null

  const colors = MEASUREMENT_COLORS[color]
  const p1 = toPixel(points[0], pageWidth, pageHeight)
  const p2 = toPixel(points[1], pageWidth, pageHeight)

  // Calculate midpoint for label
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2

  // Calculate angle for perpendicular offset
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const labelOffset = 15
  const labelX = midX - Math.sin(angle) * labelOffset
  const labelY = midY + Math.cos(angle) * labelOffset

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={isSelected ? 'measurement-selected' : ''}
    >
      {/* Main line */}
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
      />
      {/* End caps */}
      <circle cx={p1.x} cy={p1.y} r={isSelected ? 5 : 4} fill={colors.stroke} />
      <circle cx={p2.x} cy={p2.y} r={isSelected ? 5 : 4} fill={colors.stroke} />
      {/* Label background */}
      <rect
        x={labelX - 30}
        y={labelY - 10}
        width={60}
        height={20}
        rx={4}
        fill="white"
        fillOpacity={0.9}
        stroke={colors.stroke}
        strokeWidth={1}
      />
      {/* Label text */}
      <text
        x={labelX}
        y={labelY + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill={colors.text}
      >
        {formatValue(value, unit, 'length')}
      </text>
      {/* Name label if exists */}
      {name && (
        <text
          x={labelX}
          y={labelY - 16}
          textAnchor="middle"
          fontSize={10}
          fill={colors.text}
          fontWeight={400}
        >
          {name}
        </text>
      )}
    </g>
  )
}

// Area measurement component
function AreaMeasurement({
  points,
  color,
  value,
  unit,
  name,
  isSelected,
  onClick,
  pageWidth,
  pageHeight,
}: {
  points: MeasurementPoint[]
  color: MeasurementColor
  value: number | null
  unit: string | null
  name: string | null
  isSelected: boolean
  onClick?: (e: React.MouseEvent) => void
  pageWidth: number
  pageHeight: number
}) {
  if (points.length < 3) return null

  const colors = MEASUREMENT_COLORS[color]
  const pixelPoints = points.map(p => toPixel(p, pageWidth, pageHeight))
  const pathData = pixelPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const centroid = calculateCentroid(points, pageWidth, pageHeight)

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={isSelected ? 'measurement-selected' : ''}
    >
      {/* Filled polygon */}
      <path
        d={pathData}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinejoin="round"
      />
      {/* Vertex points */}
      {pixelPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={isSelected ? 5 : 4} fill={colors.stroke} />
      ))}
      {/* Label background */}
      <rect
        x={centroid.x - 35}
        y={centroid.y - 10}
        width={70}
        height={20}
        rx={4}
        fill="white"
        fillOpacity={0.9}
        stroke={colors.stroke}
        strokeWidth={1}
      />
      {/* Label text */}
      <text
        x={centroid.x}
        y={centroid.y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill={colors.text}
      >
        {formatValue(value, unit, 'area')}
      </text>
      {/* Name label */}
      {name && (
        <text
          x={centroid.x}
          y={centroid.y - 16}
          textAnchor="middle"
          fontSize={10}
          fill={colors.text}
          fontWeight={400}
        >
          {name}
        </text>
      )}
    </g>
  )
}

// Polyline measurement component
function PolylineMeasurement({
  points,
  color,
  value,
  unit,
  name,
  isSelected,
  onClick,
  pageWidth,
  pageHeight,
}: {
  points: MeasurementPoint[]
  color: MeasurementColor
  value: number | null
  unit: string | null
  name: string | null
  isSelected: boolean
  onClick?: (e: React.MouseEvent) => void
  pageWidth: number
  pageHeight: number
}) {
  if (points.length < 2) return null

  const colors = MEASUREMENT_COLORS[color]
  const pixelPoints = points.map(p => toPixel(p, pageWidth, pageHeight))
  const pathData = pixelPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Find midpoint of polyline for label
  const midIndex = Math.floor(points.length / 2)
  const labelPoint = pixelPoints[midIndex]

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={isSelected ? 'measurement-selected' : ''}
    >
      {/* Polyline path */}
      <path
        d={pathData}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vertex points */}
      {pixelPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={isSelected ? 5 : 4} fill={colors.stroke} />
      ))}
      {/* Label background */}
      <rect
        x={labelPoint.x - 30}
        y={labelPoint.y - 25}
        width={60}
        height={20}
        rx={4}
        fill="white"
        fillOpacity={0.9}
        stroke={colors.stroke}
        strokeWidth={1}
      />
      {/* Label text */}
      <text
        x={labelPoint.x}
        y={labelPoint.y - 11}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill={colors.text}
      >
        {formatValue(value, unit, 'polyline')}
      </text>
      {/* Name label */}
      {name && (
        <text
          x={labelPoint.x}
          y={labelPoint.y - 31}
          textAnchor="middle"
          fontSize={10}
          fill={colors.text}
          fontWeight={400}
        >
          {name}
        </text>
      )}
    </g>
  )
}

// Count marker component
function CountMarker({
  point,
  index,
  color,
  isSelected,
  onClick,
  pageWidth,
  pageHeight,
}: {
  point: MeasurementPoint
  index: number
  color: MeasurementColor
  isSelected: boolean
  onClick?: (e: React.MouseEvent) => void
  pageWidth: number
  pageHeight: number
}) {
  const colors = MEASUREMENT_COLORS[color]
  const p = toPixel(point, pageWidth, pageHeight)

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={isSelected ? 'measurement-selected' : ''}
    >
      <circle
        cx={p.x}
        cy={p.y}
        r={isSelected ? 14 : 12}
        fill={colors.stroke}
        stroke="white"
        strokeWidth={2}
      />
      <text
        x={p.x}
        y={p.y + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill="white"
      >
        {index}
      </text>
    </g>
  )
}

// Drawing preview component
function DrawingPreview({
  type,
  points,
  mousePosition,
  color,
  pageWidth,
  pageHeight,
}: {
  type: MeasurementType
  points: MeasurementPoint[]
  mousePosition: MeasurementPoint | null
  color: MeasurementColor
  pageWidth: number
  pageHeight: number
}) {
  const colors = MEASUREMENT_COLORS[color]

  if (points.length === 0) return null

  const pixelPoints = points.map(p => toPixel(p, pageWidth, pageHeight))
  const mousePixel = mousePosition ? toPixel(mousePosition, pageWidth, pageHeight) : null

  if (type === 'length') {
    const p1 = pixelPoints[0]
    const p2 = mousePixel || p1

    // Calculate distance for live preview
    const distance = mousePosition
      ? calculatePixelDistance(points[0], mousePosition, pageWidth, pageHeight)
      : 0

    return (
      <g>
        {/* Preview line */}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={colors.stroke}
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.8}
        />
        {/* Start point */}
        <circle cx={p1.x} cy={p1.y} r={4} fill={colors.stroke} />
        {/* End point preview */}
        {mousePixel && (
          <>
            <circle cx={p2.x} cy={p2.y} r={4} fill={colors.stroke} opacity={0.5} />
            {/* Live measurement */}
            <text
              x={(p1.x + p2.x) / 2}
              y={(p1.y + p2.y) / 2 - 10}
              textAnchor="middle"
              fontSize={12}
              fill={colors.text}
              fontWeight={500}
            >
              {distance.toFixed(1)} px
            </text>
          </>
        )}
      </g>
    )
  }

  if (type === 'area' || type === 'polyline') {
    const allPoints = mousePixel ? [...pixelPoints, mousePixel] : pixelPoints

    const pathData = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const closedPath = type === 'area' && allPoints.length >= 3 ? pathData + ' Z' : pathData

    return (
      <g>
        {/* Preview path */}
        <path
          d={closedPath}
          fill={type === 'area' ? colors.fill : 'none'}
          stroke={colors.stroke}
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.8}
          fillOpacity={0.3}
        />
        {/* Vertex points */}
        {pixelPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.stroke} />
        ))}
        {/* Mouse position preview */}
        {mousePixel && <circle cx={mousePixel.x} cy={mousePixel.y} r={4} fill={colors.stroke} opacity={0.5} />}
        {/* Instruction */}
        <text
          x={pixelPoints[0].x}
          y={pixelPoints[0].y - 15}
          textAnchor="middle"
          fontSize={10}
          fill={colors.text}
        >
          {type === 'area' ? 'Dubbelklicka för att slutföra' : 'Dubbelklicka för att slutföra'}
        </text>
      </g>
    )
  }

  if (type === 'count') {
    return (
      <g>
        {pixelPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={12} fill={colors.stroke} stroke="white" strokeWidth={2} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="white">
              {i + 1}
            </text>
          </g>
        ))}
        {/* Preview for next marker */}
        {mousePixel && (
          <circle cx={mousePixel.x} cy={mousePixel.y} r={12} fill={colors.stroke} opacity={0.5} />
        )}
        {/* Count display */}
        <text
          x={pixelPoints[0]?.x || 0}
          y={(pixelPoints[0]?.y || 0) - 20}
          textAnchor="middle"
          fontSize={11}
          fill={colors.text}
          fontWeight={500}
        >
          Antal: {pixelPoints.length}
        </text>
      </g>
    )
  }

  return null
}

// Calibration preview component
function CalibrationPreview({
  points,
  mousePosition,
  pageWidth,
  pageHeight,
}: {
  points: MeasurementPoint[]
  mousePosition: MeasurementPoint | null
  pageWidth: number
  pageHeight: number
}) {
  if (points.length === 0) return null

  const pixelPoints = points.map(p => toPixel(p, pageWidth, pageHeight))
  const mousePixel = mousePosition ? toPixel(mousePosition, pageWidth, pageHeight) : null
  const p1 = pixelPoints[0]
  const p2 = pixelPoints[1] || mousePixel || p1

  return (
    <g>
      {/* Calibration line */}
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="#f59e0b"
        strokeWidth={3}
        strokeDasharray={points.length < 2 ? '8,4' : 'none'}
      />
      {/* End points */}
      <circle cx={p1.x} cy={p1.y} r={6} fill="#f59e0b" stroke="white" strokeWidth={2} />
      {points.length < 2 && mousePixel && (
        <circle cx={p2.x} cy={p2.y} r={6} fill="#f59e0b" stroke="white" strokeWidth={2} opacity={0.6} />
      )}
      {points.length >= 2 && (
        <circle cx={p2.x} cy={p2.y} r={6} fill="#f59e0b" stroke="white" strokeWidth={2} />
      )}
      {/* Instructions */}
      <text
        x={(p1.x + p2.x) / 2}
        y={(p1.y + p2.y) / 2 - 15}
        textAnchor="middle"
        fontSize={12}
        fill="#f59e0b"
        fontWeight={600}
      >
        {points.length < 2 ? 'Klicka för slutpunkt' : 'Kalibreringsreferens'}
      </text>
    </g>
  )
}

export default function MeasurementOverlay({
  measurements,
  currentPage,
  pageWidth,
  pageHeight,
  scale,
  measurementMode,
  drawingPoints,
  mousePosition,
  selectedColor,
  isCalibrating,
  calibrationPoints,
  selectedMeasurementId,
  onMeasurementClick,
}: MeasurementOverlayProps) {
  // Filter measurements for current page
  const pageMeasurements = useMemo(
    () => measurements.filter(m => m.page_number === currentPage),
    [measurements, currentPage]
  )

  const handleMeasurementClick = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.stopPropagation()
      onMeasurementClick?.(id)
    },
    [onMeasurementClick]
  )

  if (pageWidth === 0 || pageHeight === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: pageWidth * scale, height: pageHeight * scale }}
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="none"
    >
      {/* Saved measurements */}
      {pageMeasurements.map(measurement => {
        const isSelected = measurement.id === selectedMeasurementId

        switch (measurement.type) {
          case 'length':
            return (
              <LengthMeasurement
                key={measurement.id}
                points={measurement.points}
                color={measurement.color}
                value={measurement.measured_value}
                unit={measurement.scale_unit}
                name={measurement.name}
                isSelected={isSelected}
                onClick={onMeasurementClick ? handleMeasurementClick(measurement.id) : undefined}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
              />
            )
          case 'area':
            return (
              <AreaMeasurement
                key={measurement.id}
                points={measurement.points}
                color={measurement.color}
                value={measurement.measured_value}
                unit={measurement.scale_unit}
                name={measurement.name}
                isSelected={isSelected}
                onClick={onMeasurementClick ? handleMeasurementClick(measurement.id) : undefined}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
              />
            )
          case 'polyline':
            return (
              <PolylineMeasurement
                key={measurement.id}
                points={measurement.points}
                color={measurement.color}
                value={measurement.measured_value}
                unit={measurement.scale_unit}
                name={measurement.name}
                isSelected={isSelected}
                onClick={onMeasurementClick ? handleMeasurementClick(measurement.id) : undefined}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
              />
            )
          case 'count':
            return (
              <g key={measurement.id}>
                {measurement.points.map((point, index) => (
                  <CountMarker
                    key={`${measurement.id}-${index}`}
                    point={point}
                    index={index + 1}
                    color={measurement.color}
                    isSelected={isSelected}
                    onClick={onMeasurementClick ? handleMeasurementClick(measurement.id) : undefined}
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                  />
                ))}
              </g>
            )
          default:
            return null
        }
      })}

      {/* Drawing preview */}
      {measurementMode && drawingPoints.length > 0 && (
        <DrawingPreview
          type={measurementMode}
          points={drawingPoints}
          mousePosition={mousePosition}
          color={selectedColor}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
        />
      )}

      {/* Calibration preview */}
      {isCalibrating && calibrationPoints.length > 0 && (
        <CalibrationPreview
          points={calibrationPoints}
          mousePosition={mousePosition}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
        />
      )}
    </svg>
  )
}
