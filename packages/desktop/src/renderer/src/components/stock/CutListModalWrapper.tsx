import { useUIStore } from '../../store/uiStore';
import { CutListModal } from './CutListModal';

export function CutListModalWrapper() {
  const cutListModalOpen = useUIStore((s) => s.cutListModalOpen);
  const closeCutListModal = useUIStore((s) => s.closeCutListModal);

  return <CutListModal isOpen={cutListModalOpen} onClose={closeCutListModal} />;
}
