import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
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
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Star field */}
        {[...Array(60)].map((_, i) => (
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
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #e0e0e0, #a0a0a0 50%, #606060)',
            boxShadow: '0 0 60px rgba(200,200,200,0.15), inset -20px -20px 40px rgba(0,0,0,0.5)',
            marginBottom: '48px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Crater dots */}
          {[[30,40,18],[65,25,12],[50,65,22],[20,65,10],[75,55,8]].map(([x,y,r],i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              width: `${r}%`, height: `${r}%`,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.2)',
              transform: 'translate(-50%,-50%)',
            }} />
          ))}
          {/* Marker dots */}
          {[[45,52],[60,40],[35,45],[55,60],[70,48]].map(([x,y],i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: i === 0 ? '#4ade80' : i === 4 ? '#f87171' : '#fbbf24',
              transform: 'translate(-50%,-50%)',
              boxShadow: `0 0 6px ${i === 0 ? '#4ade80' : i === 4 ? '#f87171' : '#fbbf24'}`,
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '52px',
          fontWeight: 'bold',
          color: 'white',
          letterSpacing: '0.1em',
          marginBottom: '16px',
          display: 'flex',
        }}>
          月面探査機マップ
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '22px',
          color: '#a1a1aa',
          letterSpacing: '0.05em',
          display: 'flex',
        }}>
          人類が月に送り込んだ全探査機を3Dマップで探索
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: '40px',
          marginTop: '32px',
          fontSize: '16px',
          color: '#71717a',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span>運用中</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
            <span>運用終了</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
            <span>消息不明</span>
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
