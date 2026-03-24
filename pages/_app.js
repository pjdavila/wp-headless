import "../faust.config";
import React from "react";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import "../styles/globals.css";

const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('bj-theme');
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  return (
    <FaustProvider pageProps={pageProps}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Script
        id="theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
      <Component {...pageProps} key={router.asPath} />
    </FaustProvider>
  );
}
