import { css, Theme } from '@emotion/react';

export const contentMaxWidth = '720px';

export const MOBILE_MAX_WIDTH = 768;
export const MOBILE_MEDIA_QUERY = `screen and (max-width: ${MOBILE_MAX_WIDTH}px)`;

export const lightTheme: Theme = {
  color: {
    primary: '#00687b',
    secondary: '#4b6269',
    onBackground: '#171c1e',
    tertiary: '#575c7e',
    onSurfaceVariant: '#3f484b',
    outline: '#70797c',
    surfaceVariant: '#dbe4e7',
    surface: '#f5fafc',
    background: '#f5fafc',
  },
};
export const darkTheme: Theme = {
  color: {
    primary: '#85d2e7',
    secondary: '#b2cbd3',
    onBackground: '#dee3e5',
    tertiary: '#bfc4eb',
    onSurfaceVariant: '#bfc8cb',
    outline: '#899295',
    surfaceVariant: '#3f484b',
    surface: '#0f1415',
    background: '#0f1415',
  },
};

export const hoverUnderline = (theme: Theme) => css`
  display: inline-block;
  position: relative;

  &:after {
    content: '';
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 1px;
    bottom: -1px;
    left: 0;
    background-color: ${theme.color.primary};
    transform-origin: bottom right;
    transition: transform 0.25s ease-out;
  }

  &:hover:after {
    transform: scaleX(1);
    transform-origin: bottom left;
    @media ${MOBILE_MEDIA_QUERY} {
      transform: scaleX(0);
    }
  }
`;
