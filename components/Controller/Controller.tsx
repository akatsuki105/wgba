import React, { useContext, useEffect, useRef } from 'react';
import tw, { styled } from 'twin.macro';
import { LBtn, RBtn } from 'components/Button';
import { Menu, MenuItem } from 'components/Menu';
import { Button } from 'components/atoms/Button';
import { FlexBox } from 'components/atoms/FlexBox';
import { Joystick } from 'components/atoms/Joystick';
import { JoystickContext } from 'contexts';
import { useModal } from 'hooks';
import { GameBoyAdvance } from 'src/gba';

type Props = {
  gba?: GameBoyAdvance;
  isRun: boolean;
  mute: boolean;
  turnOn: (f: File) => void;
  turnOff: () => void;
  togglePause: () => void;
  toggleSound: () => void;
};

export const Controller: React.FC<Props> = React.memo(
  ({ gba, isRun, mute, turnOn, turnOff, togglePause, toggleSound }) => {
    const h = (window.innerHeight * 54) / 100;
    const m = h - 380 > 0 ? h - 380 : 0;
    const ref = useRef<HTMLInputElement>(null);
    const [_, openModal] = useModal(
      <Menu>
        {/* <MenuItem onClick={() => {}}>Load ROM</MenuItem> */}
        <MenuItem onClick={() => ref.current?.click()}>Add new ROM</MenuItem>
        <MenuItem onClick={turnOff}>Quit Game</MenuItem>
        <MenuItem onClick={toggleSound}>{mute ? 'Play sound' : 'Mute'}</MenuItem>
        <MenuItem>Cancel</MenuItem>
      </Menu>,
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
      <StyledDiv h={h}>
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
            <Joystick size={240} set={set} />
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

        <StyledFlexBox m={m}>
          <div tw="w-1/12"></div>
          <MenuBtn onClick={openModal}>Menu</MenuBtn>
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
          accept=".gba"
          ref={ref}
          onChange={(e) => {
            e.target.files && turnOn(e.target.files[0]);
          }}
        />
      </StyledDiv>
    );
  },
);

const StyledDiv = styled.div<{ h: number }>`
  user-select: none;
  height: ${(props) => props.h}px;
  ${tw`bg-gradient-to-b from-purple-700 to-purple-900`}
`;

const StyledFlex = styled(FlexBox)`
  background-color: ${({ theme }) => theme.color.old.frame};
`;

const VolumeContainer = styled(FlexBox)`
  height: 2%;
`;

const StyledBtn = styled(Button)`
  user-select: none;
  font-weight: bold;
  color: ${({ theme }) => theme.color.gba.text};
  background-image: linear-gradient(
    ${({ theme }) => theme.color.gba.btn0} 0%,
    ${({ theme }) => theme.color.gba.btn100} 100%
  );
  text-shadow: 1px 1px 1px ${({ theme }) => theme.color.gba.textShadow};
  box-shadow: inset 0 2px 0 ${({ theme }) => theme.color.gba.boxShadow} 0 2px 2px
    rgba(0, 0, 0, 0.19);
  border-bottom: solid 2px ${({ theme }) => theme.color.gba.btnb};

  &:active {
    box-shadow: inset 0 1px 0 ${({ theme }) => theme.color.gba.boxShadowA} 0 2px 2px
      rgba(0, 0, 0, 0.19);
    border-bottom: none;
    transform: translateY(1px);
  }
`;

const PauseBtn = styled(StyledBtn)`
  margin-top: 16%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  z-index: ${({ theme }) => theme.z.mobileBtn};
`;

const DpadContainer = styled(FlexBox)`
  ${tw`w-6/12`}
  height: 78%;
  padding-top: 10%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ABtn = styled(StyledBtn)`
  width: 16vw;
  height: 16vw;
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

const StyledFlexBox = styled(FlexBox)<{ m: number }>`
  margin-top: ${(props) => props.m}px;
  margin-bottom: 0;
`;

const MenuBtn = styled(StyledBtn)`
  ${tw`w-1/12`}
  height: 20px;
  border-radius: 6px;
  display: flex;
  font-size: 10px;
  align-items: center;
  justify-content: center;
  user-select: none;
`;

const StartSelectBtn = styled(StyledBtn)`
  ${tw`w-2/12`}
  height: 20px;
  margin-top: -20px;
  display: flex;
  border-radius: 6px;
  font-size: 12px;
  align-items: center;
  justify-content: center;
  user-select: none;
  z-index: ${({ theme }) => theme.z.mobileBtn};
`;

const StyledInput = styled.input`
  opacity: 0 !important;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
`;
