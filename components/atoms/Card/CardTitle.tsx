import React from 'react';
import { styled } from 'twin.macro';

interface CardTitleProps {
  text?: string | React.ReactNode;
  fontSize?: number;
}

export const CardTitle: React.FC<CardTitleProps> = React.memo(({ text, fontSize = 14 }) => (
  <StyledCardTitle fontSize={fontSize}>{text}</StyledCardTitle>
));

const StyledCardTitle = styled.div<{ fontSize: number }>`
  color: ${(props) => props.theme.color.gray[800]};
  font-size: ${(props) => props.fontSize}px;
  font-weight: ${(props) => props.theme.fontWeight};
  padding: ${(props) => props.theme.spacing[2]}px 0px 0px ${(props) => props.theme.spacing[3]}px;
`;
