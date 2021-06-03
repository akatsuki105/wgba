import React from 'react';
import { styled } from 'twin.macro';

type Props = React.HTMLAttributes<HTMLElement> & {
  column?: boolean;
  center?: boolean;
};

export const FlexBox: React.FC<Props> = React.memo((props) => {
  return (
    <StyledDiv column={props.column} center={props.center} {...props}>
      {props.children}
    </StyledDiv>
  );
});

const StyledDiv = styled.div<Props>`
  display: flex;
  flex-direction: ${(props) => (props.column ? 'column' : 'row')};
  ${(props) => {
    return props.center ? 'display: flex; align-items: center; justify-content: center;' : null;
  }}
`;
