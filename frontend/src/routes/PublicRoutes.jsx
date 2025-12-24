import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Superadmin from "../pages/dashboard/superadmin/Superadmin";
import SuperadminProfile from "../pages/dashboard/superadmin/SuperadminProfile";
import InstitutionManagement from "../pages/dashboard/superadmin/InstitutionManagement";
import RoleAssignment from "../pages/dashboard/superadmin/RoleAssignment";
import MainLayout from "../components/MainLayout";


const PublicRoutes = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            {
                path: "/",
                element: <Home />,
            },
            {
                path: "/login",
                element: <Login />,
            },
            {
                path: "/register",
                element: <Register />,
            },
            {
                path: "/superadmin",
                element: <Superadmin />,
                children: [
                    {
                        path: "profile",
                        element: <SuperadminProfile />
                    },
                    {
                        path: "institutions",
                        element: <InstitutionManagement />
                    },
                    {
                        path: "roles",
                        element: <RoleAssignment />
                    },
                    {
                        path: "roles/:userId",
                        element: <RoleAssignment />
                    }
                ]
            },
            
        ],
    },
])

export default PublicRoutes;