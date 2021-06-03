import Image from 'next/image';
import React, { useRef } from 'react';
import tw, { styled } from 'twin.macro';
import { LBtn, RBtn } from 'components/Button';
import { FlexBox } from 'components/atoms/FlexBox';

type Props = {
  isRun: boolean;
  turnOn: (f: File) => void;
  turnOff: () => void;
};

export const Controller: React.FC<Props> = React.memo(({ isRun, turnOn, turnOff }) => {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <StyledDiv>
      <StyledFlex>
        <LBtn />
        <FlexBox className="w-6/12" center>
          <Image src="/images/gba_logo.png" width="140px" height="18px" />
        </FlexBox>
        <RBtn />
      </StyledFlex>

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
        <MenuBtn onClick={() => ref.current?.click()} />
        <StyledInput
          type="file"
          accept=".gba"
          ref={ref}
          onClick={() => isRun && turnOff()}
          onChange={(e) => {
            e.target.files && turnOn(e.target.files[0]);
          }}
        />
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

const ABDpadContainer = styled(FlexBox)`
  ${tw`w-6/12`}
  height: 40vh;
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