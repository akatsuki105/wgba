import type { AppProps } from 'next/app';
import Head from 'next/head';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { Page } from 'components/atoms/Page';
import { ModalsProvider } from 'contexts';
import theme from 'theme';
import 'tailwind.css';

if (process.env.NODE_ENV === 'production') {
  console.log = (value: any) => {}; // eslint-disable-line
}

const App = ({ Component, pageProps }: AppProps): JSX.Element => {
  return (
    <>
      <Head>
        <title>nextjs-starter</title>
      </Head>
      <Providers>
        <Page>
          <style jsx global>{`
            body {
              margin: 0;
            }
          `}</style>
          <Component {...pageProps} />
        </Page>
      </Providers>
    </>
  );
};

const Providers: React.FC = React.memo(({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <ModalsProvider>{children}</ModalsProvider>
    </ThemeProvider>
  );
});

export default App;
