import tw, { styled } from 'twin.macro';
import { BaseButton } from './Base';

export const MenuBtn = styled(BaseButton)`
  ${tw`w-1/12`}
  height: 20px;
  border-radius: 6px;
  display: flex;
  font-size: 10px;
  align-items: center;
  justify-content: center;
  user-select: none;
`;
