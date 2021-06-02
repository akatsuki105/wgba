import React from 'react';
import { styled } from 'twin.macro';

type Props = React.HTMLAttributes<HTMLElement> & {
  width: number;
  height: number;
  radius?: number;
};

type CardIconProps = React.HTMLAttributes<HTMLElement> & {
  src: string | React.ReactNode;
  width: number;
  height: number;
  radius?: number;
};

export const CardIcon: React.FC<CardIconProps> = React.memo(({ src, width, height, radius }) => (
  <StyledCardIcon width={width} height={height} radius={radius}>
    {typeof src === 'string' ? (
      <img src={src} className="card-icon" width={width} height={height} />
    ) : (
      src
    )}
  </StyledCardIcon>
));

const StyledCardIcon = styled.div<Props>`
  height: ${(props) => props.height}px;
  width: ${(props) => props.width}px;

  .card-icon {
    border-radius: ${(props) => props.radius}px;
  }
`;
