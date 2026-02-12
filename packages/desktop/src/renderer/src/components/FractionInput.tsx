import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
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

  // Refs to track state for unmount cleanup (since blur doesn't fire when component unmounts)
  const isEditingRef = useRef(false);
  const displayValueRef = useRef(displayValue);
  const onChangeRef = useRef<((value: number) => void) | null>(null);
  const unitsRef = useRef(units);
  const minRef = useRef(min);

  // Keep refs in sync with state/props
  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    minRef.current = min;
  }, [min]);

  // Update display when external value or units changes (and not currently editing)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatMeasurement(value, units));
    }
  }, [value, units, isEditing]);

  // Commit value on unmount if still editing (blur doesn't fire when DOM element is removed)
  useEffect(() => {
    return () => {
      if (isEditingRef.current && onChangeRef.current) {
        const parsed = parseInput(displayValueRef.current, unitsRef.current);
        if (parsed !== null && parsed >= minRef.current) {
          onChangeRef.current(parsed);
        }
      }
    };
  }, []); // Empty deps - only runs on unmount

  const handleFocus = () => {
    setIsEditing(true);
    isEditingRef.current = true;
    // Capture the onChange callback so we call the right handler on blur/unmount
    onChangeRef.current = onChange;
  };

  const handleBlur = () => {
    setIsEditing(false);
    isEditingRef.current = false;

    const parsed = parseInput(displayValue, units);
    if (parsed !== null && parsed >= min) {
      // Use the captured onChange callback (from when focus started)
      // This ensures we update the correct entity even if selection changed
      const capturedOnChange = onChangeRef.current || onChange;
      capturedOnChange(parsed);
      setDisplayValue(formatMeasurement(parsed, units));
    } else {
      // Revert to current value if invalid
      setDisplayValue(formatMeasurement(value, units));
    }

    onChangeRef.current = null;
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
