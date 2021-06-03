import React from 'react';
import { styled } from 'twin.macro';

interface ModalTitleProps {
  text?: string;
}

export const ModalTitle: React.FC<ModalTitleProps> = ({ text }) => (
  <StyledModalTitle>{text}</StyledModalTitle>
);

const StyledModalTitle = styled.div`
  align-items: center;
  color: ${(props) => props.theme.color.gray[600]};
  display: flex;
  font-size: 18px;
  font-weight: 700;
  height: ${(props) => props.theme.topBarSize}px;
  justify-content: center;
`;
