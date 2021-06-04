import React from 'react';
import { FlexBox } from 'components/atoms/FlexBox';
import { Modal } from 'components/atoms/Modal';

type Props = {
  children: Parameters<typeof React.cloneElement>[0][];
  onDismiss?: () => void;
};

export const Menu: React.FC<Props> = React.memo(({ onDismiss = () => {}, children }) => {
  return (
    <Modal className="bg-white border border-gray-300 overflow-hidden rounded-md">
      <ul className="divide-y divide-gray-300">
        {React.Children.map(children, (child) => {
          // eslint-disable-next-line
          // @ts-ignore
          return React.cloneElement(child, { onDismiss });
        })}
      </ul>
    </Modal>
  );
});

type ItemProps = {
  onClick?: () => void;
  onDismiss?: () => void;
};

export const MenuItem: React.FC<ItemProps> = React.memo(({ onClick, onDismiss, children }) => {
  onClick = onClick || onDismiss;

  return (
    <li className="px-6 py-4" onClick={onClick}>
      <FlexBox center>{children}</FlexBox>
    </li>
  );
});
