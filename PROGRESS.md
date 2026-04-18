# Gigsenda - Project Progress Log

## Project Overview
Gigsenda is a local services marketplace for Nigeria. It connects customers with trusted local service providers (plumbers, electricians, barbers, tutors, photographers, event planners, cleaners and more). Customers can search, book, and pay service providers directly through the app. The app takes a 10% commission on every transaction and pays the service provider 90% automatically.

## Tech Stack
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend/Database: Firebase (Firestore, Auth, Storage, Cloud Messaging)
- Hosting: Vercel (connected via GitHub)
- Payments: Paystack (Naira only)
- Maps/Location: OpenStreetMap + Leaflet
- Mobile: Capacitor (Android APK + iOS later)

## Service Categories
- Home Services (Plumber, Electrician, Carpenter, Cleaner)
- Beauty & Wellness (Barber, Hair Stylist, Makeup Artist)
- Education (Private Tutor, Lesson Teacher)
- Events & Creative (Photographer, Videographer, Event Planner, MC)
- Others

## User Types
1. Customer - searches and books service providers
2. Service Provider - lists services, receives bookings, gets paid
3. Admin - approves providers, monitors transactions, sees commission earnings

## Key Business Rules
- Customers chat with providers inside the app only (no calling — prevents off-platform transactions)
- Service providers must be approved by admin before going live
- App collects full payment via Paystack, takes 10% commission, sends 90% to provider automatically
- Currency: Nigerian Naira (₦) only

## Color Scheme
- Primary: Warm orange (similar to #FF8C00)
- Background: Clean white/cream
- Text: Dark grey/black
- Accent: Lighter orange tones

## Progress Tracker
### Completed
- [x] Project setup and folder structure
- [x] Dependencies installed
- [x] PROGRESS.md created
- [x] Firebase configuration (Auth, Firestore, Storage)
- [x] Authentication system (Email/Google, Firestore profiles)
- [x] Splash screen, onboarding, and account type selection
- [x] Sign Up and Login screens
- [x] Customer home screen
- [x] Service provider profile screen
- [x] Booking flow (UI and scheduling)
- [x] My Bookings screen
- [x] Booking Detail page with status tracking and actions
- [x] Customer Profile (Personal info, photo upload, settings)
- [x] Provider Profile Setup (Multi-step onboarding form)
- [x] Provider Business Profile (Stats, profile management, status)
- [x] In-app Chat System (Real-time messages, conversation list, unread badges)
- [x] Search & Filtering System (Search results, filter bottom sheet, provider cards, hooks/useSearch)
- [x] Reviews & Ratings System (Customer reviews, star ratings, automated provider score updates)
- [x] Admin Panel (Dashboard, Provider Approval, Customer Management, Bookings, Payments, Categories)
- [x] Role-based routing (admin→/admin/dashboard, approved provider→/provider/dashboard, unapproved→/pending-approval, customer→/home)
- [x] Provider Dashboard (/provider/dashboard) — stats, incoming requests, upcoming bookings, recent earnings
- [x] Provider Bookings page (/provider/bookings) — filter tabs: All, Pending, Confirmed, Completed, Cancelled
- [x] Provider Earnings page (/provider/earnings) — total/monthly/pending breakdown, full transaction list with 10% commission shown
- [x] ProviderBottomNav component (Dashboard, Bookings, Messages, Profile tabs)
- [x] Booking accept/decline actions from provider dashboard
- [x] Pricing system updated to fixed service packages (Basic/Standard/Premium) built from provider hourlyRate
- [x] Notifications page — real Firestore booking activity feed with unread badge on bell
- [x] Dynamic category system (Firestore parent/child structure: categories + subcategories collections)
- [x] Admin category management (create/delete categories with icon+slug, create/delete subcategories with categoryId reference, real-time grouped UI)
- [x] Home page categories/subcategories fetched from Firestore (real-time, no hardcoded arrays)
- [x] FilterBottomSheet categories fetched from Firestore (real-time)
- [x] getUserRole() helper in lib/auth.ts
- [x] role field added to all new user Firestore documents
- [x] useAuth hook exposes role directly
- [x] NotificationBell component — dropdown with recent notifications, unread badge, mark-as-read
- [x] Notifications Firestore system (lib/notifications.ts) — create, subscribe, mark read, mark all read
- [x] Push notifications on booking created, accepted, declined, and new chat message
- [x] Notifications page driven by real Firestore notifications collection
- [x] Composite Firestore indexes for notifications (userId+createdAt, userId+read) and messages (isRead)
- [x] Chat improvements — smart date formatting (time today / day name this week / date otherwise)
- [x] Chat read receipts — Sent / Delivered / Read ticks on own messages via status field
- [x] Chat pagination — load-more older messages button, initial instant scroll, smooth scroll on new messages
- [x] Chat markAsRead re-triggered on incoming messages; sets isRead on individual message docs
- [x] sendMessage caches conversation data to avoid redundant Firestore reads
- [x] lastMessageAt field written on every message send and conversation create
- [x] Booking accept/decline fires notifyBookingAccepted / notifyBookingDeclined to customer
- [x] Responsive desktop layout — sidebar nav visible on lg+ screens, bottom nav hidden on desktop
- [x] DesktopSidebar component — fixed left sidebar with nav links, unread badge, NotificationBell, logout
- [x] Next.js App Router route groups:
  - app/(customer)/layout.tsx — wraps home, bookings, chat, chat/[id], profile, search, notifications, book/[id]
  - app/(provider)/layout.tsx — wraps provider/dashboard, bookings, profile, earnings
- [x] All customer pages moved into app/(customer)/ route group
- [x] All provider pages moved into app/(provider)/ route group
- [x] Desktop content polish: lg:max-w, lg:grid-cols-2/3, lg:pb-8, lg:pt-8 on all pages
- [x] Provider dashboard desktop: two-column grid (requests + upcoming side by side), stats max-width
- [x] Provider bookings desktop: 2-col card grid
- [x] Chat page desktop: two-panel layout (conversation list left, chat panel right)
- [x] Admin 404 fix — login and AuthGuard now redirect admin to /admin (not /admin/dashboard which didn't exist); added /admin/dashboard redirect page as safety net
- [x] Admin Analytics Charts — Revenue, Bookings, Category, and Providers charts with date range selector and recharts integration
- [x] Home Page UI Improvements — Category pills with icons, Book buttons on provider cards, multi-slide hero banner with auto-rotation, dynamic customer name greeting
- [x] Provider Availability Calendar — Visual weekly calendar for providers to set availability, availability card on dashboard, customer booking page respects availability
- [x] Admin Settings Page — Comprehensive admin settings with tabs for General, Payment, Commission, Email, Branding, App Configuration, and Admin Account management
- [x] Provider Bank Details Collection — Step 5 in provider setup with Paystack API integration for Nigerian banks, account verification, and bank details management in provider profile
- [x] Paystack Subaccount Creation — Automatic subaccount creation for approved providers with admin dashboard status monitoring and manual creation fallback
- [x] Paystack Split Payment — Automatic 90/10 payment split with provider subaccounts, transaction tracking, settlement monitoring, and comprehensive admin dashboard
- [x] Admin Customer Management Fix — Comprehensive customer detail page with profile, statistics, admin actions (suspend/reactivate/delete/send message), recent bookings table, breadcrumb navigation, customer bookings page with filtering tabs, and fixed dropdown menu navigation
- [x] Payment Flow Fix — Booking creation redirects to payment checkout screen, payment verification updates booking status to "paid" with escrow details, notifications sent to provider and customer on successful payment
- [x] Escrow System — Full escrow hold/release/refund flow: funds held after payment, released via Paystack Transfer API when customer confirms completion, 72h auto-release safety net, dispute system with admin resolution page, pending payouts card on provider dashboard
- [x] Desktop Responsive Design — Fixed sidebar (260px) with navigation and user profile, home page 3-col provider grid and taller hero, search page with permanent filters sidebar + 3-col results grid, bookings two-column list+preview panel, chat two-column WhatsApp-style layout, profile two-column photo/stats+forms layout, 1200px max-width on all pages

- [x] Provider-First Booking Flow — Provider must accept before customer can pay; status flow: pending → accepted → paid → in_progress → completed
- [x] Centralized Status Labels — lib/booking-status.ts with customer/provider label maps, StatusBadge and StatusTimeline components
- [x] Pay Now Button Fix — Persistent Pay Now button on accepted bookings, visible after refresh or returning later; paymentStatus "pending" no longer blocks checkout
- [x] Complete Booking Management System:
  - Customer detail page: progress tracker (4 steps), Pay Now, Mark as Complete, Leave Review (inline modal), Raise Dispute (with category + disputes Firestore collection), elapsed timer, disputed/cancelled states
  - Provider detail page: Accept/Decline, Start Job, live elapsed timer on in_progress, Mark as Completed (sends customer notification), Report Issue (modal + disputes collection), settlement card with earnings breakdown on completed, View Earnings button
  - Dispute modal: category dropdown (5 options), description (min 20 chars), writes to disputes collection, notifies admin + both parties
  - Review modal: inline star rating + comment, uses existing ReviewModal component + addReview from lib/reviews
  - Customer bookings list: Awaiting tab (pending + accepted), Active tab (paid + in_progress only), Pay Now button on card

### In Progress
- [x] Payment integration (Paystack) — COMPLETED

### Pending
- Capacitor mobile setup
</toolcall_result>
