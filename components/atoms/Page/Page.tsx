import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  className?: string;
};

export const Page: React.FC<Props> = React.memo(({ className, children }) => {
  const h = window.innerHeight;

  return (
    <StyledPage h={h} className={className}>
      {children}
    </StyledPage>
  );
});

const StyledPage = styled.div<{ h: number }>`
  align-items: center;
  display: flex;
  flex-direction: column;
  min-height: ${(props) => props.h}px;
`;
