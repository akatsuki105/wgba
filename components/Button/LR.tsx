import React from 'react';
import tw, { styled } from 'twin.macro';
import { BaseButton } from './Base';

type Props = {
  onTouchStart: () => void;
  onTouchEnd: () => void;
};

export const LBtn: React.FC<Props> = React.memo((props) => {
  return <StyledL {...props}>L</StyledL>;
});

export const RBtn: React.FC<Props> = React.memo((props) => {
  return <StyledR {...props}>R</StyledR>;
});

const StyledDiv = styled(BaseButton)`
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  ${tw`w-3/12`};
  z-index: ${({ theme }) => theme.z.mobileBtn};
`;

const StyledL = styled(StyledDiv)`
  border-radius: 0 0 15px 0;
`;

const StyledR = styled(StyledDiv)`
  border-radius: 0 0 0 15px;
`;
