import tw, { styled } from 'twin.macro';
import { BaseButton } from './Base';

export const StartSelectBtn = styled(BaseButton)`
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
