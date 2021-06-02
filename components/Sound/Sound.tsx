import Image from 'next/image';
import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  mute: boolean;
  toggleSound: () => void;
  setVolume: (v: number) => void;
};

export const Sound: React.FC<Props> = React.memo(({ mute, toggleSound, setVolume }) => (
  <StyledDiv className="flex">
    <div>
      <Image
        src={mute ? '/images/volume_off.svg' : '/images/volume_on.svg'}
        width="36"
        height="36"
        onClick={toggleSound}
      />
    </div>
    <input
      id="volume"
      type="range"
      min="0"
      max="1"
      value="1"
      step="any"
      onChange={(e) => setVolume(Number(e.target.value))}
      disabled={mute}
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
