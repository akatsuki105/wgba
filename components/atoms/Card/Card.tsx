import React from 'react';
import { styled } from 'twin.macro';

export const Card: React.FC = React.memo(({ children }) => <StyledCard>{children}</StyledCard>);

const StyledCard = styled.div`
  background: ${(props) => props.theme.color.grey[300]};
  border: 0px;
  border-radius: ${(props) => props.theme.radius}px;
  box-shadow: inset 1px 1px 0px ${(props) => props.theme.color.grey[100]};
  flex: 1;
`;
