"use client"

import Script from "next/script"

// 環境変数で各タグの ID を取り、設定されていれば挿入
export function AdsTracking() {
  if (typeof window === 'undefined') return null
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  // plus 社内本番では計測しない
  if (host.startsWith('plus.')) return null

  const ga4 = process.env.NEXT_PUBLIC_GA4_ID         // G-XXXXXXX
  const metaPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const xPixel = process.env.NEXT_PUBLIC_X_PIXEL_ID

  return (
    <>
      {ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${ga4}');
          `}</Script>
        </>
      )}
      {metaPixel && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${metaPixel}');
          fbq('track', 'PageView');
        `}</Script>
      )}
      {xPixel && (
        <Script id="x-pixel" strategy="afterInteractive">{`
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','${xPixel}');
        `}</Script>
      )}
    </>
  )
}
