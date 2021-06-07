import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
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
  const SafeHydrate = dynamic(() => import('../components/SafeHydrate'), { ssr: false });

  return (
    <>
      <Head>
        <title>WebGBA</title>
      </Head>
      <SafeHydrate>
        <Providers>
          <style jsx global>{`
            body {
              margin: 0;
              padding: 0;
              touch-action: none;
            }
          `}</style>
          <Page>
            <Component {...pageProps} />
          </Page>
        </Providers>
      </SafeHydrate>
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
