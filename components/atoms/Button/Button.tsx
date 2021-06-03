import Link from 'next/link';
import React, { useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

interface ButtonProps {
  children?: React.ReactNode;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  to?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  disabled,
  href,
  onClick,
  size,
  text,
  to,
}) => {
  const { spacing } = useContext(ThemeContext);

  let buttonSize: number;
  let buttonPadding: number;
  let fontSize: number;
  switch (size) {
    case 'sm':
      buttonPadding = spacing[3];
      buttonSize = 36;
      fontSize = 14;
      break;
    case 'lg':
      buttonPadding = spacing[4];
      buttonSize = 64;
      fontSize = 16;
      break;
    case 'md':
    default:
      buttonPadding = spacing[4];
      buttonSize = 48;
      fontSize = 16;
  }

  const ButtonChild = useMemo(() => {
    if (to) {
      return (
        <Link href={to}>
          <StyledExternalLink>{text}</StyledExternalLink>
        </Link>
      );
    } else if (href) {
      return (
        <StyledExternalLink href={href} target="__blank">
          {text}
        </StyledExternalLink>
      );
    } else {
      return text;
    }
  }, [href, text, to]);

  return (
    <StyledButton
      disabled={disabled}
      fontSize={fontSize}
      onClick={onClick}
      padding={buttonPadding}
      size={buttonSize}
    >
      {children}
      {ButtonChild}
    </StyledButton>
  );
};

interface StyledButtonProps {
  disabled?: boolean;
  fontSize: number;
  padding: number;
  size: number;
}

const StyledButton = styled.button<StyledButtonProps>`
  align-items: center;
  background: ${(props) => props.theme.color.gray[300]};
  border: 0;
  border-radius: ${(props) => props.theme.radius}px;
  box-shadow: inset 1px 1px 0px ${(props) => props.theme.color.gray[100]};
  color: ${(props) =>
    !props.disabled ? props.theme.color.gray[800] : props.theme.color.gray[500]};
  cursor: pointer;
  display: flex;
  font-size: ${(props) => props.fontSize}px;
  font-weight: 700;
  height: ${(props) => props.size}px;
  justify-content: center;
  outline: none;
  padding-left: ${(props) => props.padding}px;
  padding-right: ${(props) => props.padding}px;
  pointer-events: ${(props) => (!props.disabled ? undefined : 'none')};
  width: 100%;
  &:hover {
    background-color: ${(props) => props.theme.color.gray[100]};
  }
`;

const StyledExternalLink = styled.a`
  align-items: center;
  color: inherit;
  display: flex;
  flex: 1;
  height: 56px;
  justify-content: center;
  margin: 0 ${(props) => -props.theme.spacing[4]}px;
  padding: 0 ${(props) => props.theme.spacing[4]}px;
  text-decoration: none;
`;
