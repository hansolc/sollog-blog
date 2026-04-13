import '@emotion/react';

declare module '@emotion/react' {
  export interface Theme {
    color: {
      primary: string;
      secondary: string;
      onBackground: string;
      tertiary: string;
      onSurfaceVariant: string;
      outline: string;
      surfaceVariant: string;
      surface: string;
      background: string;
    };
  }
}
