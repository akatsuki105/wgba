import React from 'react';
import tw, { styled } from 'twin.macro';
import { LBtn, RBtn } from 'components/Button';
import { Menu, MenuItem } from 'components/Menu';
import { FlexBox } from 'components/atoms/FlexBox';
import { useModal } from 'hooks';

type Props = {
  isRun: boolean;
  turnOn: (f: File) => void;
  turnOff: () => void;
  toggleSound: () => void;
};

export const Controller: React.FC<Props> = React.memo(({ isRun, turnOn, turnOff, toggleSound }) => {
  const [_, openModal] = useModal(
    <Menu>
      <MenuItem onClick={() => {}}>Load ROM</MenuItem>
      <MenuItem onClick={() => {}}>Quit Game</MenuItem>
      <MenuItem>Cancel</MenuItem>
    </Menu>,
  );

  return (
    <StyledDiv>
      <StyledFlex>
        <LBtn />
        <FlexBox className="w-6/12" center>
          <img src="/images/gba_logo.png" width="140px" height="18px" />
        </FlexBox>
        <RBtn />
      </StyledFlex>

      <VolumeContainer center>
        <SoundBtn onClick={toggleSound} />
      </VolumeContainer>

      <FlexBox>
        <ABDpadContainer column>
          <DpadUp />
          <FlexBox>
            <DpadLeft />
            <DpadBasic />
            <DpadRight />
          </FlexBox>
          <DpadDown />
        </ABDpadContainer>

        <ABDpadContainer column>
          <ABtn></ABtn>
          <BBtn></BBtn>
        </ABDpadContainer>
      </FlexBox>

      <FlexBox>
        <div tw="w-1/12"></div>
        <MenuBtn onClick={openModal} />
        <div tw="w-1/12"></div>
        <SelectBtn />
        <div tw="w-2/12"></div>
        <StartBtn />
      </FlexBox>
    </StyledDiv>
  );
});

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

const SoundBtn = styled.div`
  background-color: ${({ theme }) => theme.color.gray[400]};
  margin-top: 10vh;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  z-index: ${({ theme }) => theme.z.pause};
`;

const ABDpadContainer = styled(FlexBox)`
  ${tw`w-6/12`}
  height: 39vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DpadBasic = styled.div`
  background-color: ${({ theme }) => theme.color.gray[400]};
  width: 40px;
  height: 40px;
`;

const DpadUp = styled(DpadBasic)`
  border-radius: 4px 4px 0 0;
`;

const DpadDown = styled(DpadBasic)`
  border-radius: 0 0 4px 4px;
`;

const DpadRight = styled(DpadBasic)`
  border-radius: 0 4px 4px 0;
`;

const DpadLeft = styled(DpadBasic)`
  border-radius: 4px 0 0 4px;
`;

const ABtn = styled.div`
  background-color: ${({ theme }) => theme.color.gray[400]};
  width: 40px;
  height: 40px;
  margin-left: 30%;
`;

const BBtn = styled.div`
  background-color: ${({ theme }) => theme.color.gray[400]};
  width: 40px;
  height: 40px;
  margin-right: 30%;
`;

const MenuBtn = styled.div`
  background-color: ${({ theme }) => theme.color.gray[400]};
  ${tw`w-1/12`}
  height: 20px;
`;

const StartSelectBtnBasic = styled.div`
  background-color: ${({ theme }) => theme.color.gray[400]};
  ${tw`w-2/12`}
  height: 20px;
  margin-top: -20px;
`;

const StartBtn = styled(StartSelectBtnBasic)`
  box-sizing: border-box;
  padding-right: 32px;
`;

const SelectBtn = styled(StartSelectBtnBasic)`
  box-sizing: border-box;
  padding-left: 32px;
`;

const StyledInput = styled.input`
  opacity: 0 !important;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
`;
