import React, { useContext, useEffect, useRef, useState } from 'react';
import tw, { styled } from 'twin.macro';
import { BaseButton, LBtn, MenuBtn, RBtn, StartSelectBtn } from 'components/Button';
import { Menu, MenuItem } from 'components/Menu';
import { FlexBox } from 'components/atoms/FlexBox';
import { canvasSize, Joystick } from 'components/atoms/Joystick';
import { JoystickContext } from 'contexts';
import { useModal } from 'hooks';
import { GameBoyAdvance } from 'src/core/gba';
import { romInfoTable } from 'src/rom';
import { getROMHeaders, ROMHeader } from 'src/storage';

type Props = {
  gba?: GameBoyAdvance;
  mute: boolean;
  turnOn: (f: File | ROMHeader) => void;
  turnOff: () => void;
  togglePause: () => void;
  toggleSound: () => void;
};

export const Controller: React.FC<Props> = React.memo(
  ({ gba, mute, turnOn, turnOff, togglePause, toggleSound }) => {
    const ref = useRef<HTMLInputElement>(null);

    const [romHeaders, setROMHeaders] = useState<ROMHeader[]>([]);
    useEffect(() => {
      getROMHeaders().then((val) => {
        setROMHeaders(val);
      });
    }, []);

    const [_, openROMModal] = useModal(
      <Menu>
        {romHeaders.map((h) => {
          const romdata = romInfoTable[h.hash];
          const title = romdata ? romdata.caption || romdata.title : h.title;

          return (
            <MenuItem key={h.hash} onClick={() => turnOn(h)}>
              {title}
            </MenuItem>
          );
        })}
      </Menu>,
      'romModal',
    );
    const [__, openMenuModal] = useModal(
      <Menu>
        <MenuItem onClick={() => openROMModal()}>Select loaded ROM</MenuItem>
        <MenuItem onClick={() => ref.current?.click()}>Add new ROM</MenuItem>
        <MenuItem onClick={turnOff}>Quit Game</MenuItem>
        <MenuItem onClick={toggleSound}>{mute ? 'Play sound' : 'Mute'}</MenuItem>
        <MenuItem>Cancel</MenuItem>
      </Menu>,
      'menuModal',
    );
    const { up, down, left, right, set } = useContext(JoystickContext);

    useEffect(() => {
      gba?.keypad.setGBAKey('UP', up ? 'keydown' : 'keyup');
    }, [up]); // eslint-disable-line
    useEffect(() => {
      gba?.keypad.setGBAKey('DOWN', down ? 'keydown' : 'keyup');
    }, [down]); // eslint-disable-line
    useEffect(() => {
      gba?.keypad.setGBAKey('LEFT', left ? 'keydown' : 'keyup');
    }, [left]); // eslint-disable-line
    useEffect(() => {
      gba?.keypad.setGBAKey('RIGHT', right ? 'keydown' : 'keyup');
    }, [right]); // eslint-disable-line

    return (
      <StyledDiv>
        <StyledFlex>
          <LBtn
            onTouchStart={() => gba?.keypad.setGBAKey('L', 'keydown')}
            onTouchEnd={() => gba?.keypad.setGBAKey('L', 'keyup')}
          />
          <FlexBox className="w-6/12" center>
            <img src="/images/gba_logo.png" width="140px" height="18px" />
          </FlexBox>
          <RBtn
            onTouchStart={() => gba?.keypad.setGBAKey('R', 'keydown')}
            onTouchEnd={() => gba?.keypad.setGBAKey('R', 'keyup')}
          />
        </StyledFlex>

        <VolumeContainer center>
          <PauseBtn onClick={togglePause} />
        </VolumeContainer>

        <FlexBox>
          <DpadContainer column>
            <Joystick size={canvasSize} set={set} />
          </DpadContainer>

          <DpadContainer column>
            <ABtn
              onTouchStart={() => gba?.keypad.setGBAKey('A', 'keydown')}
              onTouchMove={(e) => e.preventDefault()}
              onTouchEnd={() => gba?.keypad.setGBAKey('A', 'keyup')}
            >
              A
            </ABtn>
            <BBtn
              onTouchStart={() => gba?.keypad.setGBAKey('B', 'keydown')}
              onTouchMove={(e) => e.preventDefault()}
              onTouchEnd={() => gba?.keypad.setGBAKey('B', 'keyup')}
            >
              B
            </BBtn>
          </DpadContainer>
        </FlexBox>

        <StyledFlexBox>
          <div tw="w-1/12"></div>
          <MenuBtn onClick={openMenuModal}>Menu</MenuBtn>
          <div tw="w-1/12"></div>
          <StartSelectBtn
            onTouchStart={() => gba?.keypad.setGBAKey('SELECT', 'keydown')}
            onTouchEnd={() => gba?.keypad.setGBAKey('SELECT', 'keyup')}
          >
            Select
          </StartSelectBtn>
          <div tw="w-2/12"></div>
          <StartSelectBtn
            onTouchStart={() => gba?.keypad.setGBAKey('START', 'keydown')}
            onTouchEnd={() => gba?.keypad.setGBAKey('START', 'keyup')}
          >
            Start
          </StartSelectBtn>
        </StyledFlexBox>

        <StyledInput
          type="file"
          accept=".gba,.gb,.gbc"
          ref={ref}
          onChange={(e) => {
            e.target.files && turnOn(e.target.files[0]);
          }}
        />
      </StyledDiv>
    );
  },
);

const StyledDiv = styled.div`
  user-select: none;
  ${tw`bg-gradient-to-b from-purple-700 to-purple-900`}

  /* PC */
  @media (min-width: ${({ theme }) => `${theme.breakpoints.lg}px`}) {
    height: 100%;
  }

  /* mobile */
  @media (max-width: ${({ theme }) => `${theme.breakpoints.lg}px`}) {
    flex: 2;
  }
`;

const StyledFlex = styled(FlexBox)`
  width: 100%;
  display: inline-flex;
  background-color: ${({ theme }) => theme.color.old.frame};
`;

const VolumeContainer = styled(FlexBox)`
  padding: 16px 0;
`;

const PauseBtn = styled(BaseButton)`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  z-index: ${({ theme }) => theme.z.mobileBtn};
`;

const DpadContainer = styled(FlexBox)`
  ${tw`w-6/12`}
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ABtn = styled(BaseButton)`
  width: 75px;
  height: 75px;
  border-radius: 50%;
  margin-left: auto;
  margin-right: 4vw;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BBtn = styled(ABtn)`
  margin-right: 30%;
`;

const StyledFlexBox = styled(FlexBox)`
  margin: 32px auto;
`;

const StyledInput = styled.input`
  opacity: 0 !important;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
`;
