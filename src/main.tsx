import { StrictMode } from 'react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'

const convexUrl = import.meta.env.VITE_CONVEX_URL
const app = (
  <TooltipProvider>
    <App />
  </TooltipProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convexUrl ? <ConvexProvider client={new ConvexReactClient(convexUrl)}>{app}</ConvexProvider> : app}
  </StrictMode>,
)
