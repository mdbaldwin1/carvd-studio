interface NoSelectionPropertiesProps {
  modKey: string;
}

export function NoSelectionProperties({ modKey }: NoSelectionPropertiesProps) {
  return (
    <aside className="properties-panel">
      <h2>Properties</h2>
      <div className="properties-card">
        <p className="text-text-muted text-xs italic">Select a part or group to edit properties</p>
        <p className="text-[11px] text-text-muted mt-1">Shift+click to select multiple, {modKey}+drag for box select</p>
      </div>
    </aside>
  );
}
