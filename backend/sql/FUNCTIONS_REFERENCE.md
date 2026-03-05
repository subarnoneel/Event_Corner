# Event Corner - SQL Functions Reference

## Overview
This document lists all PostgreSQL functions and triggers used in the Event Corner application.

---

## 1. User Authentication

| Function Name | Description |
|---------------|-------------|
| `get_user_by_email(p_email)` | Retrieves user details by email address |
| `create_user(p_name, p_email, p_password, p_profile_picture)` | Creates a new user account |
| `update_user_profile(p_user_id, p_name, p_profile_picture)` | Updates user profile information |
| `delete_user(p_user_id)` | Deletes a user account |
| `get_user_by_id(p_user_id)` | Retrieves user details by user ID |
| `get_all_users()` | Returns all users in the system |
| `update_user_email_verification(p_user_id, p_verified)` | Updates email verification status |
| `send_verification_email(p_email, p_token)` | Stores verification token for email confirmation |
| `verify_email_token(p_token)` | Verifies email using stored token |

---

## 2. Role Management

| Function Name | Description |
|---------------|-------------|
| `get_user_roles(p_user_id)` | Returns all roles assigned to a user |
| `assign_role(p_user_id, p_role_name, p_institution_id)` | Assigns a role to a user (optionally for an institution) |
| `remove_role(p_user_id, p_role_name, p_institution_id)` | Removes a role from a user |
| `check_user_role(p_user_id, p_role_name)` | Checks if a user has a specific role |
| `get_users_by_role(p_role_name)` | Returns all users with a specific role |
| `update_user_role(p_user_id, p_old_role, p_new_role, p_institution_id)` | Changes a user's role |

---

## 3. Institution Management

| Function Name | Description |
|---------------|-------------|
| `create_institution(p_name, p_email, p_admin_id, ...)` | Creates a new institution |
| `get_institution_by_id(p_institution_id)` | Retrieves institution details by ID |
| `get_all_institutions()` | Returns all institutions |
| `update_institution(p_institution_id, p_name, p_email, ...)` | Updates institution information |
| `delete_institution(p_institution_id)` | Deletes an institution |
| `get_institution_by_admin(p_admin_id)` | Gets institution managed by a specific admin |
| `approve_institution(p_institution_id)` | Approves a pending institution |
| `reject_institution(p_institution_id, p_reason)` | Rejects an institution with reason |
| `get_pending_institutions()` | Returns all institutions pending approval |
| `get_institution_organizers(p_institution_id)` | Lists all organizers of an institution |
| `add_institution_organizer(p_institution_id, p_user_id)` | Adds an organizer to an institution |
| `remove_institution_organizer(p_institution_id, p_user_id)` | Removes an organizer from an institution |

---

## 4. Event Management

| Function Name | Description |
|---------------|-------------|
| `create_event_with_timeslots(p_event_data, p_timeslots)` | Creates an event with its timeslots in one transaction |
| `update_event_with_timeslots(p_event_id, p_event_data, p_timeslots)` | Updates event and replaces timeslots |
| `get_events(p_filters)` | Retrieves events with optional filters |
| `get_event_by_id(p_event_id)` | Gets detailed event information by ID |
| `delete_event(p_event_id)` | Deletes an event and related data |
| `increment_event_view_count(p_event_id)` | Increments the view counter for an event |
| `add_event_timeslot(p_event_id, p_timeslot_data)` | Adds a new timeslot to an event |
| `update_event_timeslot(p_timeslot_id, p_timeslot_data)` | Updates an existing timeslot |
| `delete_event_timeslot(p_timeslot_id)` | Removes a timeslot from an event |

---

## 5. Registration & Participants

| Function Name | Description |
|---------------|-------------|
| `create_event_registration_config(p_event_id, p_config)` | Sets up registration configuration for an event |
| `get_event_registration_config(p_event_id)` | Retrieves registration settings for an event |
| `check_user_registration_status(p_user_id, p_event_id)` | Checks if a user is registered for an event |
| `submit_event_registration(p_user_id, p_event_id, p_form_data)` | Submits a registration application |
| `get_pending_participants(p_event_id)` | Lists participants awaiting approval |
| `get_approved_participants(p_event_id)` | Lists approved participants |
| `approve_participant(p_registration_id, p_approver_id)` | Approves a participant's registration |
| `reject_participant(p_registration_id, p_reason)` | Rejects a registration with reason |
| `get_events_with_participants_count(p_organizer_id)` | Gets events with participant counts for an organizer |
| `get_participant_emails_by_event(p_event_id)` | Returns email list of event participants |
| `register_for_event(p_user_id, p_event_id, p_timeslot_id)` | Quick registration for an event timeslot |
| `cancel_event_registration(p_user_id, p_event_id)` | Cancels a user's registration |
| `check_in_user(p_registration_id, p_checker_id)` | Marks a participant as checked-in |

---

## 6. Payment & Bookmarks

| Function Name | Description |
|---------------|-------------|
| `upsert_payment_config(p_event_id, p_config)` | Creates or updates payment configuration |
| `get_payment_config(p_event_id)` | Retrieves payment settings for an event |
| `get_event_transactions(p_event_id)` | Lists all payment transactions for an event |
| `get_user_transactions(p_user_id)` | Lists all transactions by a user |
| `toggle_event_bookmark(p_user_id, p_event_id)` | Toggles bookmark status (add/remove) |
| `check_bookmark_status(p_user_id, p_event_id)` | Checks if an event is bookmarked |
| `get_user_bookmarked_events(p_user_id)` | Returns all events bookmarked by a user |
| `bookmark_event(p_user_id, p_event_id)` | Adds an event to bookmarks |
| `remove_bookmark(p_user_id, p_event_id)` | Removes an event from bookmarks |

---

## 7. Triggers

| Trigger Name | Table | Description |
|--------------|-------|-------------|
| `events_updated_at` | `events` | Auto-updates `updated_at` timestamp on row modification |
| `timeslots_updated_at` | `event_timeslots` | Auto-updates `updated_at` timestamp on row modification |
| `registrations_updated_at` | `event_registrations` | Auto-updates `updated_at` timestamp on row modification |

### Trigger Function

| Function Name | Description |
|---------------|-------------|
| `update_events_timestamp()` | Returns `TRIGGER` - Sets `NEW.updated_at = NOW()` before update |

---

## File Organization

| File | Category |
|------|----------|
| `01_user_authentication.sql` | User auth & email verification |
| `02_role_management.sql` | Role assignment & checks |
| `03_institution_management.sql` | Institution CRUD & approval |
| `04_event_management.sql` | Event & timeslot operations |
| `05_registration_participants.sql` | Registration & check-in |
| `06_payment_bookmarks.sql` | Payment config & bookmarks |
| `07_triggers.sql` | Auto-update timestamp triggers |
