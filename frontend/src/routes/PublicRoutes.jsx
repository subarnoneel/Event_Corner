import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ExploreEvents from "../pages/ExploreEvents";
import Superadmin from "../pages/dashboard/superadmin/Superadmin";
import SuperadminProfile from "../pages/dashboard/superadmin/SuperadminProfile";
import UnifiedInstitutionManagement from "../components/UnifiedInstitutionManagement";
import RoleAssignment from "../pages/dashboard/superadmin/RoleAssignment";
import Admin from "../pages/dashboard/admin/Admin";
import AdminProfile from "../pages/dashboard/admin/AdminProfile";
import AdminUserManagement from "../pages/dashboard/admin/AdminUserManagement";
import CrawlerPage from "../pages/dashboard/admin/CrawlerPage";
import Institution from "../pages/dashboard/institution/Institution";
import InstitutionProfile from "../pages/dashboard/institution/InstitutionProfile";
import InstitutionMyEvents from "../pages/dashboard/institution/MyEvents";
import ManageOrganizers from "../pages/dashboard/institution/ManageOrganizers";
import Organizer from "../pages/dashboard/organizer/Organizer";
import OrganizerProfile from "../pages/dashboard/organizer/OrganizerProfile";
import OrganizerMyEvents from "../pages/dashboard/organizer/MyEvents";
import ParticipantManagement from "../pages/dashboard/organizer/ParticipantManagement";
import OrganizerPaymentDashboard from "../pages/dashboard/organizer/OrganizerPaymentDashboard";
import RegistrationFormBuilder from "../pages/dashboard/organizer/RegistrationFormBuilder";
import Participant from "../pages/dashboard/participant/Participant";
import ParticipantProfile from "../pages/dashboard/participant/ParticipantProfile";
import RegisteredEvents from "../pages/dashboard/participant/RegisteredEvents";
import BookmarkedEvents from "../pages/dashboard/participant/BookmarkedEvents";
import Calendar from "../pages/dashboard/participant/Calendar";
import MainLayout from "../components/MainLayout";
import ProtectedRoute from "./PrivateRoutes";
import EventAdd from "../pages/EventAdd";
import EventEdit from "../pages/EventEdit";
import EventDetail from "../pages/events/EventDetail";
import EventRegistrationForm from "../pages/events/EventRegistrationForm";
import PaymentSuccess from "../pages/events/PaymentSuccess";
import PaymentFail from "../pages/events/PaymentFail";


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
                        element: <UnifiedInstitutionManagement />
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
                        element: <UnifiedInstitutionManagement />
                    },
                    {
                        path: "users",
                        element: <AdminUserManagement />
                    },
                    {
                        path: "crawler",
                        element: <CrawlerPage />
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
                    {
                        path: "participants",
                        element: <ParticipantManagement />
                    },
                    {
                        path: "registration-form/:eventId",
                        element: <RegistrationFormBuilder />
                    },
                    {
                        path: "payments",
                        element: <OrganizerPaymentDashboard />
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
                    {
                        path: "registered-events",
                        element: <RegisteredEvents />
                    },
                    {
                        path: "bookmarked-events",
                        element: <BookmarkedEvents />
                    },
                    {
                        path: "calendar",
                        element: <Calendar />
                    },
                ]
            },
            {
                path: "/events/create",
                element: <ProtectedRoute allowedRoles={['organizer', 'institution']}><EventAdd /></ProtectedRoute>,
            },
            {
                path: "/dashboard/organizer/events/edit/:id",
                element: <ProtectedRoute allowedRoles={['organizer', 'institution', 'admin', 'super_admin']}><EventEdit /></ProtectedRoute>,
            },
            {
                path: "/event/:id",
                element: <EventDetail />
            },
            {
                path: "/event/:id/register",
                element: <ProtectedRoute allowedRoles={['participant', 'organizer', 'institution']}><EventRegistrationForm /></ProtectedRoute>
            },
            {
                path: "/payment/success",
                element: <PaymentSuccess />
            },
            {
                path: "/payment/fail",
                element: <PaymentFail />
            },
        ],
    },
])

export default PublicRoutes;