import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthProvider from "./providers/AuthProvider";
import PublicRoutes from "./routes/PublicRoutes";
import { RouterProvider } from "react-router-dom";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={PublicRoutes} />
    </AuthProvider>
  </StrictMode>,
)
