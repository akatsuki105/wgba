import React, { useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

type SeparatorOrientation = 'horizontal' | 'vertical';

type SeparatorColor = 'gray' | 'blue' | 'green' | 'red';

interface SeparatorProps {
  color?: SeparatorColor;
  orientation?: SeparatorOrientation;
  stretch?: boolean;
}

export const Separator: React.FC<SeparatorProps> = React.memo(({ color, orientation, stretch }) => {
  const theme = useContext(ThemeContext);
  const palette = color ? theme.color[color] : theme.color.gray;

  let boxShadow = `0 -1px 0px ${palette[300]}`;
  if (orientation === 'vertical') {
    boxShadow = `-1px 0px 0px ${palette[300]}ff`;
  }

  const Content = useMemo(() => {
    return <StyledSeparator color={palette[100]} boxShadow={boxShadow} orientation={orientation} />;
  }, [palette, boxShadow, orientation]);

  if (stretch) {
    return <div style={{ alignSelf: 'stretch' }}>{Content}</div>;
  }

  return Content;
});

interface StyledSeparatorProps {
  color: string;
  boxShadow: string;
  orientation?: SeparatorOrientation;
}

const StyledSeparator = styled.div<StyledSeparatorProps>`
  background-color: ${(props) => props.color};
  box-shadow: ${(props) => props.boxShadow};
  height: ${(props) => (props.orientation === 'vertical' ? '100%' : '1px')};
  width: ${(props) => (props.orientation === 'vertical' ? '1px' : '100%')};
`;
