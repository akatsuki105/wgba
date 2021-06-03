import React from 'react';
import { styled } from 'twin.macro';

export const Screen = React.forwardRef((_, ref: React.Ref<HTMLCanvasElement>) => (
  <StyledCanvas width="240" height="160" ref={ref}></StyledCanvas>
));

const StyledCanvas = styled.canvas`
  transform: scale(3); /* fast due to GPU */
  transform-origin: 50% 0%;
  image-rendering: pixelated;
`;
