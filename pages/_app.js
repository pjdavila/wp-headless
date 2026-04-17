import "../faust.config";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import { FirebaseProvider } from "../components/FirebaseProvider";
import NotificationPrompt from "../components/NotificationPrompt";
import ComingSoon from "../components/ComingSoon";
import { OrganizationJsonLd } from "../components/JsonLd";
import "../styles/globals.css";
import "video.js/dist/video-js.css";

const GA_ID = "G-F4RRT00M6P";

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

const GA_INIT_SCRIPT = `
(function(){
  function loadGA() {
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
    s.async = true;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${GA_ID}', { send_page_view: true });
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(function(){ setTimeout(loadGA, 3000); });
  } else {
    setTimeout(loadGA, 3000);
  }
})();
`;

const isComingSoonEnabled =
  process.env.COMING_SOON === "true" ||
  process.env.NEXT_PUBLIC_COMING_SOON === "true";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(!isComingSoonEnabled);
  const [checked, setChecked] = useState(!isComingSoonEnabled);

  useEffect(() => {
    if (!isComingSoonEnabled) return;

    fetch("/api/check-access")
      .then((r) => r.json())
      .then((data) => {
        if (data.granted) setGateOpen(true);
        setChecked(true);
      })
      .catch(() => {
        setChecked(true);
      });
  }, []);

  const handleUnlock = () => {
    setGateOpen(true);
  };

  if (!checked || !gateOpen) {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Caribbean Business — Coming Soon</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ComingSoon onUnlock={handleUnlock} />
      </>
    );
  }

  return (
    <FaustProvider pageProps={pageProps}>
      <FirebaseProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <OrganizationJsonLd />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Script
          id="ga-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: GA_INIT_SCRIPT }}
        />
        <Script
          id="aso-loader"
          strategy="afterInteractive"
          src="https://media.aso1.net/js/code.min.js"
          data-cfasync="false"
        />
        <Component {...pageProps} key={router.asPath} />
        <NotificationPrompt />
      </FirebaseProvider>
    </FaustProvider>
  );
}
