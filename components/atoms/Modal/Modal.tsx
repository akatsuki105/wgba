import React from 'react';
import styled, { keyframes } from 'styled-components';

export interface ModalProps {
  onDismiss?: () => void;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ children, className = '' }) => {
  return (
    <StyledResponsiveWrapper className={className}>
      <StyledModal>{children}</StyledModal>
    </StyledResponsiveWrapper>
  );
};

const mobileKeyframes = keyframes`
  0% {
    transform: translateY(0%);
  }
  100% {
    transform: translateY(-100%);
  }
`;

const StyledResponsiveWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  width: 100%;
  max-width: 768px;
  max-height: 90%;
  z-index: ${({ theme }) => theme.z.modal};
  @media (max-width: ${(props) => props.theme.breakpoints.md}px) {
    flex: 1;
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    max-height: calc(100% - ${(props) => props.theme.spacing[4]}px);
    animation: ${mobileKeyframes} 0.3s forwards ease-out;
  }
`;

const StyledModal = styled.div`
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  max-height: 100%;
  overflow-y: scroll;
`;
