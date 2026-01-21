# Ruleta de la Suerte Algarve

An interactive prize wheel web application optimized for the Algarve Tourism Stand at FITUR 2026.

## Features

- **Interactive prize wheel** with smooth animations and sound effects
- **Weighted prize system** that adjusts probabilities in real-time
- **Session management** with scheduled time slots
- **Admin dashboard** protected with PIN access
- **Data persistence** using localStorage
- **Responsive design** optimized for mobile and tablet
- **Celebration effects** with confetti for winners
- **Countdown timer** between sessions

## Prize Structure

| Prize | Display Name | Initial Quantity |
|-------|-------------|------------------|
| Voucher (high value) | Experiencia | 9 |
| Tasting (medium value) | Saboreo | 83 |
| Surprise (freebie) | Regalos | 1,298 |

## Session Schedule

### Saturday (5 vouchers target)
- 11:00 - 12:00 (2 vouchers)
- 13:00 - 14:00 (1 voucher)
- 16:00 - 17:00 (1 voucher)
- 18:00 - 19:00 (1 voucher)

### Sunday (4 vouchers target)
- 11:00 - 12:00 (1 voucher)
- 13:00 - 14:00 (1 voucher)
- 16:00 - 17:00 (1 voucher)
- 17:00 - 18:00 (1 voucher)

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ruleta

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Usage

### User Panel (/)
1. Navigate to the main URL
2. Wait for a session to start or watch the countdown timer
3. When session is active, press "GIRAR" (Spin) to participate
4. Show the prize message to stand staff

### Admin Panel (/admin)
1. Navigate to `/admin`
2. Enter PIN: `2025`
3. Select event day (Saturday/Sunday)
4. Start/end sessions manually
5. Adjust inventory if needed
6. Export data for analysis

### Changing the Admin PIN
Edit `src/store/gameStore.ts` and modify the `ADMIN_PIN` constant.

## Deployment

### Vercel (Recommended)

1. Push code to GitHub/GitLab/Bitbucket
2. Connect repository at [vercel.com](https://vercel.com)
3. Click "Deploy"
4. Application will be available at the provided URL

```bash
# Or using Vercel CLI
npm i -g vercel
vercel
```

### Netlify

1. Create a `netlify.toml` file in the root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

2. Deploy from Netlify dashboard or CLI:

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

## Configuration

### Environment Variables (optional)

Create a `.env.local` file:

```env
# Application base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Custom admin PIN (default: 2025)
ADMIN_PIN=your-custom-pin
```

### Color Customization

Brand colors are defined in `src/app/globals.css`:

```css
:root {
  --algarve-orange: #E85D04;  /* Algarve orange */
  --algarve-blue: #0077B6;     /* Ocean blue */
  --algarve-gold: #FFD700;     /* Prize gold */
}
```

## Troubleshooting

### Wheel doesn't spin
- Verify a session is active in the admin panel
- Check that inventory is not empty
- Make sure event day is selected

### Sounds don't work
- Browsers require user interaction before playing audio
- Ensure device is not in silent mode

### Data doesn't persist
- Verify localStorage is enabled in the browser
- In incognito mode, data is lost when window closes

### Performance issues on slow WiFi
- Application works fully offline once loaded
- Data is saved locally, no constant connection required

## Project Structure

```
ruleta/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx      # Admin dashboard
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Main layout
│   │   └── page.tsx          # Main page
│   ├── components/
│   │   ├── AdminDashboard.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── GamePage.tsx
│   │   ├── PrizeWheel.tsx
│   │   ├── SessionStatus.tsx
│   │   ├── SpinButton.tsx
│   │   └── WinModal.tsx
│   ├── hooks/
│   │   └── useSoundEffects.ts
│   ├── store/
│   │   └── gameStore.ts      # Global state (Zustand)
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── prizeLogic.ts     # Prize selection logic
│       └── sessionManager.ts # Session management
├── public/
├── package.json
└── README.md
```

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Static typing
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **canvas-confetti** - Celebration effects
- **Web Audio API** - Sound effects

## License

Developed for Algarve Tourism - FITUR 2026.

## Support

For technical support during the event, contact the development team.
