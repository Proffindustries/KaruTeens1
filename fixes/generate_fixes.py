#!/usr/bin/env python3
import json, os

analyses = [
    {"file":"AboutPage.jsx","needs":[],"cans":["Static page — consider lazy loading since not above the fold","All content hardcoded; consider fetching from CMS to avoid redeploy"],"mays":["Add entrance animations on hero and cards","Add back-to-top button","Make email/contact links actionable"]},
    {"file":"ActivityFeedPage.jsx","needs":["Dead code: ActivityRow component defined but never rendered — remove or actually use","handleActivityClick not wrapped in useCallback","Loading state is plain text — needs proper skeleton","Error state uses window.location.reload() — use refetch() instead"],"cans":["formatTime and getActivityIcon recreated every render — lift outside component","framer-motion for simple animations — use CSS transitions to reduce bundle","Grouped activities recalculation is properly memoized"],"mays":["Add infinite scroll for large feeds","Add sound/vibration for new real-time activities","Add undo toast when deleting activity"]},
    {"file":"AdminDashboard.jsx","needs":["SettingsTab useEffect fetches settings with NO cleanup — state update on unmounted component","fetchStats silently returns null on error — UI shows all-zero stats with no error banner","Duplicate tab cases: both 'academic' and 'revision' map to RevisionManagementTab","All 11 management tabs eagerly imported — huge initial bundle","handleClearCache catches error but does nothing with it"],"cans":["Lazy-load each management tab with React.lazy + Suspense","StatsCard and sub-components defined inside module — extract to separate files","toggleSidebar and toggleTheme not wrapped in useCallback","stats fields accessed without optional chaining — will crash if API returns undefined"],"mays":["Add keyboard shortcuts for tab navigation (Ctrl+1, Ctrl+2, etc.)","Add collapse all button for sidebar","Add confirmation before toggling maintenance mode"]},
    {"file":"AiPage.jsx","needs":["setTimeout in handleCopy not cleaned up on unmount","setTimeout(fetchModels, 5000) in handleTriggerPing not cleaned up","Array index used as key for messages — breaks AnimatePresence exit animations","handleSend reads messages from stale closure — multiple rapid sends could use stale history"],"cans":["Messages array grows unboundedly — implement max 50 message limit","fetchModels has no caching — refetches every time tab is visited","Verify tree-shaking for lucide-react icons"],"mays":["Add streaming (SSE/WebSocket) for token-by-token reply","Add markdown rendering with syntax highlighting","Add suggested prompts carousel","Add chat history persistence"]},
    {"file":"AnalyticsTab.jsx","needs":["timeRange state declared and rendered as select but NEVER sent to API — changing dropdown does nothing","useEffect has NO cleanup — state update on unmounted component","No error retry mechanism — only toast, no Retry button","No empty-state for chart data — reduce on empty array throws TypeError"],"cans":["Data fetched once on mount and never refreshed — add auto-refresh interval","tickFormatter inline arrow functions recreated every render — extract to constants","Download button has no onClick handler — decorative","Chart heights hardcoded at 300px — not responsive"],"mays":["Add date-range picker instead of fixed presets","Add CSV/PDF export with actual implementation","Add annotations for notable events","Add compare periods mode"]},
    {"file":"BlogDetailPage.jsx","needs":["Share button has NO onClick handler — decorative","Array index used as key for paragraph mapping"],"cans":["BLOG_POSTS imported from BlogPage.jsx creates hard coupling — prevents code-splitting","Post content split by double-newline — no support for formatting, links, images","Hardcoded fallback image URL with no onError handler","Related posts filter runs every render — not memoized"],"mays":["Add table of contents sidebar","Add estimated read time","Add social sharing via Web Share API","Add dark mode support"]},
    {"file":"BlogPage.jsx","needs":["Newsletter form has onSubmit with e.preventDefault() and NO submission logic — decorative"],"cans":["All blog data hardcoded in JS bundle — should fetch from CMS","Newsletter input uncontrolled — always empty on re-render","BLOG_POSTS exported and consumed by BlogDetailPage — couples both pages"],"mays":["Add search/filter by category","Add featured post carousel","Add pagination or Load More","Add RSS feed link"]},
    {"file":"CommentManagementTab.jsx","needs":["loadComments calls API with NO filter params — extensive filter UI has zero effect","handleBulkAction, confirmModeration, handleDeleteComment only update LOCAL state — no API calls","Refresh buttons have empty onClick handlers","showSpamRulesModal form fields have NO value/onChange — can never be submitted","Error handling uses only console.error — no user-facing error state","Massive 50+ icon import from lucide-react","User stats section has no loading indicator"],"cans":["1186-line file should be split into smaller components","getStatusBadge, getContentTypeBadge etc. recreated every render — extract outside component","getDaysSinceCreated uses new Date() on every render — compute once","reports.map uses index as key","userStats.length > 0 check missing"],"mays":["Add real-time updates via WebSocket","Add moderation audit log","Add AI-powered suggested moderation actions","Add keyboard shortcuts (j/k, a/r/d)"]},
    {"file":"ConfessionsPage.jsx","needs":["isError destructured but NEVER used — failed fetch shows infinite spinner, not error","window.prompt() for report reason — poor UX, not accessible, blocks UI thread","Array index used as key for comments","handleLike has optimistic update but NO error rollback — like count permanently incremented if API fails","handleLike has no loading/disabled state — user can spam-click"],"cans":["handleShare swallows errors silently","Character count displayed but no maxLength on textarea — user can type past 280","handleToggleComments triggers useQuery for comments — no cache timeout, refetches every time","commentMutation onSuccess invalidates AND optimistically updates — double work"],"mays":["Add character counter with progress bar","Add confession categories/tags with filter tabs","Add hot sort by like count","Add anonymous media attachments"]},
    {"file":"ContactPage.jsx","needs":["handleSubmit only calls e.preventDefault() and setStatus('sent') — form NEVER sends data","No API endpoint integration — no fetch/axios call","Email/phone as plain text, not clickable links","Form inputs uncontrolled — values cannot be read on submit","No validation beyond browser required attribute"],"cans":["FAQ section hardcoded inline — extract to data file","No loading state (no submission exists, but will be needed when API is added)","Success state does not reset form inputs"],"mays":["Add reCAPTCHA to prevent spam","Add live chat widget","Show estimated response time","Add localStorage draft saving"]},
    {"file":"ContentModerationTab.jsx","needs":["Filters object recreated on every keystroke — triggers API refetch on every filter change with no debounce","Refresh button onClick is empty function — dead UI","No empty state for moderation queue — blank list with '0 items'","No error boundary — API failure shows only toast","handleBulkAction has stale closure risk","getPercent uses Object.values.reduce every render"],"cans":["30 lucide-react icons imported — consider tree-shaking or dynamic imports","No debounce on search — API call on every keystroke","Handlers recreated every render — should use useCallback","getPercent called repeatedly per render — memoize with useMemo","No client-side filtering — API refetched on every filter change","No pagination — all items loaded at once"],"mays":["No keyboard navigation for queue items","No batch select via shift-click","No sort options (newest, oldest, severity)"]},
    {"file":"DonatePage.jsx","needs":["No loading state during initial data fetch — blank page until API responds","No error handling in fetchDonationData — catch only logs","No cleanup in useEffect — state update on unmounted component","handleSuccess fires two fire-and-forget promises with no error handling","Array key uses index for recentDonors","Amount validation: empty string passes parseFloat as NaN"],"cans":["Raw fetch in useEffect instead of React Query — no caching, deduplication, background refetch","formatTime recalculates for every donor on every render","percentage recalculated every render","Stats and donors fetched via Promise.all but could be cached","No type validation on donation amount input"],"mays":["No confetti or celebration on successful donation","No share buttons for campaign","No donor leaderboard or impact metrics"]},
    {"file":"EventDetailPage.jsx","needs":["No error state for network failures — 'Event not found' shown even for 500 errors","currentRSVP initialized to null — doesn't reflect user's existing RSVP status from server","handleRemoveRSVP has no onError handler","RSVP buttons' onClick handlers create new functions each render","No suspense boundary"],"cans":["startDate and endDate recreated every render — wrap in useMemo","Inline arrow functions in JSX create new references each render","Hero image has no loading='lazy'"],"mays":["No Add to Calendar buttons","No share event button","No map view for physical location","No attendee list"]},
    {"file":"EventManagementTab.jsx","needs":["Calendar view is placeholder with empty grid — dead feature","handleAddEvent and handleEditEvent duplicate ~80 lines of date/time logic","handleBulkAction calls events.find inside Promise.all.map — O(n*m) with no hash map","No confirmation dialog for bulk publish/cancel/visibility changes (only delete has confirm)","No pagination — all events loaded at once","getDaysUntilEvent called 4 times per event row","Export/Import/Analytics buttons have no onClick handlers — dead UI"],"cans":["42 lucide-react icons imported — massive bundle impact","1486-line component — split into smaller components","No virtualization in event table","No debounce on search filter","confirm() blocks main thread","handleBulkAction uses Promise.all with no partial-failure handling"],"mays":["No drag-and-drop for event reordering","No inline editing","No ability to duplicate events"]},
    {"file":"EventsPage.jsx","needs":["No error state handling — useEvents fails silently, shows empty state on server errors","EmptyState and CreateModal recreated as JSX variables every render","EventCard receives navigate prop recreated every render","CreateEventModal formData has no validation (negative max_attendees, missing dates)","imageInputRef onChange has no isMounted check","No form reset on successful submission"],"cans":["CreateEventModal uses individual useState for each field — 8+ re-renders per keystroke","No lazy loading for CreateEventModal — always imported","categoryFilter changes trigger new API fetch with no cache","EventCard motion.div creates intersection observers for all cards simultaneously"],"mays":["No search bar for events","No My Events tab","No calendar view toggle"]},
    {"file":"ExplorePage.jsx","needs":["Array index used as key in nested maps","No loading state for trending topics — no indicator shown to user","No error handling for useTrendingTopics — undefined silently dropped","Static 270+ line categories/links data structure recreated every render"],"cans":["20 individual lucide-react icon imports","Component re-renders on every state change — no memoization","Link components have no prefetching","Avatar with size='3xl' has no lazy loading"],"mays":["No search/filter bar","No recently visited section","No keyboard navigation shortcuts"]},
    {"file":"FeedPage.jsx","needs":["newPostsCount state never incremented — dead code","openSearch setTimeout with no cleanup — ref on unmounted component","All three feed hooks called unconditionally — hooks still initialize even when disabled","isOffline reads navigator.onLine at module evaluation time — ReferenceError if SSR","handleKeyDown doesn't check event target before preventDefault for '/'","No error boundary at FeedPage level — only per-PostCard"],"cans":["Three feed hooks all execute queries on mount — wastes bandwidth for inactive ones","Virtuoso overscan={200} aggressive — rendering overhead on low-end","showAds calculated inline every render — not useMemo'd","PostCards receive inline onReport callback — new reference each render"],"mays":["No scroll position restoration when switching feed types","No pull-to-refresh on mobile","No offline support beyond banner"]},
    {"file":"ForgotPasswordPage.jsx","needs":["No error display for mutation failures — forgotPassword.isError not checked","No success state after password reset — user remains on step 2","Resend button goes to step 1 but does NOT pre-fill email — user must retype","Reset code input has no format validation (digits only)","No password strength requirements"],"cans":["Heavy use of inline styles — reduces maintainability","No form validation library","No animation when switching steps"],"mays":["No password visibility toggle","No auto-submit when 6-digit code fully entered","No countdown timer for code resend"]},
    {"file":"GetAccountPage.jsx","needs":["Pro/Alumni card has no role or aria-disabled — not keyboard accessible","soon ribbon uses hardcoded pixel values — breaks on different viewports","Student card hover/focus state not distinguishable from disabled card"],"cans":["Heavy use of inline styles — move to CSS classes","Static page data hardcoded — come from config file","No React.memo — re-renders if parent re-renders"],"mays":["No account type comparison table","No student testimonials","No Notify Me signup for Pro"]},
    {"file":"GroupDetailPage.jsx","needs":["No distinction between 'not found' (404) and 'server error' (500) — both show 'Group not found'","groupColor fallback uses Math.random() — random color changes on every remount","handleAvatarUpload has no isMounted check","handleUpdateGroup has no disabled/loading state — double-click risk","handleDeleteGroup has no loading indicator between confirm and navigate","handleLeaveGroup has no onError callback","Menu dropdown does not close on outside click","No error state for useGroupPosts"],"cans":["Handlers recreated every render — should use useCallback","canEdit recalculated every render — wrap in useMemo","Posts list has no virtualization","Inline styles mixed with CSS classes throughout","shouldBlur imported but not used","CustomVideoPlayer/AudioPlayer imported but not used"],"mays":["No member list or count breakdown","No group rules display","No pinned posts section","No Invite Members feature"]},
    {"file":"GroupManagementTab.jsx","needs":["CRITICAL: getMemberInfo is async but called synchronously in render — returns Promise, not resolved data","CRITICAL: getMemberInfo calls setUserCache inside itself — triggers setState during render","CRITICAL: Bulk actions mutate local state only without calling API — changes lost on refresh","CRITICAL: handleAddMember, handleRemoveMember, handleMakeAdmin modify local state only","Import/Export buttons have no onClick handlers","getMemberInfo fetches users with no loading indicator","No error boundary"],"cans":["27 lucide-react icons imported","Filter state spread on every keystroke — triggers re-render of entire table","No memoization of filtered groups list — recomputes every render","userCache grows unboundedly — memory issue with many users","No pagination for groups table","Refresh buttons are no-ops"],"mays":["Add/Edit modals are UI shells — no actual API submit","No keyboard shortcuts for bulk actions","No empty state when groups array empty"]},
    {"file":"GroupsPage.jsx","needs":["getGroupColor falls back to Math.random() for falsy groupId — random color every render causes flickering","No error state for useGroups hook failure — no error UI shown","EmptyState and CreateModal recreated as JSX variables every render","renderItem receives GroupCard as new React element every render — ListPage can't optimize","No React.memo on GroupCard","handleJoinGroup not wrapped in useCallback"],"cans":["GroupCard accepts navigate and handleJoinGroup as props — change every render","No lazy loading for CreateGroupModal","categories array recreated every render — hoist to module scope"],"mays":["Search input has 300ms debounce — good","Create modal auto-closes on success — good"]},
    {"file":"HomePage.jsx","needs":["useEffect has location in deps but only uses location.state — effect re-runs on EVERY location change, causing redirect loop","Social media icon links use href='#' — navigate to current page","Redirect logic forces authenticated users away from Home — explicitHome workaround is fragile","No lazy loading for hero image — blocks render on slow connections"],"cans":["framer-motion imported for two simple animations — use CSS keyframes instead to save bundle","Hero stats are hardcoded decorative text — not driven by real data","FAQ content hardcoded — fetch from CMS"],"mays":["Add scroll-triggered animations for feature cards","Social links should point to real profiles"]},
    {"file":"HookupPage.jsx","needs":["window.location.reload() after payment — kills all React state, full page reload","handleSwipe onSuccess references discovery from stale closure — out-of-bounds access risk","showToast in payment polling useEffect deps — if showToast not wrapped in useCallback, interval re-created every render","discovery[currentMatchIndex] can be undefined if data refetched with fewer items — no guardrail","No error state rendered for aliasError","sendHeartLocally setTimeout has no cleanup","handleSwipe does not guard against double-swipes"],"cans":["Alias form uses object spread on every keystroke — batch updates","No useCallback on handlers","Payment polling interval at 10s — reasonable but could use exponential backoff"],"mays":["Good use of AnimatePresence for swipe transitions","Could add 'undo pass' feature","Age input accepts negative numbers — add min attribute"]},
    {"file":"LeaderboardsPage.jsx","needs":["useEffect fetching has NO abort controller — state update on unmounted component","No error UI when API fails — console.error only, user sees empty leaderboard","key prop on items uses user.rank — if two users have same rank, React misidentifies rows","Data fetched once, never refreshed — stale for entire session","Switching tabs does NOT refetch data"],"cans":["renderLeaderboard function redefined inline every render","All four datasets fetched regardless of active tab — could lazy-load per tab","Skeleton loading is implemented — good","No useCallback on setActiveTab"],"mays":["Rank icons with crown colors for top 3","Current user highlighted","Could add week-over-week rank change indicators"]},
    {"file":"LegalPage.jsx","needs":[],"cans":["activeTab state — use URL search params instead for deep-linking","Content hardcoded — fetch from CMS for updates without redeploy"],"mays":["Add anchor/jump links for each section","Add print-friendly stylesheet","Add 'Last Updated' dynamic date"]},
    {"file":"LiveStreamPage.jsx","needs":["CRITICAL: goLive subscribes to Ably channels with NO cleanup — subscriptions remain active after unmount","CRITICAL: joinStream subscribes with no unsubscribe on unmount","CRITICAL: sendHeartLocally setTimeout has no cleanup","CRITICAL: No useEffect cleanup that calls stopLive()/leaveStream() on unmount","sendMessage accesses currentStream from closure — race condition if stream ref changes","No WebRTC error handling for connection drops","chatMessages.map uses array index as key — keys shift on every new message","fetchStreams has no error UI"],"cans":["No useCallback on sendMessage, sendHeart, sendGift, joinStream, etc.","streamTitle defaults to ${user?.username}'s Live — shows 'null's Live' if user loads async","gifts/hearts arrays grow but cleaned via setTimeout — good but needs unmount cleanup","Active streams poll every 10s — no manual refresh button"],"mays":["Gift animation with AnimatePresence","Floating hearts — delightful micro-interactions","Stream preview before going live","Could add picture-in-picture mode"]},
    {"file":"LoginPage.jsx","needs":["CRITICAL: verify2fa mutation has NO onSuccess/onError — failed 2FA silently does nothing","CRITICAL: login mutation has onSuccess but NO onError — failed login shows no error message","Stale closure risk: setShow2fa called inside onSuccess — if component re-renders between submit and callback, wrong setShow2fa called","No loading state for 2FA step — isPending covers both login and verify, can't distinguish","2FA OTP input has no autoFocus","No way to resend 2FA code"],"cans":["errors state spread on every field change — unnecessary re-renders","No useCallback on handlers","All styles inline — ~3KB of repeated style objects"],"mays":["Good field-level error messages","Password visibility toggle implemented","Could add social login buttons","Could add Remember me checkbox"]},
    {"file":"MarketplaceItemPage.jsx","needs":["currentUser.id vs item.seller_id type mismatch — == vs === could fail","Error state renders error.message directly — exposes sensitive backend details","Loading state is plain text — no skeleton","handleContactSeller navigates to /messages with state — verify MessagesPage handles it","handleMarkSold/Boost/Delete use window.confirm() — blocks main thread","No useCallback on handlers","Image thumbnails use index as key","No error handling for useMarketplaceItem network errors"],"cans":["All images load eagerly with no loading='lazy'","motion imported from framer-motion but no motion.* components used — dead import","No memoization of isOwner, isBoosted"],"mays":["Could add lightbox for full-size images","Could add Similar Items section","Could add Report Listing button"]},
    {"file":"MarketplacePage.jsx","needs":["error from useMarketplaceItems destructured but NEVER used — API failure shows infinite loading or empty state with NO error","No error state UI at all","Ad insertion relies on index — ad position shifts when items change","loading state is plain text — no skeleton grid"],"cans":["CreateItemModal eagerly imported — lazy-load with React.lazy","No useCallback on category filter or search handlers","items.map re-computes entire grid every render — no memoization","AdComponent inserted at fixed index — may not be optimal for all screens"],"mays":["Search has 300ms debounce — good","Images use loading='lazy' — good","Could add price range filter","Could add infinite scroll"]},
    {"file":"MediaManagementTab.jsx","needs":["useEffect sets setIsLoading(true) directly in effect body — violates react-hooks/exhaustive-deps, causes extra re-render","No debouncing on filter/search — every keystroke triggers full re-fetch","filters.search used as controlled input but not initialized in filters state — undefined","Memory leak: handleUploadMedia setTimeout with no cleanup","Optimization/Storage/CDN tabs have NO loading states — use mock data","Refresh buttons are no-ops","No empty state for optimization jobs — empty table renders","All modals are UI shells with no API submit logic"],"cans":["47+ lucide-react icons imported, many unused (Battery, Network, etc.)","No useCallback on any handler","No useMemo on computed data — getFileIcon, getStatusBadge create new elements every render","formatFileSize runs on every render for every file","No virtualization for media files table"],"mays":["Upload modal has drag-and-drop area but no actual drag handlers","No upload progress indicators","No pagination","CDN/Storage analytics entirely mock"]},
    {"file":"MessagesPage.jsx","needs":["Three console.log debug effects logging sensitive data to console in production","No React error boundary around 2059-line component with WebRTC and complex state","LinkPreview useEffect has no cleanup","handleSend confetti setTimeout never cleaned up","uploadProcessRef.current reassigned every render — stale closure risk","renderMedia recreates large function every render","startRecording creates media stream but cleanup doesn't stop stream.getTracks() — microphone stays active","VoiceNotePlayer play() Promise rejection unhandled","handleFileUpload overwrites selection with no validation"],"cans":["2059-line component — refactor into smaller files","All event handlers defined inline, recreated every render","All modal components eagerly imported — no React.lazy","25+ hooks from useMessages.js add bundle weight","Chat list renders all chats with no virtualization","Message list renders all messages with no virtualization"],"mays":["Confetti animation very basic (10 hardcoded divs)","Voice note waveform uses static random heights","No infinite scroll for messages","No typing indicators shown"]},
    {"file":"NotFoundPage.jsx","needs":[],"cans":["framer-motion import for single infinite-bounce animation — adds bundle weight for 404 page"],"mays":["No Go Back button — only Back to Home","Could auto-redirect after timeout","Could show different illustrations for different errors"]},
    {"file":"NotificationsPage.jsx","needs":["NotificationRow defined with useCallback but NEVER rendered — dead code","Error state extremely minimal — no retry button or helpful message","No loading/error state for individual mutation actions","getIcon and formatTime create new values every render"],"cans":["No virtualization for notifications list","NotificationRow (dead code) uses useCallback with empty deps — captures stale versions of markRead, deleteNotif"],"mays":["No pagination or infinite scroll","No pull-to-refresh on mobile","No notification grouping"]},
    {"file":"OnboardingPage.jsx","needs":["Memory leak: URL.createObjectURL(file) NEVER revoked with URL.revokeObjectURL","completeOnboarding and handleSkip call window.location.reload() after navigate — redundant, clears React state","No form validation on any step — full_name empty, age negative/zero, reg format not validated","completeOnboarding doesn't set loading=false on success path","Avatar upload never actually uploads — comment says 'Normally we'd upload to Cloudinary' but never implemented","No loading state for Skip button — can press multiple times"],"cans":["renderStep is large switch recreating all step JSX every render","handleNext depends on completeOnboarding which depends on profileData — recreated on every input change","22+ lucide-react icons imported"],"mays":["No progress persistence — refresh restarts onboarding","No skip confirmation dialog","Accessibility: progress dots lack aria-labels"]},
    {"file":"PageDetailPage.jsx","needs":["No React error boundary","handleDeletePage has no loading/disabled state — double-click risk","Uses browser confirm() for deletion","No loading state for follow/unfollow mutations","Media tab filters posts client-side — server-side filtering needed for large datasets","Load More not automatically triggered via IntersectionObserver — requires manual click"],"cans":["posts computed as pages.flatMap runs on every render — should use useMemo","No React.memo on PostCard","Tab content all eagerly rendered — inactive tabs still in DOM"],"mays":["Could use in-app confirmation modal for deletion","Could add share functionality","Could add related pages suggestions"]},
    {"file":"PageManagementTab.jsx","needs":["useEffect depends on filters which is new object every render — refetch on every state change even on keystroke","filters.search triggers API calls on every keystroke with no debounce","All modals have forms with no onSubmit connected to API — decorative only","Refresh buttons are no-ops","No pagination — fetches ALL pages at once","No loading state for individual row actions","Bulk delete uses browser confirm()"],"cans":["No useCallback on any handler","Large lucide-react imports with many unused icons","All modals rendered in main bundle — cannot be lazy-loaded","No table virtualization","Analytics modal shows hardcoded mock text"],"mays":["Import/Export buttons have no click handlers","No rich text editor for page content","No revision history or draft preview"]},
    {"file":"PagesPage.jsx","needs":["No dedicated error UI — failed fetch shows empty grid with no error message (only brief toast)","Empty state reads 'No pages found matching your search.' even when there are simply NO pages — misleading","CreatePageModal calls fetchPages on close even if create failed — unnecessary API call","No loading state for individual page cards — only text 'Loading pages...'"],"cans":["filteredPages runs .filter and .toLowerCase on every render for every page — memoize with useMemo","No pagination or infinite scroll","No React.memo on page card Link elements"],"mays":["No category-based filtering beyond search","No sorting options","No My Pages section"]},
    {"file":"PostDetailPage.jsx","needs":["No React error boundary","handleBack uses navigate(-1) — could navigate away from app entirely if no browser history","postUrl uses window.location.href — incompatible with SSR","No loading/error state for AdComponent"],"cans":["PostCard not wrapped in React.memo — re-renders on every parent state change","SEO component may update head on every render"],"mays":["No related posts shown","No comments section on detail page","No share functionality"]},
    {"file":"PostManagementTab.jsx","needs":["CRITICAL: fetchData depends on filters (new object every render) — useEffect re-fetches on EVERY render (infinite-ish loop)","No debouncing on filter changes — every keystroke triggers full API call","Refresh buttons are no-ops","handleBulkAction sets isLoading(true) hiding table during operation — no visibility into progress","isProcessing only tracks single post ID — rapid actions not tracked","Bulk action 'make_featured'/'make_premium' have NO case in handleBulkAction — silently do nothing","formatEngagementRate calls toFixed on undefined — crashes with NaN%","Line 738 accesses post.analytics.engagement_rate — throws if analytics undefined","Add/Edit modals are decorative with no onSubmit","No pagination — fetches ALL posts at once","currentMonth declared but never used"],"cans":["1548-line component — split into smaller files","No useCallback on any handler except fetchData","All modals eagerly rendered in main bundle","No table virtualization","Large lucide-react imports"],"mays":["Import/Export buttons have no click handlers","No rich text editor","No draft auto-save","No scheduling calendar view"]},
    {"file":"PremiumPage.jsx","needs":["setTimeout in handleSuccess no cleanup — redirect fires on unmounted component","No loading/submitting state when payment processing — user can click Upgrade multiple times","No error handling around MpesaPaymentModal onSuccess/onError flow"],"cans":["getAmount recreated every render — minor, pure computation"],"mays":["Add current plan indicator","Use React Router navigate() instead of window.location.href"]},
    {"file":"ProfilePage.jsx","needs":["window.location.href on media grid click — full-page hard navigation, breaks SPA","window.location.reload() in error handler — use refetch() instead","26 icons from lucide-react — bundle bloat","framer-motion (AnimatePresence, motion.div) for simple fade/slide — heavy dependency for minimal effect","editForm (15 fields) fully spread on every keystroke — re-renders entire modal on each input change"],"cans":["No useCallback on handleFollowToggle, handleUpdate, openEditModal","No virtualization for infinite-scrolled posts/media/likes"],"mays":["Add confirmation before discarding unsaved edit changes","Add error boundaries around PostCard rendering","Locked profile could show blurred preview instead of full lock"]},
    {"file":"RecallPage.jsx","needs":["No empty state when materials array is empty — materials-grid renders nothing","handleView sets viewingDoc before async fetch — state update on unmounted component if component unmounts","handleUnlock is a stub — only shows toast, no actual payment flow","showToast in useCallback deps — if showToast identity changes, fetchMaterials recreated and useEffect re-fires"],"cans":["No pagination or infinite scroll for materials grid"],"mays":["Add 'no results' message with suggestion to adjust filters","Add PDF preview component","Add search debounce on AcademicFilters"]},
    {"file":"ReelManagementTab.jsx","needs":["MASSIVE: 87 named icon imports from lucide-react — half the entire icon set","No empty state when reels array empty — table body renders nothing","Bulk actions only update local state — NEVER call API","filters object in useEffect deps — new reference every render causes Promise.all to re-fire every render","No error toast when API calls fail","Promise.all has no AbortController","Mock data (~150 lines) never rendered — dead code"],"cans":["Wrap all handlers in useCallback","Replace 87-icon import with dynamic import or subset","Add confirmation modals instead of native confirm()","Add pagination or virtual scrolling","currentMonth declared but never used"],"mays":["Collapse advanced filters behind toggle"]},
    {"file":"ReelsPage.jsx","needs":["fetchReels useEffect has no cleanup — state update on unmounted component","ReelItem NOT wrapped in React.memo — every reel re-renders whenever currentIndex changes","Video play() promise rejection silently caught — swallows legitimate errors","handleScroll uses Math.round that can produce NaN if container not yet laid out","Follow button has no onClick handler — decorative","No useEffect cleanup for videoRef — videos continue playing audio if user navigates away"],"cans":["No virtualized rendering — only current reel (+1) should be mounted","No lazy loading for reel videos using IntersectionObserver"],"mays":["Add double-tap-to-like for mobile","Add swipe-to-navigate gesture","Preload next reel video"]},
    {"file":"RegisterPage.jsx","needs":["step and totalSteps variables declared but NEVER used — no multi-step wizard implemented despite variable names","No inline validation errors for individual fields — only generic password-mismatch toast","No error state from register mutation rendered in UI — user sees nothing on API error unless useRegister shows toast internally","Camera icon imported but never used"],"cans":["Multi-step wizard not implemented -- step/totalSteps were intended for it"],"mays":["Implement the intended multi-step wizard","Add password strength indicator","Add username availability check (debounced)","Remove unused Camera icon import"]},
    {"file":"RevisionManagementTab.jsx","needs":["No empty state when materials list empty — table body renders nothing","No delete or edit functionality for individual materials — only Create implemented, partial CRUD","All styles inline instead of CSS classes — bloats JS bundle with CSS-in-JS strings","No confirmation before closing Add Material modal with unsaved data","Modal rendered as plain div without portal — z-index stacking issues"],"cans":["Add pagination for materials table"],"mays":["Add Edit action inline for each material","Add Delete with confirmation","Use React Portal for modal overlay"]},
    {"file":"RevisionMaterialsPage.jsx","needs":["On API error, silently falls back to mock data with console.log — user never notified seeing fake content","No cleanup on useEffect — state update on unmounted component","Filter logic inconsistent: sends filters to API AND filters client-side — redundant","fetchMaterials reference changes on every filter change — useEffect re-fires every render even if values unchanged"],"cans":["Use React Query instead of manual useEffect/useState"],"mays":["Show error state banner with Retry button","Add search result highlighting","Add Submit Your Materials flow"]},
    {"file":"SearchResultsPage.jsx","needs":["filters state NEVER passed to API query — all filter controls have zero effect","No error state UI when useQuery fails — isError destructured but no error message or retry button","School filter has duplicate value: KU appears twice — copy-paste bug","activeTab 'market' has NO results section rendered — user sees nothing","Results for Groups/Events always rendered regardless of activeTab — defeats tab filtering"],"cans":["Add debounced search input (300ms)"],"mays":["Add search suggestions/autocomplete","Add pagination or load more","Add Clear filters button"]},
    {"file":"SettingsPage.jsx","needs":["handleExportData creates Blob URL but NEVER revokes it — memory leak", "useEffect depends on user object — if useAuth doesn't memoize user, effect fires on every render causing infinite loop", "useEffect has no cleanup — state update on unmounted component", "handleMasterPushToggle calls Notification.requestPermission — no graceful degradation for HTTP", "toggle2FA mutation called with no try/catch — UI shows toggled state even if API fails"],"cans":["Replace all native confirm() calls with modals","Redundant message state could be removed in favor of useToast"],"mays":["Add preview panel for appearance changes","Add Change email flow in Security"]},
    {"file":"StatusPage.jsx","needs":["No error handling for useStories query — missing error destructuring, no error state","No empty state when usersWithStories array empty","openViewer and handlePrevStory not wrapped in useCallback","markViewed mutation called in useEffect without error handling","Race condition in progress interval — handleNextStoryRef could have stale data","No cleanup for markViewed API call if unmounts mid-flight","revealedNsfwStories stored as Set in React state — non-standard, confusing","No Suspense boundary"],"cans":["No React.memo on status grid items","otherUsersStories.map creates new arrow functions every render","shouldBlur(activeStory) called every render — could be memoized","Interval step of 50ms (20fps) excessive — 100ms smoother on CPU","No lazy loading for CreateStoryModal","Loading state is plain text"],"mays":["Reply input has no submit handler","Search input purely decorative","No keyboard navigation for story viewer"]},
    {"file":"StoryManagementTab.jsx","needs":["Bulk actions only update local state — NO actual API calls","No error boundary for confirmModeration — if throws, modal stays open with no feedback","Individual story deletion also only mutates local state","Quick approve/reject in table calls confirmModeration directly with hardcoded reasons — bypasses modal","Stale closure in useEffect — filters object compared by reference, re-fetches on every filter change","User Stats/Highlights/Templates modals render empty mock arrays — not real data"],"cans":["57 lucide-react icons imported — massive bundle overhead","No React.memo on table rows","handleFilterChange creates new filter object on every keystroke — re-fetch on every character","Refresh button onClick is no-op","No useCallback on any handler","selectAllStories doesn't guard against stories.length === 0"],"mays":["Import/Export buttons have no onClick handlers","No confirmation dialog for inline approve/reject"]},
    {"file":"StudyPlaylistsPage.jsx","needs":["Array index used as key for playlist items — broken reconciliation on reorder/filter","Memory leak in handleAddItem: forEach with async continues setState after unmount","handleAddItem closes modal immediately but async upload continues — fetchPlaylistDetails may fetch wrong data","No error handling for uploadMedia in forEach — no user-facing toast for individual file failures","Race condition: first file updates selectedPlaylist, subsequent callbacks operate on stale state","No cleanup for in-flight API requests on unmount"],"cans":["No debounce on subject filter","fetchPlaylists/fetchPlaylistDetails in useCallback with only showToast dep — unnecessary overhead","No React.memo on playlist cards","subjects array defined inside component — should be module-level constant","Modal components eagerly rendered — could be lazy-loaded","No virtualization for playlist items"],"mays":["Viewer modal doesn't trap focus","No Escape key to close viewer","No visual loading state for item thumbnails"]},
    {"file":"StudyRoomsPage.jsx","needs":["Array index used as key for onlineUsers and messages — broken reconciliation, security risk","setTimeout in scrollToBottom never cleaned up","Stale closure in Ably subscription effect — updatePresence captured when effect ran, may be stale","Race condition in Ably effect cleanup — new subscriptions before old fully clean up","No cleanup for media streams when unmounting — localStream, screenStream not stopped","AI Study Buddy sends 'undefined' as room name if room still loading"],"cans":["37 lucide-react icons imported","No React.memo on RoomLobby, ActiveRoom, message bubbles, participant items","formatTime recreated every render","Whiteboard draw event publishes on every mousemove — no throttle for remote collaborators","undoStack stores full canvas data URLs — could consume gigabytes","No virtualization for messages list"],"mays":["No WebRTC cleanup when navigating away while video sharing","Lofi audio player toggle logic disconnected from audio element","No error recovery for Ably connection loss","Whiteboard cursor offset not accounting for scroll"]},
    {"file":"TemplatesPage.jsx","needs":["navigator.clipboard.writeText called without checking API availability — throws in non-HTTPS","No error boundary — JSON.parse crash would take down entire page","JSON.parse(saved) has no try/catch — malformed localStorage crashes on mount"],"cans":["filteredTemplates recomputed on every render — should useMemo","allTemplates array spread creates new array every render","No useCallback on copyTemplate, handleCreateTemplate, deleteTemplate","framer-motion for simple fade/scale adds ~30KB+ for CSS transitions"],"mays":["Category tabs lack horizontal scroll for mobile overflow","No animation when text copied to clipboard","No popularity indicator on templates"]},
    {"file":"TimetablePage.jsx","needs":["No cleanup for in-flight API requests on unmount","Stale closure in push notification interval — notifiedClasses captured in closure","handleFileUpload uses for...of with await inside reader.onload — state update on unmounted component","Optimistic update in handleUpdateClassTasks has NO rollback on API failure","handleReportIssue uses window.prompt — blocks main thread","selectedTimetable._id vs .id inconsistency — MongoDB document IDs leaking without normalization","Exams fetch effect has no cleanup"],"cans":["getClassesForDay called in render path — recomputed every render","today recomputed every render — should be in useMemo","hasClash memoized but getClassesForDay called inside is re-run every render anyway","No useCallback on most handlers","framer-motion for class card animations — adds bundle weight","Push notification interval runs every 60s even in background"],"mays":["handleCopyOrMerge uses confusing window.confirm message","No visual loading for individual operations","No error state for exams load failure"]},
    {"file":"UserManagementTab.jsx","needs":["CRITICAL: api is not imported but line 218 calls api.get() — ReferenceError at runtime","URL.createObjectURL never revoked — memory leak","Bulk actions use forEach with individual mutations — partial success/failure not communicated","No empty state when API returns empty array","Advanced filters rendered but values never sent to API","Delete user button has no onClick handler — decorative","View Profile button has no onClick handler — decorative"],"cans":["No useCallback on any handler","formatTimeAgo called on every render for each user","No React.memo on table rows","getRoleColor called on every user row","filters spread into query — shallow comparison triggers refetch on unrelated state changes","No pagination for users","No debounce on search input"],"mays":["Add User/Import buttons have no onClick handlers","Advanced filter time inputs have no onChange","No confirmation for Delete User button"]},
    {"file":"VerificationPage.jsx","needs":["No cleanup for config fetch effect — state update on unmounted component","handleFreeVerify and handleInitiatePayment directly manipulate localStorage — bypasses auth context","Polling interval async callback has no cleanup guard — state update on unmounted component","If payment polling receives 'failed', setStep('pending') — user may have already been charged","Payment could be initiated twice — handleInitiatePayment logic duplicated in onPaymentInitiated","Phone regex doesn't cover all M-Pesa prefixes (11xxxxxxxx)"],"cans":["No useCallback on handleInitiatePayment, handleFreeVerify","isPaymentEnabled could be shared config context","localStorage user update should be mutation that invalidates auth query cache","PaymentDrawer always imported — could be lazy-loaded"],"mays":["No countdown for next poll","Free verification pulse-anim has no animation definition","Checkout ID leaks payment identifier into DOM","No haptic feedback on mobile when STK push sent"]},
    {"file":"VideoManagementTab.jsx","needs":["setTimeout in handleUploadVideo never cleaned up — state update on unmounted component","Bulk actions (transcode, delete, retry_failed) only mutate local state — NO actual API calls","Initial data fetch has empty catch with no user-facing error state — empty table indefinitely","All uploads/transcoding simulated client-side — data disappears on refresh","Storage stats show mock data instead of real storageStats state","Retry button creates local job object but never retries on server","storageStats is empty object — accessing .total_videos etc. renders undefined"],"cans":["47 lucide-react icons imported","No useCallback on any handler","No React.memo on table rows","formatFileSize and formatDuration defined inside component","No debounce on filter inputs","No pagination for videos table","1646-line component — no sub-component extraction","videos.sort() mutates original array in place — modifies state directly"],"mays":["Upload settings checkboxes have no state management","Transcoding Settings modal inputs uncontrolled","No drag-and-drop file upload despite UI text saying so"]},
]

OUTPUT_DIR = "/home/arch/.KaruTeens1/fixes"
SCALING_DOC = os.path.join(OUTPUT_DIR, "SCALING_10000_USERS.txt")

def fmt_section(items, label):
    if not items:
        return f"## {label}\n_None identified_\n"
    return f"## {label}\n" + "\n".join(f"- {item}" for item in items) + "\n"

for a in analyses:
    fname = a["file"].replace(".jsx", ".txt")
    content = f"""# {a['file']}

## NEED TO DO
{chr(10).join('- ' + x for x in a['needs']) if a['needs'] else '_None identified_'}

## CAN DO
{chr(10).join('- ' + x for x in a['cans']) if a['cans'] else '_None identified_'}

## MAY DO
{chr(10).join('- ' + x for x in a['mays']) if a['mays'] else '_None identified_'}
"""
    path = os.path.join(OUTPUT_DIR, fname)
    with open(path, "w") as f:
        f.write(content)
    print(f"Written: {path}")

# Write scaling document
scaling_content = """# SCALING KARUTEENS TO 10,000 SIMULTANEOUS USERS

## Overview
This document outlines a comprehensive strategy to handle 10,000 concurrent users on KaruTeens without degradation. The current architecture uses React + Vite frontend with a Rust (Axum) backend, MongoDB, Redis, R2 storage, and Ably for real-time.

---

## 1. DATABASE LAYER (MongoDB)

### Current Issues
- No explicit index strategy visible in codebase
- Queries like `/posts/feed`, `/notifications`, `/activity` likely scan collections
- Polling intervals (10s for notifications, 30s for activity) create constant read pressure

### Solutions

a) **Add Compound Indexes**
```
posts:       { user_id: 1, created_at: -1 }
notifications: { user_id: 1, read: 1, created_at: -1 }
messages:    { conversation_id: 1, created_at: 1 }
activity:    { user_id: 1, created_at: -1 }
users:       { username: 1 } unique
```

b) **Implement MongoDB Connection Pooling**
```rust
// In main.rs — already using mongodb::Client which has built-in pooling
// Verify pool max_size is set appropriately (50-100 connections)
let client_options = ClientOptions::parse(&uri)
    .await
    .unwrap()
    .max_pool_size(100);
```

c) **Read from Secondaries**
- Deploy MongoDB replica set (at least 3 nodes: 1 primary, 2 secondaries)
- Route read queries to secondaries, writes only to primary
```rust
let collection = db.collection::<Document>("posts")
    .read_preference(ReadPreference::SecondaryPreferred);
```

d) **Implement TTL Indexes for Expiry**
```rust
// Auto-delete old notifications after 30 days
coll.create_index(
    Index::builder()
        .keys(doc! { "created_at": 1 })
        .options(IndexOptions::builder().expire_after(Duration::from_secs(30 * 86400)).build())
).await?;
```

### Expected Throughput
- With proper indexes: 10,000 reads/sec and 2,000 writes/sec on a single replica set
- With read secondaries: 30,000 reads/sec distributed across 3 nodes

---

## 2. CACHING LAYER (Redis)

### Current Setup
Redis is used for: rate limiting, media queue, WebSocket presence. NOT used for: API response caching, feed caching, session caching.

### Solutions

a) **Cache Expensive Queries**
```
Key: feed:{user_id}:{page}
Value: JSON array of post IDs
TTL: 60 seconds
Invalidate on: new post, like, comment
```

b) **Cache Trending/Aggregated Data**
```
Key: trending:posts
Value: JSON array of trending post IDs with scores
TTL: 300 seconds
```

c) **Session Caching (if JWT verification is expensive)**
```
Key: session:{token_hash}
Value: { user_id, role, expiry }
TTL: Same as JWT expiry
```

d) **Rate Limiting (already implemented but needs tuning)**
```rust
// Per-endpoint rate limits for 10K users
// Auth endpoints: 10 req/min per IP
// Feed endpoints: 60 req/min per user  
// Post creation: 5 req/min per user
// API general: 300 req/min per user
```

### Memory Requirements
- 10,000 users * 100 cached items * 1KB = ~1GB
- Redis can handle this on a single t3.medium instance (2GB RAM, ~$30/month)

---

## 3. API GATEWAY & LOAD BALANCING

### Architecture
```
Cloudflare (CDN + DDoS protection)
  └─ Nginx/HAProxy (Load Balancer)
       ├─ Backend Instance 1 (Port 3000)
       ├─ Backend Instance 2 (Port 3000)
       ├─ Backend Instance 3 (Port 3000)
       └─ Backend Instance N (Port 3000)
```

a) **Nginx Configuration for 10K Users**
```nginx
upstream backend {
    least_connections;  # Route to least loaded instance
    server 10.0.1.1:3000 max_fails=3 fail_timeout=30s;
    server 10.0.2.1:3000 max_fails=3 fail_timeout=30s;
    server 10.0.3.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 64;  # Connection pooling
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $http_x_user_id zone=api:10m rate=300r/m;

server {
    listen 443 ssl http2;
    # SSL termination at load balancer (Cloudflare or Nginx)
    
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        # Enable response buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        # WebSocket timeout
        proxy_read_timeout 86400s;
    }
}
```

b) **Horizontal Scaling: Number of Instances**
```
Formula: (Total Requests per Second) / (Requests per Second per Instance)
RPS estimate: 10,000 users * 0.5 requests/second = 5,000 RPS
Rust/Axum handles: ~50,000 RPS per instance (with keepalive)
Required instances: 5,000 / 50,000 ≈ 1 (but need at least 3 for HA)
```

**Recommended:** 3-5 backend instances behind load balancer

---

## 4. FRONTEND OPTIMIZATIONS

### Current Issues Impacting Scale
- All 46 pages lazy-loaded (good), but vendor chunks not optimized for cache
- Polling intervals create constant backend load: notifications (10s), activity (30s), events (30s), study rooms (10s), stories (60s), campus pulse (30s)

### Solutions

a) **Replace Polling with WebSocket/Ably**
```
Notifications:  10s poll → Ably channel push
Activity Feed:  30s poll → Ably channel push
Events:         30s poll → Ably channel push
Study Rooms:    10s poll → Ably channel push
Stories:        60s poll → Ably channel push
Campus Pulse:   30s poll → Ably channel push
```
This reduces backend load by ~95% for polling endpoints.

b) **Implement Request Deduplication**
```javascript
// In api/client.js or a custom hook
const pendingRequests = new Map();
async function deduplicatedRequest(key, fetcher) {
    if (pendingRequests.has(key)) return pendingRequests.get(key);
    const promise = fetcher().finally(() => pendingRequests.delete(key));
    pendingRequests.set(key, promise);
    return promise;
}
```

c) **Optimistic Updates for All Mutations**
All mutations (like, comment, follow, post) should immediately update the UI cache and rollback on failure. This reduces perceived latency to zero and reduces backend pressure since users see instant feedback.

d) **Bundle Splitting: Dynamic Import of Heavy Dependencies**
```javascript
// Instead of static imports:
import { CustomVideoPlayer } from './CustomVideoPlayer'; // Eager

// Use dynamic import:
const CustomVideoPlayer = React.lazy(() => import('./CustomVideoPlayer'));
```

Heavy components to lazy-load:
- CustomVideoPlayer (ffmpeg.wasm dependency)
- CustomAudioPlayer
- KaTeX math rendering
- Recharts (admin only)
- Markdown editors

---

## 5. CDN & ASSET DELIVERY

### Current Setup
- Vite builds with code splitting (6 vendor chunks)
- vite-plugin-pwa for service worker caching
- Gzip + Brotli compression
- R2 for media storage

### Enhancements

a) **Move Static Assets to CDN**
```
Vite build output → Cloudflare Pages / R2 / S3 + CloudFront
Cache-Control: public, max-age=31536000, immutable  (for hashed files)
```

b) **Implement Image CDN Transformations**
```javascript
// Use Cloudinary or imgix for on-the-fly transforms
// Instead of storing multiple variants:
const thumb = `https://res.cloudinary.com/.../w_150,h_150/${imageId}`;
const medium = `https://res.cloudinary.com/.../w_800/${imageId}`;
```

c) **Preconnect to Critical Origins**
```html
<link rel="preconnect" href="https://r2.karuteens.site">
<link rel="preconnect" href="https://api.karuteens.site">
<link rel="dns-prefetch" href="https://ably.io">
```

### Cache Hit Ratio Targets
- Static JS/CSS: 99% (immutable hashes, long TTL)
- API responses: 80% (1-5 min TTL on feed/trending)
- Media files: 95% (long TTL on R2)

---

## 6. REAL-TIME INFRASTRUCTURE

### Current Setup
- Ably for main real-time (notifications, chat, presence, signaling)
- WebSocket (homegrown) for supplementary real-time

### Scaling Ably for 10K Users

a) **Connection Estimates**
- 10,000 users → 10,000 WebSocket connections to Ably
- Ably charges by concurrent connections and message volume
- 10K connections × $0.05/connection/month = $500/month (Business plan)

b) **Channel Strategy**
```
Private channels:
  user:{userId}:notifications  — per user
  user:{userId}:chats          — per user
  user:{userId}:activity       — per user

Shared channels:
  campus:presence              — global (rate-limited presence updates)
  {chatId}:messages            — per conversation
```

c) **Reduce Presence Churn**
- Throttle presence enter/leave to max 1 update per 30 seconds per user
- Use `presence.get()` sparingly (currently called in StudyRoomsPage on every enter/leave)

d) **Fallback: Self-hosted WebSocket**
If Ably costs are too high, replace with a WebSocket cluster:
- One Rust WebSocket server per 2,000 connections
- Redis Pub/Sub for cross-instance message routing
- 5 instances for 10,000 connections

---

## 7. DATABASE SHARDING STRATEGY

### When MongoDB Replica Set is Not Enough

At 10,000 DAU with heavy write loads:

a) **Shard by user_id (hashed)**
```
shardCollection("karuteens.posts", { user_id: "hashed" })
shardCollection("karuteens.notifications", { user_id: "hashed" })
shardCollection("karuteens.messages", { conversation_id: "hashed" })
```

b) **Keep Global Collections Unsharded**
- Users (small, frequently read)
- Trending topics (small, aggregated)
- Config/settings

---

## 8. INFRASTRUCTURE COST ESTIMATE (10K Concurrent Users)

| Component | Instance Type | Nodes | Monthly Cost |
|-----------|--------------|-------|-------------|
| Backend (Rust/Axum) | t3.medium (2 vCPU, 4GB) | 3 | ~$90 |
| MongoDB | t3.medium (2 vCPU, 4GB) | 3 (replica set) | ~$90 |
| Redis | t3.small (2 vCPU, 2GB) | 2 (cluster) | ~$40 |
| Load Balancer | Nginx on t3.micro | 2 | ~$20 |
| Ably Real-time | Business plan, 10K connections | - | ~$500 |
| R2 Storage | Cloudflare R2, pay-as-you-go | - | ~$50 |
| CDN (Cloudflare) | Pro plan | - | $20 |
| **Total** | | | **~$810/month** |

### Optimization: Replace Ably with Self-hosted WebSocket
| Component | Instance Type | Nodes | Monthly Cost |
|-----------|--------------|-------|-------------|
| WebSocket Server | t3.small (2 vCPU, 2GB) | 5 | ~$100 |
| **Total w/ self-hosted WS** | | | **~$410/month** |

---

## 9. FIRE DRILL: WHAT HAPPENS AT 10,001 USERS?

### Degradation Points (in order)
1. **Polling endpoints** — 6 polling intervals × 10K users = 60,000 requests/interval → Backend CPU spikes → Request queuing → Timeouts
2. **MongoDB** — Unindexed queries start taking >100ms → Connection pool exhausted → New requests queue
3. **Redis** — Rate limiting keys grow unboundedly → Memory pressure → Evictions → Throttling fails
4. **Frontend** — Large lists (notifications, messages, chat users) without virtualization → DOM > 10,000 nodes → Jank

### Immediate Actions
1. Kill all polling intervals in frontend, replace with Ably push
2. Add missing MongoDB indexes (see section 1a)
3. Cap notification/message list rendering to last 50 items
4. Enable response compression on load balancer
5. Scale backend to 5 instances

### Success Indicators
- API response time < 200ms (p95)
- Error rate < 0.1%
- MongoDB CPU < 50%
- Redis memory < 70% used
- Frontend Lighthouse score > 80
- WebSocket reconnection rate < 1%

---

## 10. TESTING THE SCALE

### Load Testing Strategy
```bash
# Install k6
brew install k6  # or: apt install k6

# Test feed endpoint
k6 run --vus 1000 --duration 300s - <<'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 1000 },  // Ramp up to 1,000 VUs
        { duration: '5m', target: 5000 },  // Ramp to 5,000 VUs
        { duration: '3m', target: 10000 }, // Ramp to 10,000 VUs
        { duration: '5m', target: 10000 }, // Hold at 10,000
        { duration: '2m', target: 0 },     // Ramp down
    ],
};

export default function () {
    const res = http.get('http://localhost:3000/api/posts/feed?page=1', {
        headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
    });
    check(res, { 'status is 200': (r) => r.status === 200 });
}
EOF
```

### Targets for 10K Users
- P95 response time: < 500ms
- P99 response time: < 2s
- Error rate: < 0.5%
- Throughput: > 5,000 RPS
- Zero crashes under sustained load

---

## SUMMARY: TOP 5 IMMEDIATE ACTIONS

1. **Kill polling, use WebSocket push** — reduces backend load by ~95% for 6 endpoints
2. **Add MongoDB indexes** — prevents full collection scans under load
3. **Add Redis caching** — for feed, trending, and expensive queries
4. **Horizontal backend scaling** — 3-5 instances behind Nginx load balancer
5. **Frontend optimization** — virtualize large lists, deduplicate requests, optimistic updates

These five changes alone would allow the current architecture to handle 5,000-10,000 concurrent users with minimal degradation.
"""
with open(SCALING_DOC, "w") as f:
    f.write(scaling_content)
print(f"Written: {SCALING_DOC}")
print("DONE")
