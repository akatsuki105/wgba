import React, { useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

export interface BoxProps {
  alignItems?: 'baseline' | 'center' | 'flex-end' | 'flex-start';
  children?: React.ReactNode;
  column?: boolean;
  flex?: number | string;
  height?: number | string;
  justifyContent?: 'center' | 'flex-end' | 'flex-start' | 'space-around' | 'space-between';
  margin?: number;
  marginBottom?: number;
  marginHorizontal?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginVertical?: number;
  maxHeight?: number | string;
  maxWidth?: number | string;
  minHeight?: number;
  minWidth?: number;
  overflow?: string;
  padding?: number;
  paddingBottom?: number;
  paddingHorizontal?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingVertical?: number;
  position?: 'relative' | 'absolute';
  reverse?: boolean;
  row?: boolean;
  width?: number | string;
}

export const Box: React.FC<BoxProps> = React.memo(
  ({
    children,
    column,
    height,
    margin = 0,
    marginBottom = 0,
    marginHorizontal = 0,
    marginLeft = 0,
    marginRight = 0,
    marginTop = 0,
    marginVertical = 0,
    maxHeight,
    maxWidth,
    minHeight,
    minWidth,
    overflow,
    padding = 0,
    paddingBottom = 0,
    paddingHorizontal = 0,
    paddingLeft = 0,
    paddingRight = 0,
    paddingTop = 0,
    paddingVertical = 0,
    position,
    reverse,
    row,
    width,
    ...props
  }) => {
    const { spacing } = useContext(ThemeContext);

    const display = useMemo(() => {
      if (row || column) {
        return 'flex';
      }

      return 'block';
    }, [column, row]);

    const flexDirection = useMemo(() => {
      if (row && reverse) {
        return 'row-reverse';
      }
      if (column && reverse) {
        return 'column-reverse';
      } else if (column) {
        return 'column';
      }

      return undefined;
    }, [column]); // eslint-disable-line

    const boxHeight = useMemo(() => {
      if (height) {
        return typeof height === 'string' ? height : height.toString() + 'px';
      }

      return undefined;
    }, [height]);

    const boxWidth = useMemo(() => {
      if (width) {
        return typeof width === 'string' ? width : width.toString() + 'px';
      }

      return undefined;
    }, [width]);

    const maxBoxHeight = useMemo(() => {
      if (maxHeight) {
        return typeof maxHeight === 'string' ? maxHeight : maxHeight.toString() + 'px';
      }

      return undefined;
    }, [maxHeight]);

    const maxBoxWidth = useMemo(() => {
      if (maxWidth) {
        return typeof maxWidth === 'string' ? maxWidth : maxWidth.toString() + 'px';
      }

      return undefined;
    }, [maxWidth]);

    return (
      <StyledBox
        {...props}
        display={display}
        flexDirection={flexDirection}
        height={boxHeight}
        margin={spacing[margin || 0]}
        marginBottom={spacing[marginBottom || marginVertical || 0]}
        marginLeft={spacing[marginLeft || marginHorizontal || 0]}
        marginRight={spacing[marginRight || marginHorizontal || 0]}
        marginTop={spacing[marginTop || marginVertical || 0]}
        maxHeight={maxBoxHeight}
        maxWidth={maxBoxWidth}
        minHeight={minHeight}
        minWidth={minWidth}
        overflow={overflow}
        padding={spacing[padding || 0]}
        paddingBottom={spacing[paddingBottom || paddingVertical || 0]}
        paddingLeft={spacing[paddingLeft || paddingHorizontal || 0]}
        paddingRight={spacing[paddingRight || paddingHorizontal || 0]}
        paddingTop={spacing[paddingTop || paddingVertical || 0]}
        position={position}
        width={boxWidth}
      >
        {children}
      </StyledBox>
    );
  },
);

interface StyledBoxProps extends BoxProps {
  display: string;
  flexDirection?: string;
}

const StyledBox = styled.div<StyledBoxProps>`
  align-items: ${(props) => props.alignItems};
  display: ${(props) => props.display};
  flex: ${(props) => props.flex};
  flex-direction: ${(props) => props.flexDirection};
  height: ${(props) => props.height};
  justify-content: ${(props) => props.justifyContent};
  margin: ${(props) => (props.margin ? props.margin.toString() + 'px' : undefined)};
  margin-bottom: ${(props) =>
    props.marginBottom ? props.marginBottom.toString() + 'px' : undefined};
  margin-left: ${(props) => (props.marginLeft ? props.marginLeft.toString() + 'px' : undefined)};
  margin-right: ${(props) => (props.marginRight ? props.marginRight.toString() + 'px' : undefined)};
  margin-top: ${(props) => (props.marginTop ? props.marginTop.toString() + 'px' : undefined)};
  max-height: ${(props) => props.maxHeight};
  max-width: ${(props) => props.maxWidth};
  min-height: ${(props) => (props.minHeight ? props.minHeight.toString() + 'px' : undefined)};
  min-width: ${(props) => (props.minWidth ? props.minWidth.toString() + 'px' : undefined)};
  overflow: ${(props) => props.overflow};
  padding: ${(props) => (props.padding ? props.padding.toString() + 'px' : undefined)};
  padding-bottom: ${(props) =>
    props.paddingBottom ? props.paddingBottom.toString() + 'px' : undefined};
  padding-left: ${(props) => (props.paddingLeft ? props.paddingLeft.toString() + 'px' : undefined)};
  padding-right: ${(props) =>
    props.paddingRight ? props.paddingRight.toString() + 'px' : undefined};
  padding-top: ${(props) => (props.paddingTop ? props.paddingTop.toString() + 'px' : undefined)};
  position: ${(props) => props.position};
  width: ${(props) => props.width};
`;
