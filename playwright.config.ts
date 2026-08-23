import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./tests',
  timeout:30_000,
  expect:{timeout:5_000},
  retries:1,
  reporter:'line',
  use:{
    baseURL:process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 7']}},
  ],
})
