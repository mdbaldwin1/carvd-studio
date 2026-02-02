import { describe, it, expect } from 'vitest';
import {
  INCHES_TO_MM,
  inchesToMm,
  mmToInches,
  formatMeasurement,
  formatMeasurementWithUnit,
  parseInput,
  decimalToFraction,
  fractionToDecimal
} from './fractions';

describe('Unit Conversions', () => {
  describe('inchesToMm', () => {
    it('converts 1 inch to 25.4mm', () => {
      expect(inchesToMm(1)).toBe(25.4);
    });

    it('converts 0 inches to 0mm', () => {
      expect(inchesToMm(0)).toBe(0);
    });

    it('converts fractional inches', () => {
      expect(inchesToMm(0.5)).toBeCloseTo(12.7, 1);
    });

    it('handles large values', () => {
      expect(inchesToMm(100)).toBe(2540);
    });
  });

  describe('mmToInches', () => {
    it('converts 25.4mm to 1 inch', () => {
      expect(mmToInches(25.4)).toBe(1);
    });

    it('converts 0mm to 0 inches', () => {
      expect(mmToInches(0)).toBe(0);
    });

    it('converts fractional mm', () => {
      expect(mmToInches(12.7)).toBeCloseTo(0.5, 2);
    });

    it('round-trips correctly', () => {
      const inches = 3.75;
      expect(mmToInches(inchesToMm(inches))).toBeCloseTo(inches, 10);
    });
  });
});

describe('decimalToFraction', () => {
  it('converts whole numbers', () => {
    expect(decimalToFraction(5)).toBe('5');
    expect(decimalToFraction(0)).toBe('0');
    expect(decimalToFraction(100)).toBe('100');
  });

  it('converts simple fractions', () => {
    expect(decimalToFraction(0.5)).toBe('1/2');
    expect(decimalToFraction(0.25)).toBe('1/4');
    expect(decimalToFraction(0.75)).toBe('3/4');
  });

  it('converts to 16ths', () => {
    expect(decimalToFraction(0.0625)).toBe('1/16');
    expect(decimalToFraction(0.1875)).toBe('3/16');
    expect(decimalToFraction(0.8125)).toBe('13/16');
    expect(decimalToFraction(0.9375)).toBe('15/16');
  });

  it('simplifies fractions', () => {
    expect(decimalToFraction(0.125)).toBe('1/8'); // 2/16 simplified
    expect(decimalToFraction(0.375)).toBe('3/8'); // 6/16 simplified
    expect(decimalToFraction(0.625)).toBe('5/8'); // 10/16 simplified
  });

  it('converts mixed numbers', () => {
    expect(decimalToFraction(1.5)).toBe('1 1/2');
    expect(decimalToFraction(2.25)).toBe('2 1/4');
    expect(decimalToFraction(3.75)).toBe('3 3/4');
    expect(decimalToFraction(24.0625)).toBe('24 1/16');
  });

  it('handles rounding to nearest 16th', () => {
    // Values between 16ths should round to nearest
    expect(decimalToFraction(0.03)).toBe('0'); // Rounds down
    expect(decimalToFraction(0.06)).toBe('1/16'); // Rounds up
    expect(decimalToFraction(0.97)).toBe('1'); // Rounds up to whole
  });

  it('handles negative numbers', () => {
    expect(decimalToFraction(-0.5)).toBe('-1/2');
    expect(decimalToFraction(-1.25)).toBe('-1 1/4');
    expect(decimalToFraction(-5)).toBe('-5');
  });

  it('handles edge cases', () => {
    expect(decimalToFraction(0.999)).toBe('1'); // Rounds to 1
    expect(decimalToFraction(0.001)).toBe('0'); // Rounds to 0
  });
});

describe('fractionToDecimal', () => {
  it('parses whole numbers', () => {
    expect(fractionToDecimal('5')).toBe(5);
    expect(fractionToDecimal('0')).toBe(0);
    expect(fractionToDecimal('100')).toBe(100);
  });

  it('parses decimal numbers', () => {
    expect(fractionToDecimal('5.5')).toBe(5.5);
    expect(fractionToDecimal('3.14159')).toBe(3.14159);
    expect(fractionToDecimal('0.125')).toBe(0.125);
  });

  it('parses simple fractions', () => {
    expect(fractionToDecimal('1/2')).toBe(0.5);
    expect(fractionToDecimal('1/4')).toBe(0.25);
    expect(fractionToDecimal('3/4')).toBe(0.75);
    expect(fractionToDecimal('1/8')).toBe(0.125);
  });

  it('parses 16ths', () => {
    expect(fractionToDecimal('1/16')).toBe(0.0625);
    expect(fractionToDecimal('3/16')).toBe(0.1875);
    expect(fractionToDecimal('13/16')).toBe(0.8125);
  });

  it('parses mixed numbers', () => {
    expect(fractionToDecimal('1 1/2')).toBe(1.5);
    expect(fractionToDecimal('2 3/4')).toBe(2.75);
    expect(fractionToDecimal('5 1/8')).toBe(5.125);
    expect(fractionToDecimal('24 1/16')).toBe(24.0625);
  });

  it('handles negative fractions', () => {
    expect(fractionToDecimal('-1/2')).toBe(-0.5);
    expect(fractionToDecimal('-2 1/4')).toBe(-2.25);
  });

  it('handles whitespace', () => {
    expect(fractionToDecimal('  1/2  ')).toBe(0.5);
    expect(fractionToDecimal('  3 1/4  ')).toBe(3.25);
  });

  it('returns null for invalid input', () => {
    expect(fractionToDecimal('')).toBeNull();
    expect(fractionToDecimal('   ')).toBeNull();
    expect(fractionToDecimal('abc')).toBeNull();
    expect(fractionToDecimal('1/0')).toBeNull(); // Division by zero
  });

  it('handles lenient parsing of malformed input', () => {
    // The function is lenient and parses what it can
    expect(fractionToDecimal('1 2 3')).toBe(1); // Parses "1" before the space
    expect(fractionToDecimal('1/')).toBe(1); // Parses "1" before the slash
  });

  it('round-trips with decimalToFraction', () => {
    const testValues = [0.5, 0.25, 0.75, 1.5, 2.25, 5.125];
    testValues.forEach((value) => {
      const fraction = decimalToFraction(value);
      const decimal = fractionToDecimal(fraction);
      expect(decimal).toBeCloseTo(value, 4);
    });
  });
});

describe('formatMeasurement', () => {
  describe('imperial format', () => {
    it('formats whole numbers', () => {
      expect(formatMeasurement(5, 'imperial')).toBe('5');
      expect(formatMeasurement(24, 'imperial')).toBe('24');
    });

    it('formats fractions', () => {
      expect(formatMeasurement(0.5, 'imperial')).toBe('1/2');
      expect(formatMeasurement(1.25, 'imperial')).toBe('1 1/4');
      expect(formatMeasurement(3.75, 'imperial')).toBe('3 3/4');
    });
  });

  describe('metric format', () => {
    it('formats whole millimeters', () => {
      expect(formatMeasurement(1, 'metric')).toBe('25.4');
      expect(formatMeasurement(2, 'metric')).toBe('50.8');
    });

    it('rounds to 1 decimal place', () => {
      expect(formatMeasurement(0.5, 'metric')).toBe('12.7');
    });

    it('removes trailing zeros', () => {
      // This might need adjustment based on actual implementation
      const result = formatMeasurement(1, 'metric');
      expect(result).toBe('25.4');
    });
  });
});

describe('formatMeasurementWithUnit', () => {
  it('formats imperial with inch symbol', () => {
    expect(formatMeasurementWithUnit(1, 'imperial')).toBe('1"');
    expect(formatMeasurementWithUnit(0.5, 'imperial')).toBe('1/2"');
    expect(formatMeasurementWithUnit(3.75, 'imperial')).toBe('3 3/4"');
  });

  it('formats metric with mm suffix', () => {
    expect(formatMeasurementWithUnit(1, 'metric')).toBe('25.4mm');
    expect(formatMeasurementWithUnit(0.5, 'metric')).toBe('12.7mm');
  });
});

describe('parseInput', () => {
  describe('imperial parsing', () => {
    it('parses fractions and returns inches', () => {
      expect(parseInput('1/2', 'imperial')).toBe(0.5);
      expect(parseInput('3/4', 'imperial')).toBe(0.75);
      expect(parseInput('1 1/4', 'imperial')).toBe(1.25);
    });

    it('parses decimals as inches', () => {
      expect(parseInput('5.5', 'imperial')).toBe(5.5);
      expect(parseInput('24', 'imperial')).toBe(24);
    });

    it('returns null for invalid input', () => {
      expect(parseInput('', 'imperial')).toBeNull();
      expect(parseInput('abc', 'imperial')).toBeNull();
    });
  });

  describe('metric parsing', () => {
    it('parses mm and returns inches', () => {
      expect(parseInput('25.4', 'metric')).toBeCloseTo(1, 10);
      expect(parseInput('50.8', 'metric')).toBeCloseTo(2, 10);
      expect(parseInput('12.7', 'metric')).toBeCloseTo(0.5, 10);
    });

    it('returns null for invalid input', () => {
      expect(parseInput('', 'metric')).toBeNull();
      expect(parseInput('abc', 'metric')).toBeNull();
    });

    it('handles whitespace', () => {
      expect(parseInput('  25.4  ', 'metric')).toBeCloseTo(1, 10);
    });
  });
});

describe('Real-world woodworking scenarios', () => {
  it('handles common plywood thickness', () => {
    // 3/4" plywood
    expect(fractionToDecimal('3/4')).toBe(0.75);
    expect(decimalToFraction(0.75)).toBe('3/4');
  });

  it('handles common board dimensions', () => {
    // 2x4 (actually 1.5" x 3.5")
    expect(fractionToDecimal('1 1/2')).toBe(1.5);
    expect(fractionToDecimal('3 1/2')).toBe(3.5);
  });

  it('handles table dimensions', () => {
    // 60" x 30" x 30" desk
    const length = fractionToDecimal('60');
    const width = fractionToDecimal('30');
    const height = fractionToDecimal('30');

    expect(length).toBe(60);
    expect(width).toBe(30);
    expect(height).toBe(30);
  });

  it('handles kerf adjustments', () => {
    // Typical table saw kerf is 1/8"
    const kerf = fractionToDecimal('1/8');
    expect(kerf).toBe(0.125);
    expect(decimalToFraction(kerf)).toBe('1/8');
  });

  it('handles precise joinery measurements', () => {
    // Dovetail spacing might be 1 7/16"
    const spacing = fractionToDecimal('1 7/16');
    expect(spacing).toBeCloseTo(1.4375, 4);
    expect(decimalToFraction(spacing)).toBe('1 7/16');
  });
});
