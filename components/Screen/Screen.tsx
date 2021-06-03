import React from 'react';
import { styled } from 'twin.macro';

export const Screen = React.forwardRef((_, ref: React.Ref<HTMLCanvasElement>) => (
  <StyledCanvas width="240" height="160" ref={ref}></StyledCanvas>
));

const StyledCanvas = styled.canvas`
  image-rendering: pixelated;

  /* PC */
  @media (min-width: ${({ theme }) => `${theme.breakpoints.lg}px`}) {
    transform: scale(3); /* fast due to GPU */
    transform-origin: 50% 0%;
  }

  /* mobile */
  @media (max-width: ${({ theme }) => `${theme.breakpoints.lg}px`}) {
    width: 100%;
  }
`;
