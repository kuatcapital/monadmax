import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { Providers } from './Providers.jsx'
// Inter (Monad's brand body font), self-hosted: same look on every OS, and
// its capitals sit centered in the line box — Windows' Segoe UI sits low
import '@fontsource-variable/inter'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
)
