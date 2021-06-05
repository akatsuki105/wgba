import React, { useCallback } from 'react';

type Props = React.HTMLAttributes<HTMLElement> & {
  className?: string;
};

export const Button: React.FC<Props> = (props) => {
  const onClick = useCallback(
    (e) => {
      if (props.onClick) props.onClick(e);
      if (navigator.vibrate) navigator.vibrate(50);
  }, [props.onClick]); // eslint-disable-line

  return (
    <div onClick={onClick} className={props.className} {...props}>
      {props.children}
    </div>
  );
};
