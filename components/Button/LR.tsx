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
  color: ${({ theme }) => theme.color.gray[500]};
  background-color: ${({ theme }) => theme.color.white};
  ${tw`w-3/12`};
`;

const StyledL = styled(StyledDiv)`
  border-radius: 0 0 15px 0;
`;

const StyledR = styled(StyledDiv)`
  border-radius: 0 0 0 15px;
`;
