import sharp from 'sharp'

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="80" fill="#2563eb"/>
  <text x="256" y="340" font-size="280" font-family="Arial" font-weight="bold" fill="white" text-anchor="middle">M</text>
</svg>`)

await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png')
console.log('Íconos creados')