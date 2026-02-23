import { Assembly } from '../../types';
import { LibraryDetailRow } from '../common/library/LibraryDetailRow';
import { AssemblyPartsList } from './AssemblyPartsList';

interface AssemblyDetailsProps {
  assembly: Assembly;
  units: 'imperial' | 'metric';
  showMetadataRows?: boolean;
  showDescriptionCard?: boolean;
  partsTitle?: string;
  maxVisibleParts?: number;
  partsMaxHeightClassName?: string;
}

export function AssemblyDetails({
  assembly,
  units,
  showMetadataRows = false,
  showDescriptionCard = false,
  partsTitle = `Parts (${assembly.parts.length})`,
  maxVisibleParts,
  partsMaxHeightClassName
}: AssemblyDetailsProps) {
  return (
    <>
      {showDescriptionCard && assembly.description && (
        <div className="mb-4 p-3 bg-bg rounded-md">
          <p className="m-0 text-[13px] text-text-muted leading-relaxed">{assembly.description}</p>
        </div>
      )}

      {showMetadataRows && (
        <>
          {assembly.description && <LibraryDetailRow label="Description" value={assembly.description} />}
          <LibraryDetailRow label="Parts" value={assembly.parts.length} />
          {assembly.groups.length > 0 && <LibraryDetailRow label="Groups" value={assembly.groups.length} />}
          <LibraryDetailRow label="Created" value={new Date(assembly.createdAt).toLocaleDateString()} />
          <LibraryDetailRow label="Modified" value={new Date(assembly.modifiedAt).toLocaleDateString()} />
        </>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <span className="text-xs text-text-muted shrink-0 block mb-3">{partsTitle}</span>
        <AssemblyPartsList
          parts={assembly.parts}
          units={units}
          maxVisibleParts={maxVisibleParts}
          maxHeightClassName={partsMaxHeightClassName}
          itemClassName={
            maxVisibleParts
              ? 'flex justify-between items-center py-1.5 px-2.5 bg-bg rounded mb-1'
              : 'flex justify-between items-center py-2 px-3 bg-bg rounded mb-1 last:mb-0'
          }
        />
      </div>
    </>
  );
}
