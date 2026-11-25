import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv, defineConfig } from 'vite'
import type { Plugin } from 'vite'
import handler from './api/admin/auth.ts'

function localAdminAuth(): Plugin {
  return {
    name: 'local-admin-auth',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (pathname !== '/api/admin/auth') return next()
        void handler(req, res).catch(() => {
          if (res.headersSent) return res.destroy()
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Could not process sign-in.' }))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), localAdminAuth()],
  }
})
