import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";


const PublicRoutes = createBrowserRouter([
    {
        path: "/",
        element: <Home/>,
    },
  /*  {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    }, */
])

export default PublicRoutes;