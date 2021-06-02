import React from 'react';
import { styled } from 'twin.macro';

export const Page: React.FC = React.memo(({ children }) => <StyledPage>{children}</StyledPage>);

const StyledPage = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh);
`;
