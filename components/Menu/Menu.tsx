import React from 'react';
import tw, { styled } from 'twin.macro';
import { FlexBox } from 'components/atoms/FlexBox';
import { Modal, ModalContent } from 'components/atoms/Modal';

type Props = {
  children: Parameters<typeof React.cloneElement>[0][];
  onDismiss?: () => void;
};

export const Menu: React.FC<Props> = React.memo(({ onDismiss = () => {}, children }) => {
  return (
    <Modal>
      <StyledModalContent>
        <div className="bg-white border border-gray-300 overflow-hidden rounded-md">
          <ul className="divide-y divide-gray-300">
            {React.Children.map(children, (child) => {
              // eslint-disable-next-line
              // @ts-ignore
              return React.cloneElement(child, { onDismiss });
            })}
          </ul>
        </div>
      </StyledModalContent>
    </Modal>
  );
});

const StyledModalContent = styled(ModalContent)`
  ${tw`p-2`}
`;

type ItemProps = {
  onClick?: () => void;
  onDismiss?: () => void;
};

export const MenuItem: React.FC<ItemProps> = React.memo(({ onClick, onDismiss, children }) => {
  const old = onClick;
  onClick = old
    ? () => {
        onDismiss && onDismiss();
        old && old();
      }
    : onDismiss;

  return (
    <li className="px-6 py-4 font-medium text-indigo-500" onClick={onClick}>
      <FlexBox center>{children}</FlexBox>
    </li>
  );
});
