import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Splash from './Splash.jsx'

function Root() {
  const [phase, setPhase] = useState("splash"); // "splash" | "fading" | "app"

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fading"), 2000);
    const show = setTimeout(() => setPhase("app"), 2700);
    return () => { clearTimeout(fade); clearTimeout(show); };
  }, []);

  if (phase === "app") return <App />;

  return (
    <div style={{
      opacity: phase === "fading" ? 0 : 1,
      transition: "opacity 0.7s ease",
    }}>
      <Splash />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
