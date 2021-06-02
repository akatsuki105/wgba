import Image from 'next/image';
import React, { RefObject } from 'react';
import { styled } from 'twin.macro';

type Props = {
  isRun: boolean;
  ref: RefObject<HTMLCanvasElement>;
};

export const Maximize: React.FC<Props> = React.memo(({ isRun, ref }) => (
  <StyledDiv>
    <Image
      src="/images/maximize.svg"
      width="36"
      height="36"
      onClick={() => isRun && ref.current?.requestFullscreen()}
    />
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
