// Utility functions for converting between decimal inches and fractional display

// Conversion constant: 1 inch = 25.4 mm
export const INCHES_TO_MM = 25.4;

/**
 * Convert inches to millimeters
 */
export function inchesToMm(inches: number): number {
  return inches * INCHES_TO_MM;
}

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm: number): number {
  return mm / INCHES_TO_MM;
}

/**
 * Format a measurement based on the unit system.
 * All internal values are stored in inches.
 * @param inches - Value in inches
 * @param units - 'imperial' for fractions or 'metric' for mm
 * @returns Formatted string with unit suffix
 */
export function formatMeasurement(inches: number, units: 'imperial' | 'metric'): string {
  if (units === 'metric') {
    const mm = inchesToMm(inches);
    // Round to 1 decimal place for cleaner display
    const rounded = Math.round(mm * 10) / 10;
    // Remove trailing zeros after decimal
    return rounded % 1 === 0 ? `${rounded}` : `${rounded}`;
  }
  return decimalToFraction(inches);
}

/**
 * Format a measurement with its unit suffix for display.
 * @param inches - Value in inches
 * @param units - 'imperial' for fractions or 'metric' for mm
 * @returns Formatted string with unit suffix (e.g., "3/4\"" or "19.1mm")
 */
export function formatMeasurementWithUnit(inches: number, units: 'imperial' | 'metric'): string {
  if (units === 'metric') {
    const mm = inchesToMm(inches);
    const rounded = Math.round(mm * 10) / 10;
    return `${rounded}mm`;
  }
  return `${decimalToFraction(inches)}"`;
}

/**
 * Parse user input based on units, returning inches.
 * @param input - User input string
 * @param units - 'imperial' or 'metric'
 * @returns Value in inches, or null if invalid
 */
export function parseInput(input: string, units: 'imperial' | 'metric'): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (units === 'metric') {
    // For metric, parse as a decimal mm value
    const mm = parseFloat(trimmed);
    if (isNaN(mm)) return null;
    return mmToInches(mm);
  }

  // For imperial, use the existing fraction parser
  return fractionToDecimal(trimmed);
}

/**
 * Greatest common divisor using Euclidean algorithm
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Convert a decimal number to a mixed fraction string
 * Uses 16ths as the denominator (standard for woodworking)
 * Examples: 0.75 -> "3/4", 1.8125 -> "1 13/16", 25.5 -> "25 1/2"
 */
export function decimalToFraction(decimal: number): string {
  if (decimal < 0) {
    return '-' + decimalToFraction(-decimal);
  }

  const wholePart = Math.floor(decimal);
  const fractionalPart = decimal - wholePart;

  // Convert to 16ths and round to nearest
  const sixteenths = Math.round(fractionalPart * 16);

  // Handle case where rounding gives us 16/16
  if (sixteenths === 16) {
    return String(wholePart + 1);
  }

  // No fractional part
  if (sixteenths === 0) {
    return String(wholePart);
  }

  // Reduce the fraction
  const divisor = gcd(sixteenths, 16);
  const numerator = sixteenths / divisor;
  const denominator = 16 / divisor;

  if (wholePart === 0) {
    return `${numerator}/${denominator}`;
  }

  return `${wholePart} ${numerator}/${denominator}`;
}

/**
 * Parse a fraction string to a decimal number
 * Handles: "3/4", "1 13/16", "25 1/2", "25", "25.5"
 */
export function fractionToDecimal(input: string): number | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  // Try parsing as a plain decimal first
  const asDecimal = parseFloat(trimmed);
  if (!isNaN(asDecimal) && !trimmed.includes('/')) {
    return asDecimal;
  }

  // Check for mixed fraction: "1 3/4" or just fraction "3/4"
  const mixedMatch = trimmed.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const denom = parseInt(mixedMatch[3], 10);
    if (denom === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (num / denom);
  }

  // Check for simple fraction: "3/4"
  const fractionMatch = trimmed.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const denom = parseInt(fractionMatch[2], 10);
    if (denom === 0) return null;
    return num / denom;
  }

  // Try parsing as decimal as fallback (handles "1.5" etc)
  if (!isNaN(asDecimal)) {
    return asDecimal;
  }

  return null;
}
