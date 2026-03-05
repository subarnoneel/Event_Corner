# Event Corner - SQL Functions Reference

## Overview
This document lists all PostgreSQL functions actively used in the Event Corner application.

---

## 1. User Authentication

| Function Name | Description |
|---------------|-------------|
| `register_user(p_firebase_uid, p_email, p_username, p_full_name, p_role, ...)` | Registers a new user with role assignment and institution verification |
| `login_user(p_firebase_uid)` | Verifies user login and returns user with roles |
| `get_user_by_id(p_user_id)` | Retrieves user by user_id with all assigned roles |
| `update_user_profile(p_user_id, p_full_name, p_username, p_profile_picture_url, ...)` | Updates user profile information |
| `search_users(p_search_term, p_role_filter, p_exclude_role, p_limit)` | Searches users by name, email, or username with role filtering |

---

## 2. Role Management

| Function Name | Description |
|---------------|-------------|
| `get_all_roles()` | Returns all active roles in the system |
| `assign_user_role(p_user_id, p_role_id, p_assigned_by)` | Assigns a role to a user |
| `remove_user_role(p_user_id, p_role_id, p_removed_by)` | Removes a role from a user |
| `bulk_assign_role(p_user_ids, p_role_id, p_assigned_by)` | Assigns a role to multiple users at once |

---

## 3. Institution Management

| Function Name | Description |
|---------------|-------------|
| `get_all_institutions(p_status, p_search, p_limit, p_offset)` | Returns all institutions with optional filtering |
| `get_pending_institutions(p_limit, p_offset)` | Returns institutions pending approval |
| `get_institution_details(p_institution_id)` | Gets detailed institution information |
| `get_institution_stats()` | Returns statistics about institutions |
| `verify_institution(p_institution_id, p_status, p_reason)` | Verifies or rejects an institution |
| `bulk_verify_institutions(p_institution_ids, p_status)` | Bulk verify/reject multiple institutions |
| `approve_institution(p_institution_id)` | Approves a pending institution |
| `reject_institution(p_institution_id, p_reason)` | Rejects an institution with reason |
| `get_organizers_by_institution(p_institution_id)` | Gets organizers belonging to an institution |
| `verify_organizer(p_user_id, p_status)` | Verifies or rejects an organizer |

---

## 4. Event Management

| Function Name | Description |
|---------------|-------------|
| `create_event_with_timeslots(p_title, p_description, ..., p_timeslots)` | Creates a new event with associated timeslots in a single transaction |
| `get_events(p_category, p_visibility, p_status, p_created_by, p_institution_id, p_search, p_limit, p_offset)` | Retrieves events with filtering, pagination, and sorting |
| `get_event_by_id(p_event_id)` | Gets detailed event information with all timeslots as JSONB |

---

## 5. Registration & Participants

| Function Name | Description |
|---------------|-------------|
| `create_event_registration_config(p_event_id, p_registration_type, p_template_type, ...)` | Creates or updates registration configuration for an event |
| `get_event_registration_config(p_event_id)` | Retrieves registration settings for an event |
| `check_user_registration_status(p_event_id, p_user_id)` | Checks if a user is registered for an event |
| `submit_event_registration(p_event_id, p_user_id, p_form_data, p_team_name, p_team_members, p_uploaded_files)` | Submits a registration application for an event |
| `get_pending_participants(p_organizer_id, p_event_id, p_page, p_limit)` | Lists participants awaiting approval for organizer review |
| `get_approved_participants(p_organizer_id, p_event_id, p_page, p_limit)` | Lists approved participants for an organizer's events |
| `approve_participant(p_participant_id, p_reviewer_id)` | Approves a participant's registration |
| `reject_participant(p_participant_id, p_reviewer_id, p_rejection_reason)` | Rejects a registration with optional reason |
| `get_events_with_participants_count(p_organizer_id)` | Gets events with pending/approved/rejected participant counts |
| `get_participant_emails_by_event(p_event_id, p_organizer_id)` | Returns email list of approved event participants |

---

## 6. Payment & Bookmarks

| Function Name | Description |
|---------------|-------------|
| `upsert_payment_config(p_event_id, p_is_paid_event, p_fee_amount, p_fee_type, p_refund_policy, ...)` | Creates or updates payment configuration for an event |
| `get_payment_config(p_event_id)` | Retrieves payment settings for an event |
| `get_event_transactions(p_event_id, p_page, p_limit)` | Lists all payment transactions for an event with summary |
| `get_user_transactions(p_user_id, p_page, p_limit)` | Lists all transactions by a user |
| `toggle_event_bookmark(p_user_id, p_event_id)` | Toggles bookmark status (adds if not exists, removes if exists) |
| `check_bookmark_status(p_user_id, p_event_id)` | Checks if a user has bookmarked an event |
| `get_user_bookmarked_events(p_user_id, p_limit, p_offset)` | Returns all bookmarked events for a user with pagination |

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
| `01_user_authentication.sql` | User registration, login & profile management |
| `02_role_management.sql` | Role assignment, removal & queries |
| `03_institution_management.sql` | Institution verification & organizer management |
| `04_event_management.sql` | Event & timeslot CRUD operations |
| `05_registration_participants.sql` | Registration config & participant management |
| `06_payment_bookmarks.sql` | Payment config, transactions & bookmarks |
| `07_triggers.sql` | Auto-update timestamp triggers |
