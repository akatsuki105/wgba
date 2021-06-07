import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  className?: string;
};

export const ModalContent: React.FC<Props> = ({ className, children }) => {
  return <StyledModalContent className={className}>{children}</StyledModalContent>;
};

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  max-height: 100%;
  overflow-y: scroll;
  @media (max-width: ${(props) => props.theme.breakpoints.md}px) {
    flex: 1;
    overflow: auto;
  }
`;
