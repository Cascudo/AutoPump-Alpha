// src/pages/_app.tsx
import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { ContextProvider } from '../contexts/ContextProvider';
import { AppBar } from '../components/AppBar';
//import { ContentContainer } from '../components/ContentContainer';
import { Footer } from '../components/Footer';
import Notifications from '../components/Notification'
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>ALPHA Club - Exclusive $ALPHA Holders Rewards</title>
            <meta name="description" content="Join ALPHA Club - The premium Solana rewards platform for $ALPHA token holders" />
          </Head>
          <ContextProvider>
            <div className="flex flex-col min-h-screen">
              <Notifications />
              <AppBar/>
              <main className="flex-1">
                <Component {...pageProps} />
              </main>
              <Footer/>
            </div>
          </ContextProvider>
        </>
    );
};

export default App;