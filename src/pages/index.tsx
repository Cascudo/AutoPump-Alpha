// src/pages/index.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { AlphaHomeView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>ALPHA Club - Exclusive Solana Rewards</title>
        <meta
          name="description"
          content="Join ALPHA Club - The premium Solana rewards platform for $ALPHA token holders. Daily rewards, daily burns, exclusive benefits, and transparent token burns."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AlphaHomeView />
    </div>
  );
};

export default Home;