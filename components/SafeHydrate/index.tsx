import React from 'react';

interface SafeHydrateProps {
  children: JSX.Element | JSX.Element[];
}
const SafeHydrate = (props: SafeHydrateProps) => {
  return <>{props.children}</>;
};

export default SafeHydrate;
