import { styled } from 'twin.macro';
import { Button } from 'components/atoms/Button';

export const BaseButton = styled(Button)`
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
