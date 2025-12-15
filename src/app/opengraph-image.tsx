import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Bloxr - Bygg smartare'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '24px',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.5)',
            }}
          >
            <span style={{ color: 'white', fontSize: '64px', fontWeight: 'bold' }}>B</span>
          </div>
          <span style={{ fontSize: '72px', fontWeight: 'bold', color: 'white' }}>Bloxr</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '56px',
          color: 'white',
          textAlign: 'center',
          margin: '0 0 20px 0',
          fontWeight: 'bold',
        }}>
          Bygg smartare
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '28px',
          color: 'rgba(255,255,255,0.8)',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 0 40px 0',
        }}>
          Den moderna projektportalen för byggprojekt med AI-assistans
        </p>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {['Dokument', 'Ritningar', 'Checklistor', 'Protokoll', 'AI'].map((feature) => (
            <div
              key={feature}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '999px',
                color: 'white',
                fontSize: '20px',
                backdropFilter: 'blur(10px)',
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '24px',
          }}
        >
          bloxr.se
        </div>
      </div>
    ),
    { ...size }
  )
}
