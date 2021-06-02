import Image from 'next/image';
import React, { useRef } from 'react';
import { styled } from 'twin.macro';

type Props = {
  isRun: boolean;
  turnOn: (f: File) => void;
  turnOff: () => void;
};

export const Power: React.FC<Props> = React.memo(({ isRun, turnOn, turnOff }) => {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <StyledDiv>
      <Image src="/images/power.svg" width="36" height="36" onClick={() => ref.current?.click()} />
      <input
        type="file"
        accept=".gba"
        ref={ref}
        onClick={() => isRun && turnOff()}
        onChange={(e) => {
          e.target.files && turnOn(e.target.files[0]);
        }}
      />
    </StyledDiv>
  );
});

const StyledDiv = styled.div`
  border: 0px solid ${(props) => props.theme.color.old.border};
  border-top: 2px solid ${(props) => props.theme.color.old.borderTop};
  border-bottom: 2px solid ${(props) => props.theme.color.old.borderBottom};
  border-radius: 24px;
  padding: 8px;
  margin: 8px;
`;
