const OG_IMAGE_URL = 'https://ucc-ipo.com/preview.png?v=2';

const META_TAGS = [
  { property: 'og:site_name', content: 'UCC IPO' },
  { property: 'og:type', content: 'website' },
  { property: 'og:url', content: 'https://ucc-ipo.com' },
  { property: 'og:title', content: 'UCC IPO - University Intellectual Property Management and Evaluation System' },
  { property: 'og:description', content: 'Official Intellectual Property Management and Evaluation System of the University of Caloocan City.' },
  { property: 'og:image', content: OG_IMAGE_URL },
  { property: 'og:image:secure_url', content: OG_IMAGE_URL },
  { property: 'og:image:type', content: 'image/png' },
  { property: 'og:image:width', content: '1200' },
  { property: 'og:image:height', content: '630' },
  { property: 'twitter:card', content: 'summary_large_image' },
  { property: 'twitter:title', content: 'UCC IPO - University Intellectual Property Management and Evaluation System' },
  { property: 'twitter:description', content: 'Official Intellectual Property Management and Evaluation System of the University of Caloocan City.' },
  { property: 'twitter:image', content: OG_IMAGE_URL },
];

export default function DebugOGPage() {
  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Open Graph Debug</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Preview Image</h2>
        <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>{OG_IMAGE_URL}</p>
        <img
          src={OG_IMAGE_URL}
          alt="OG preview"
          style={{ width: '100%', maxWidth: '600px', border: '1px solid #ccc', borderRadius: '4px' }}
          onLoad={() => console.log('OG image loaded OK')}
          onError={() => console.error('OG image failed to load')}
        />
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Meta Tag Values</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ddd' }}>Property</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ddd' }}>Content</th>
            </tr>
          </thead>
          <tbody>
            {META_TAGS.map(({ property, content }) => (
              <tr key={property}>
                <td style={{ padding: '5px 10px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>{property}</td>
                <td style={{ padding: '5px 10px', border: '1px solid #ddd', wordBreak: 'break-all' }}>{content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Cache Busting</h2>
        <p style={{ fontSize: '0.85rem' }}>
          Current version query string: <strong>?v=2</strong>. Increment this value in <code>index.html</code> whenever
          you replace <code>public/preview.png</code> to force platforms to re-fetch the image.
        </p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Force-refresh links:
        </p>
        <ul style={{ fontSize: '0.85rem', marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
          <li>Facebook: <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noreferrer">https://developers.facebook.com/tools/debug/</a></li>
          <li>LinkedIn: <a href="https://www.linkedin.com/post-inspector/" target="_blank" rel="noreferrer">https://www.linkedin.com/post-inspector/</a></li>
          <li>Twitter/X: post the URL — it re-fetches automatically on new tweets</li>
          <li>Discord: no public scraper tool; cache expires after ~30 min or use a new message</li>
        </ul>
      </section>
    </div>
  );
}
