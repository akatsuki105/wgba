---
to: components/atoms/<%= h.dirpath(dir) %>/<%= h.capitalize(name) %>.tsx
---

import React from 'react';
import { styled } from 'twin.macro';

type Props = {
  className?: string;
};

export const <%= h.capitalize(name) %>: React.FC<Props> = React.memo(({ className="", children }) => {
  return <StyledDiv className={className}>{children}</StyledDiv>;
});

const StyledDiv = styled.div``;
