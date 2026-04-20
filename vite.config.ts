import { defineConfig } from 'vite'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function draftboardPortFile() {
  const designDir = join(process.cwd(), '.draftboard')
  const portFile = join(designDir, '.port')
  return {
    name: 'draftboard-port-file',
    configureServer(server: import('vite').ViteDevServer) {
      server.httpServer?.on('listening', () => {
        const address = server.httpServer?.address()
        const port = typeof address === 'object' && address ? address.port : 5005
        if (!existsSync(designDir)) mkdirSync(designDir, { recursive: true })
        writeFileSync(portFile, `http://localhost:${port}/mcp`)
      })
      const cleanup = () => { try { unlinkSync(portFile) } catch { /* */ } }
      process.on('exit', cleanup)
      process.on('SIGINT', () => { cleanup(); process.exit() })
      process.on('SIGTERM', () => { cleanup(); process.exit() })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    draftboardPortFile(),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: 'node' }),
    viteReact(),
  ],
})

export default config
