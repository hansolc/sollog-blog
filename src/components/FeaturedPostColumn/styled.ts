import styled from '@emotion/styled';

import { MOBILE_MEDIA_QUERY } from '@/src/styles/const';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 20px;
`;

export const Title = styled.div<{ fill: 'true' | 'false' }>`
  font-size: 20px;
  width: fit-content;
  padding: 10px;
  background-color: ${({ theme, fill }) => (fill === 'true' ? theme.color.onBackground : theme.color.background)};
  color: ${({ theme, fill }) => (fill === 'true' ? theme.color.background : theme.color.onBackground)};
  margin-bottom: 25px;
  border: 1px solid ${({ theme, fill }) => (fill === 'true' ? theme.color.background : theme.color.onBackground)};

  @media ${MOBILE_MEDIA_QUERY} {
    font-size: 17px;
    padding: 8px 10px;
  }
`;
