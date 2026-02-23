import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';

interface GroupSummary {
  id: string;
  name: string;
}

interface SingleGroupPropertiesProps {
  group: GroupSummary;
  memberCount: number;
  isReferenceActive: boolean;
  canUseAssemblies: boolean;
  canRemoveFromParent: boolean;
  modKey: string;
  onRenameGroup: (groupId: string, name: string) => void;
  onCenterView: () => void;
  onSaveAsAssembly: () => void;
  onToggleReference: () => void;
  onRemoveFromParent: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

export function SingleGroupProperties({
  group,
  memberCount,
  isReferenceActive,
  canUseAssemblies,
  canRemoveFromParent,
  modKey,
  onRenameGroup,
  onCenterView,
  onSaveAsAssembly,
  onToggleReference,
  onRemoveFromParent,
  onUngroup,
  onDeleteGroup
}: SingleGroupPropertiesProps) {
  return (
    <aside className="properties-panel">
      <h2>Group Properties</h2>
      <div className="properties-card">
        <div className="property-group">
          <Label>Name</Label>
          <Input type="text" value={group.name} onChange={(e) => onRenameGroup(group.id, e.target.value)} />
        </div>

        <div className="property-group">
          <p className="text-sm mb-3 text-text">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="property-group flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={onCenterView}>
            Center View
          </Button>
          <Button variant="secondary" size="sm" onClick={onSaveAsAssembly} disabled={!canUseAssemblies}>
            Save as Assembly
          </Button>
          <Button variant="secondary" size="sm" onClick={onToggleReference}>
            {isReferenceActive ? 'Clear Reference' : 'Set as Reference'}
          </Button>
        </div>

        {canRemoveFromParent && (
          <div className="property-group">
            <Button variant="secondary" size="sm" onClick={() => onRemoveFromParent(group.id)}>
              Remove from Group
            </Button>
          </div>
        )}

        <div className="property-group flex gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => onUngroup(group.id)}>
            Ungroup
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDeleteGroup(group.id)}>
            Delete Group
          </Button>
        </div>
        <p className="text-[11px] text-text-muted mt-1">
          Double-click group to edit individual parts
          <br />
          {modKey}+Shift+G to ungroup
        </p>
      </div>
    </aside>
  );
}
