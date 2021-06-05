import React, { useContext, useEffect, useRef } from 'react';
import tw, { styled } from 'twin.macro';
import { LBtn, RBtn } from 'components/Button';
import { Menu, MenuItem } from 'components/Menu';
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
            <Joystick size={240} set={set} />
          </DpadContainer>

          <ABContainer column>
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
          </ABContainer>
        </FlexBox>

        <FlexBox>
          <div tw="w-1/12"></div>
          <MenuBtn onClick={openModal}>Menu</MenuBtn>
          <div tw="w-1/12"></div>
          <SelectBtn
            onTouchStart={() => gba?.keypad.setGBAKey('SELECT', 'keydown')}
            onTouchEnd={() => gba?.keypad.setGBAKey('SELECT', 'keyup')}
          >
            Select
          </SelectBtn>
          <div tw="w-2/12"></div>
          <StartBtn
            onTouchStart={() => gba?.keypad.setGBAKey('START', 'keydown')}
            onTouchEnd={() => gba?.keypad.setGBAKey('START', 'keyup')}
          >
            Start
          </StartBtn>
        </FlexBox>

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

const StyledDiv = styled.div`
  height: 50vh;
  ${tw`bg-gradient-to-b from-purple-700 to-purple-900`}
`;

const StyledFlex = styled(FlexBox)`
  background-color: ${({ theme }) => theme.color.old.frame};
`;

const VolumeContainer = styled(FlexBox)`
  height: 1vh;
`;

const PauseBtn = styled.div`
  ${tw`bg-gradient-to-b from-gray-300 to-gray-500`};
  margin-top: 10vh;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  z-index: ${({ theme }) => theme.z.pause};
  &:active {
    ${tw`bg-gradient-to-b from-gray-400 to-gray-600`};
  }
`;

const DpadContainer = styled(FlexBox)`
  ${tw`w-6/12`}
  height: 39vh;
  padding-top: 4vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ABContainer = styled(DpadContainer)`
  margin-top: -10vw;
`;

const ABtn = styled.div`
  ${tw`bg-gradient-to-b from-gray-300 to-gray-500`};
  color: ${({ theme }) => theme.color.gray[700]};
  font-weight: 700;
  width: 16vw;
  height: 16vw;
  ${tw`border-4 border-purple-900`}
  border-radius: 8vw;
  margin-left: auto;
  margin-right: 4vw;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  &:active {
    ${tw`bg-gradient-to-b from-gray-400 to-gray-600`};
  }
`;

const BBtn = styled(ABtn)`
  margin-right: 50%;
`;

const MenuBtn = styled.div`
  ${tw`bg-gradient-to-b from-gray-300 to-gray-500`};
  ${tw`w-1/12`}
  height: 20px;
  border-radius: 8px;
  color: ${({ theme }) => theme.color.gray[700]};
  font-weight: 700;
  display: flex;
  font-size: 10px;
  align-items: center;
  justify-content: center;
  user-select: none;
`;

const StartSelectBtnBasic = styled.div`
  ${tw`bg-gradient-to-b from-gray-300 to-gray-500`};
  ${tw`w-2/12`}
  height: 20px;
  border-radius: 8px;
  margin-top: -20px;
  color: ${({ theme }) => theme.color.gray[700]};
  font-weight: 700;
  display: flex;
  font-size: 12px;
  align-items: center;
  justify-content: center;
  user-select: none;
`;

const StartBtn = styled(StartSelectBtnBasic)`
  box-sizing: border-box;
`;

const SelectBtn = styled(StartSelectBtnBasic)`
  box-sizing: border-box;
`;

const StyledInput = styled.input`
  opacity: 0 !important;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
`;
