import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  column: boolean;
};

export const CardContent: React.FC<Props> = React.memo(({ column, children }) => (
  <StyledCardContent column={column}>{children}</StyledCardContent>
));

const StyledCardContent = styled.div<Props>`
  display: flex;
  flex-direction: ${(props) => (props.column ? 'column' : 'row')};
  padding: ${(props) => props.theme.spacing[3]}px ${(props) => props.theme.spacing[3]}px
    ${(props) => props.theme.spacing[3]}px ${(props) => props.theme.spacing[2]}px;
`;
