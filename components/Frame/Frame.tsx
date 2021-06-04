import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  fps?: number;
};

export const Frame: React.FC<Props> = React.memo(({ fps, children }) => (
  <StyledDiv>
    {fps ? <FPS>FPS: {fps}</FPS> : null}
    {children}
  </StyledDiv>
));

const StyledDiv = styled.div`
  /* PC */
  @media (min-width: ${({ theme }) => `${theme.breakpoints.lg}px`}) {
    margin-top: 4vh;
    margin-left: auto;
    margin-right: auto;
    width: 720px;
    height: 480px;
    border: 40px solid ${(props) => props.theme.color.old.frame};
    border-radius: 20px;
  }

  /* mobile */
  @media (max-width: ${({ theme }) => `${theme.breakpoints.lg}px`}) {
    background-color: ${({ theme }) => theme.color.black};
    width: 100vw;
    height: 50vh;
    display: flex;
    align-items: center;
  }
`;

const FPS = styled.div`
  position: fixed;
  top: 4px;
  left: 4px;
  color: ${({ theme }) => theme.color.white};
`;
