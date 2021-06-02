---
to: components/atoms/<%= h.dirpath(dir) %>/<%= h.capitalize(name) %>.tsx
---

import React from 'react';
import { styled } from 'twin.macro';

type Props = {}; // eslint-disable-line

export const <%= h.capitalize(name) %>: React.FC<Props> = React.memo(({ children }) => {
  return <StyledDiv>{children}</StyledDiv>;
});

const StyledDiv = styled.div``;
