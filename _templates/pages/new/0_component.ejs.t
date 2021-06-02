---
to: pages/<%= h.dirpath(dir) %>/<%= h.capitalize(name) %>.tsx
---

import React from 'react';
import styled from 'styled-components';

const <%= h.capitalize(name) %>: React.FC = React.memo(() => {
  return <StyledDiv>Hello</StyledDiv>;
});

const StyledDiv = styled.div``;

export default <%= h.capitalize(name) %>;
