import Image from 'next/image';
import React from 'react';
import { styled } from 'twin.macro';

interface LoaderProps {
  src: string;
  text?: string;
}

export const Loader: React.FC<LoaderProps> = React.memo(({ src, text = 'loading' }) => {
  return (
    <StyledLoader>
      <Image src={src} width={80} height={80} alt={'loading'} />
      <StyledText>{text}</StyledText>
    </StyledLoader>
  );
});

const StyledLoader = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const StyledText = styled.div`
  color: ${(props) => props.theme.color.grey[400]};
`;
