import { useCallback, useContext } from 'react';
import { Context } from 'contexts/Modals';

export const useModal = (
  modal: React.ReactNode,
  key?: string,
): [boolean, () => void, () => void] => {
  const { isOpen, onDismiss, onPresent } = useContext(Context);

  const handlePresent = useCallback(() => {
    onPresent(modal, key);
  }, [key, modal, onPresent]);

  return [isOpen || false, handlePresent, onDismiss];
};
