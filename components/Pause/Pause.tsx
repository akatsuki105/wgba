import Image from 'next/image';
import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  isRun: boolean;
  paused: boolean;
  toggle: () => void;
};

export const Pause: React.FC<Props> = React.memo(({ isRun, paused, toggle }) => (
  <StyledDiv>
    {paused ? (
      <Image src="/images/play.svg" width="36" height="36" onClick={() => isRun && toggle()} />
    ) : (
      <Image src="/images/pause.svg" width="36" height="36" onClick={() => isRun && toggle()} />
    )}
  </StyledDiv>
));

const StyledDiv = styled.div`
  border: 0px solid ${(props) => props.theme.color.old.border};
  border-top: 2px solid ${(props) => props.theme.color.old.borderTop};
  border-bottom: 2px solid ${(props) => props.theme.color.old.borderBottom};
  border-radius: 24px;
  padding: 8px;
  margin: 8px;
`;
