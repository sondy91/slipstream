import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Splash from './Splash.jsx'

function Root() {
  const [phase, setPhase] = useState("splash"); // "splash" | "fading" | "app"

  const handleEnter = () => {
    setPhase("fading");
    setTimeout(() => setPhase("app"), 700);
  };

  if (phase === "app") return <App />;

  return (
    <div style={{
      opacity: phase === "fading" ? 0 : 1,
      transition: "opacity 0.7s ease",
    }}>
      <Splash onEnter={handleEnter} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
