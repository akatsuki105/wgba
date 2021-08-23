import React from 'react';
import { styled } from 'twin.macro';

export const Screen = React.forwardRef((_, ref: React.Ref<HTMLCanvasElement>) => (
  <StyledCanvas width="240" height="160" ref={ref}></StyledCanvas>
));

const StyledCanvas = styled.canvas`
  image-rendering: pixelated;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: ${(props) => `${props.theme.breakpoints.md}px`};
`;
