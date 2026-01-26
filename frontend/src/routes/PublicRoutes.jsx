import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ExploreEvents from "../pages/ExploreEvents";
import Superadmin from "../pages/dashboard/superadmin/Superadmin";
import SuperadminProfile from "../pages/dashboard/superadmin/SuperadminProfile";
import InstitutionManagement from "../pages/dashboard/superadmin/InstitutionManagement";
import RoleAssignment from "../pages/dashboard/superadmin/RoleAssignment";
import Admin from "../pages/dashboard/admin/Admin";
import AdminProfile from "../pages/dashboard/admin/AdminProfile";
import AdminInstitutionManagement from "../pages/dashboard/admin/AdminInstitutionManagement";
import AdminUserManagement from "../pages/dashboard/admin/AdminUserManagement";
import Institution from "../pages/dashboard/institution/Institution";
import InstitutionProfile from "../pages/dashboard/institution/InstitutionProfile";
import InstitutionMyEvents from "../pages/dashboard/institution/MyEvents";
import ManageOrganizers from "../pages/dashboard/institution/ManageOrganizers";
import Organizer from "../pages/dashboard/organizer/Organizer";
import OrganizerProfile from "../pages/dashboard/organizer/OrganizerProfile";
import OrganizerMyEvents from "../pages/dashboard/organizer/MyEvents";
import Participant from "../pages/dashboard/participant/Participant";
import ParticipantProfile from "../pages/dashboard/participant/ParticipantProfile";
import MainLayout from "../components/MainLayout";
import ProtectedRoute from "./PrivateRoutes";
import EventAdd from "../pages/EventAdd";
import EventDetail from "../pages/events/EventDetail";


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
                path: "/events",
                element: <ExploreEvents />,
            },
            {
                path: "/superadmin",
                element: <ProtectedRoute allowedRoles={['super_admin']}><Superadmin /></ProtectedRoute>,
                children: [
                    {
                        index: true,
                        element: <Navigate to="profile" replace />
                    },
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
                ]
            },
            {
                path: "/admin",
                element: <ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>,
                children: [
                    {
                        index: true,
                        element: <Navigate to="profile" replace />
                    },
                    {
                        path: "profile",
                        element: <AdminProfile />
                    },
                    {
                        path: "institutions",
                        element: <AdminInstitutionManagement />
                    },
                    {
                        path: "users",
                        element: <AdminUserManagement />
                    },
                ]
            },
            {
                path: "/institution",
                element: <ProtectedRoute allowedRoles={['institution']}><Institution /></ProtectedRoute>,
                children: [
                    {
                        index: true,
                        element: <Navigate to="profile" replace />
                    },
                    {
                        path: "profile",
                        element: <InstitutionProfile />
                    },
                    {
                        path: "events",
                        element: <InstitutionMyEvents />
                    },
                    {
                        path: "organizers",
                        element: <ManageOrganizers />
                    },
                ]
            },
            {
                path: "/organizer",
                element: <ProtectedRoute allowedRoles={['organizer']}><Organizer /></ProtectedRoute>,
                children: [
                    {
                        index: true,
                        element: <Navigate to="profile" replace />
                    },
                    {
                        path: "profile",
                        element: <OrganizerProfile />
                    },
                    {
                        path: "events",
                        element: <OrganizerMyEvents />
                    },
                ]
            },
            {
                path: "/participant",
                element: <ProtectedRoute allowedRoles={['participant']}><Participant /></ProtectedRoute>,
                children: [
                    {
                        index: true,
                        element: <Navigate to="profile" replace />
                    },
                    {
                        path: "profile",
                        element: <ParticipantProfile />
                    },
                ]
            },
            {
                path: "/events/create",
                element: <ProtectedRoute allowedRoles={['organizer', 'institution']}><EventAdd /></ProtectedRoute>,
            },
            {
                path: "/event/:id",
                element: <EventDetail/>
            },
        ],
    },
])

export default PublicRoutes;