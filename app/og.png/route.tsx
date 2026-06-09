import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  // Load Noto Sans JP for Japanese text rendering
  const fontData = await fetch(
    'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfkopLwfc5RA3ZKgHLCFkjXQ.woff2'
  ).then(r => r.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Noto Sans JP", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Star field */}
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: i % 5 === 0 ? '3px' : '2px',
              height: i % 5 === 0 ? '3px' : '2px',
              borderRadius: '50%',
              background: 'white',
              opacity: 0.4 + (i % 6) * 0.1,
              left: `${(i * 137.5) % 100}%`,
              top: `${(i * 97.3) % 100}%`,
            }}
          />
        ))}

        {/* Moon circle */}
        <div
          style={{
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #e0e0e0, #a0a0a0 50%, #606060)',
            boxShadow: '0 0 60px rgba(200,200,200,0.15)',
            marginBottom: '40px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Marker dots */}
          {([[45,52,'#4ade80'],[60,40,'#fbbf24'],[35,45,'#fbbf24'],[55,60,'#fbbf24'],[70,48,'#ef4444']] as [number,number,string][]).map(([x,y,c],i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              width: '10px', height: '10px',
              borderRadius: '50%',
              background: c,
              transform: 'translate(-50%,-50%)',
              boxShadow: `0 0 8px ${c}`,
              display: 'flex',
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '56px',
          fontWeight: 'bold',
          color: 'white',
          letterSpacing: '0.05em',
          marginBottom: '16px',
          display: 'flex',
        }}>
          月面探査機マップ
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '24px',
          color: '#a1a1aa',
          display: 'flex',
        }}>
          人類が月に送り込んだ全探査機を3Dマップで探索
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '28px', fontSize: '18px', color: '#71717a' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', display: 'inline-flex' }} />
            <span>運用中</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24', display: 'inline-flex' }} />
            <span>運用終了</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-flex' }} />
            <span>消息不明</span>
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Noto Sans JP', data: fontData, style: 'normal' }],
    }
  )
}
