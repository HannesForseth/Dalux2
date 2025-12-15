/**
 * Measurement calculation utilities
 * These are client-side helper functions for measurement calculations
 */

import type { MeasurementPoint } from '@/types/database'

// ===============================
// Measurement Calculation Helpers
// ===============================

/**
 * Calculate distance between two points
 * Points are in percentage coordinates (0-100)
 * pageWidth and pageHeight are in pixels
 * Returns distance in pixels
 */
export function calculatePixelDistance(
  p1: MeasurementPoint,
  p2: MeasurementPoint,
  pageWidth: number,
  pageHeight: number
): number {
  const dx = (p2.x - p1.x) / 100 * pageWidth
  const dy = (p2.y - p1.y) / 100 * pageHeight
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate real-world length from pixel distance
 * pixelsPerUnit is the calibration ratio
 */
export function calculateRealLength(
  pixelDistance: number,
  pixelsPerUnit: number
): number {
  return pixelDistance / pixelsPerUnit
}

/**
 * Calculate polygon area using Shoelace formula
 * Points are in percentage coordinates (0-100)
 * Returns area in square pixels
 */
export function calculatePixelArea(
  points: MeasurementPoint[],
  pageWidth: number,
  pageHeight: number
): number {
  if (points.length < 3) return 0

  let area = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = (points[i].x / 100) * pageWidth
    const yi = (points[i].y / 100) * pageHeight
    const xj = (points[j].x / 100) * pageWidth
    const yj = (points[j].y / 100) * pageHeight
    area += xi * yj - xj * yi
  }

  return Math.abs(area) / 2
}

/**
 * Calculate real-world area from pixel area
 */
export function calculateRealArea(
  pixelArea: number,
  pixelsPerUnit: number
): number {
  return pixelArea / (pixelsPerUnit * pixelsPerUnit)
}

/**
 * Calculate polyline length (sum of segments)
 */
export function calculatePolylinePixelLength(
  points: MeasurementPoint[],
  pageWidth: number,
  pageHeight: number
): number {
  if (points.length < 2) return 0

  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    total += calculatePixelDistance(points[i], points[i + 1], pageWidth, pageHeight)
  }
  return total
}

/**
 * Format measurement value with appropriate unit
 */
export function formatMeasurement(
  value: number,
  unit: string,
  type: 'length' | 'area' | 'polyline' | 'count'
): string {
  if (type === 'count') {
    return `${Math.round(value)} st`
  }

  const decimals = value < 1 ? 2 : value < 10 ? 1 : 0
  const formattedValue = value.toFixed(decimals)

  if (type === 'area') {
    return `${formattedValue} ${unit}²`
  }

  return `${formattedValue} ${unit}`
}

/**
 * Calculate the centroid of a polygon
 */
export function calculateCentroid(points: MeasurementPoint[]): MeasurementPoint {
  if (points.length === 0) return { x: 0, y: 0 }

  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  )

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  }
}
