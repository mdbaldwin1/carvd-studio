import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { useAssemblyLibrary } from '../../hooks/useAssemblyLibrary';
import { SaveAssemblyModal } from './SaveAssemblyModal';
import { Assembly } from '../../types';

export function SaveAssemblyModalWrapper() {
  const saveAssemblyModalOpen = useUIStore((s) => s.saveAssemblyModalOpen);
  const closeSaveAssemblyModal = useUIStore((s) => s.closeSaveAssemblyModal);
  const addAssembly = useProjectStore((s) => s.addAssembly);
  const { addAssembly: addToLibrary } = useAssemblyLibrary();

  const handleSave = (assembly: Assembly, addToLibrary_: boolean) => {
    addAssembly(assembly);
    if (addToLibrary_) {
      addToLibrary(assembly);
    }
  };

  return <SaveAssemblyModal isOpen={saveAssemblyModalOpen} onClose={closeSaveAssemblyModal} onSave={handleSave} />;
}
