import "../faust.config";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import { FirebaseProvider } from "../components/FirebaseProvider";
import NotificationPrompt from "../components/NotificationPrompt";
import StickyBottomBanner from "../components/ads/StickyBottomBanner";
import ComingSoon from "../components/ComingSoon";
import { OrganizationJsonLd } from "../components/JsonLd";
import "../styles/globals.css";
import "video.js/dist/video-js.css";
import "../styles/video-player.css";

const GA_ID = "G-F4RRT00M6P";
const QUANTCAST_QACCT = "p-SQPESTjuEeY-e";

const QUANTCAST_INIT_SCRIPT = `
window._qevents = window._qevents || [];
(function() {
  var elem = document.createElement('script');
  elem.src = (document.location.protocol == "https:" ? "https://secure" : "http://edge") + ".quantserve.com/quant.js";
  elem.async = true;
  elem.type = "text/javascript";
  var scpt = document.getElementsByTagName('script')[0];
  scpt.parentNode.insertBefore(elem, scpt);
})();
window._qevents.push({ qacct: "${QUANTCAST_QACCT}", labels: "_fp.event.PageView" });
`;

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

  useEffect(() => {
    if (!gateOpen) return;
    const fireQuantcast = () => {
      if (typeof window === "undefined" || !window._qevents) return;
      window._qevents.push({ qacct: QUANTCAST_QACCT, labels: "_fp.event.PageView" });
    };
    router.events.on("routeChangeComplete", fireQuantcast);
    return () => {
      router.events.off("routeChangeComplete", fireQuantcast);
    };
  }, [gateOpen, router.events]);

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
        <Script
          id="quantcast-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: QUANTCAST_INIT_SCRIPT }}
        />
        <noscript>
          <div style={{ display: "none" }}>
            <img
              src={`//pixel.quantserve.com/pixel/${QUANTCAST_QACCT}.gif`}
              style={{ display: "none" }}
              border="0"
              height="1"
              width="1"
              alt="Quantcast"
            />
          </div>
        </noscript>
        <Component {...pageProps} key={router.asPath} />
        <NotificationPrompt />
        <StickyBottomBanner />
      </FirebaseProvider>
    </FaustProvider>
  );
}
