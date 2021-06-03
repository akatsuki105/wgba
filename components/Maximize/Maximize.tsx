import Image from 'next/image';
import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  onClick: () => void;
};

export const Maximize: React.FC<Props> = React.memo(({ onClick }) => (
  <StyledDiv>
    <Image src="/images/maximize.svg" width="36" height="36" onClick={onClick} />
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
