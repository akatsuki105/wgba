import * as React from 'react';
import { styled } from 'twin.macro';

// Array assertions
// eslint-disable-next-line
function isArray<T>(value: any): value is Array<T> {
  return Array.isArray(value);
}

// Object assertions
type Dict<T = any> = Record<string, T>;
const objectKeys = <T extends Dict>(obj: T) => Object.keys(obj) as unknown as (keyof T)[];
const isObject = (value: any): value is Dict => {
  const type = typeof value;

  return value != null && (type === 'object' || type === 'function') && !isArray(value);
};

const mapResponsive = (prop: any, mapper: (val: any) => any) => {
  if (isArray(prop)) {
    return prop.map((item) => {
      if (item === null) {
        return null;
      }

      return mapper(item);
    });
  }

  if (isObject(prop)) {
    return objectKeys(prop).reduce((result: Dict, key) => {
      result[key] = mapper(prop[key]);

      return result;
    }, {});
  }

  if (prop != null) {
    return mapper(prop);
  }

  return null;
};

type Ratio = '21/9' | '16/9' | '9/16' | '4/3' | '1.85/1' | '1/1';
type AspectRatioOptions = {
  ratio?: Ratio;
};

export type AspectRatioProps = React.HTMLAttributes<HTMLDivElement> & AspectRatioOptions;

const getRatio = (r: Ratio): number => {
  const a = r.split('/');

  return Number(a[0]) / Number(a[1]);
};

export const AspectRatio = React.forwardRef((props: AspectRatioProps, ref) => {
  const { ratio = '4/3', children, ...rest } = props;

  // enforce single child
  const child = React.Children.only(children);

  return (
    <StyledDiv ref={ref as any} ratio={getRatio(ratio)} {...rest}>
      {child}
    </StyledDiv>
  );
});

const StyledDiv = styled.div<{ ratio: number }>`
  position: relative;

  &:before {
    height: 0;
    content: '';
    display: block;
    padding-bottom: ${(props) => String((1 / props.ratio) * 100) + '%'};
  }

  & > *:not(style) {
    overflow: hidden;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  & > img,
  & > video {
    object-fit: cover;
  }
`;
