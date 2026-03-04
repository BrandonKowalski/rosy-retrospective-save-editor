import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/rosy-retrospective-save-editor/',
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
})
