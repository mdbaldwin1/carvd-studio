import { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { useProjectStore } from '../store/projectStore';
import { formatMeasurement, parseInput } from '../utils/fractions';

interface FractionInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
}

/**
 * Input component that displays decimal values as fractions (imperial)
 * or as millimeters (metric), based on project settings.
 * All values are stored internally as inches.
 */
export function FractionInput({ value, onChange, min = 0, className }: FractionInputProps) {
  const units = useProjectStore((s) => s.units);

  // Display value formatted according to units when not editing
  const [displayValue, setDisplayValue] = useState(formatMeasurement(value, units));
  const [isEditing, setIsEditing] = useState(false);

  // Update display when external value or units changes (and not currently editing)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatMeasurement(value, units));
    }
  }, [value, units, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseInput(displayValue, units);
    if (parsed !== null && parsed >= min) {
      onChange(parsed);
      setDisplayValue(formatMeasurement(parsed, units));
    } else {
      // Revert to current value if invalid
      setDisplayValue(formatMeasurement(value, units));
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
}
