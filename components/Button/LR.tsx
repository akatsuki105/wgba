import React from 'react';
import tw, { styled } from 'twin.macro';

type Props = {
  onTouchStart: () => void;
  onTouchEnd: () => void;
};

export const LBtn: React.FC<Props> = React.memo(() => {
  return <StyledL>L</StyledL>;
});

export const RBtn: React.FC<Props> = React.memo(() => {
  return <StyledR>R</StyledR>;
});

const StyledDiv = styled.div`
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  ${tw`bg-gradient-to-b from-gray-300 to-gray-500`};
  color: ${({ theme }) => theme.color.gray[700]};
  font-weight: 700;
  ${tw`w-3/12`};
  z-index: ${({ theme }) => theme.z.lr};
`;

const StyledL = styled(StyledDiv)`
  border-radius: 0 0 15px 0;
  &:active {
    ${tw`bg-gradient-to-b from-gray-400 to-gray-600`};
  }
`;

const StyledR = styled(StyledDiv)`
  border-radius: 0 0 0 15px;
  &:active {
    ${tw`bg-gradient-to-b from-gray-400 to-gray-600`};
  }
`;
