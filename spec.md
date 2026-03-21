# FansBattle – Cricket Fan Wars

## Current State
- Bottom nav has 5+ tabs: Live Match, Vote Battle, Stickers, Friends, Shop
- Header has logout button + coin balance
- Firestore may use random document IDs instead of deviceId as doc ID
- Daily reward uses localStorage for claim tracking instead of pure Firestore transactions
- Multiple unused tabs clutter the UI

## Requested Changes (Diff)

### Add
- Profile tab (bottom nav, second tab) with: username, coins balance, user ID, Shop section, Logout button
- Home tab with two sections: "Live Matches" and "Upcoming Matches"
- Auto-refresh every 15 seconds for match data
- Clicking a match opens a detail/guess panel
- Coin balance in header is clickable → opens shop modal
- Shop accessible from Profile screen and by tapping coin balance in header

### Modify
- Bottom nav: reduce to 2 tabs only — Home and Profile
- Header: remove logout button, keep only coin balance (clickable)
- Home tab (renamed from "Live Match"): show live matches + upcoming matches from CricAPI
- Firestore user document: use `users/{deviceId}` (deviceId as doc ID, not random)
- On app start: check if `users/{deviceId}` exists; if not, create with coins:10, lastClaimDate:""
- All coin updates: use Firestore runTransaction (never direct overwrite)
- Daily reward: compare today's date (YYYY-MM-DD) with lastClaimDate from Firestore; add +5 coins via transaction; update lastClaimDate after success; block if already claimed
- UI only updates after Firestore success; show error if Firestore fails

### Remove
- Vote Battle tab
- Stickers tab
- Friends tab
- Shop from bottom navigation (move to Profile + header coin tap)
- Logout from header
- All dummy/hardcoded UI elements and fake data

## Implementation Plan
1. Rewrite `lib/firestore.ts`: ensure user doc uses deviceId as Firestore document ID; fix `claimDailyReward` to use `runTransaction` with date comparison; fix all coin updates to use transactions
2. Rewrite `context/UserContext.tsx`: ensure `createOrGetUser` writes to `users/{deviceId}`; subscribe to `users/{deviceId}` via onSnapshot
3. Rewrite `components/BottomNav.tsx`: 2 tabs only — Home, Profile
4. Rewrite `components/Header.tsx`: remove logout, coin balance clickable to open shop
5. Rewrite `components/tabs/LiveMatch.tsx` → rename logic to Home tab: two sections (Live Matches, Upcoming Matches) with auto-refresh; each match clickable
6. Create `components/tabs/Profile.tsx`: username, coins, user ID, shop section (inline or modal), logout button
7. Rewrite `App.tsx`: remove all unused tabs/modals, wire up 2-tab navigation, pass shop open handler via coin tap in header
8. Delete or ignore: VoteBattle, StickerCreator, FriendsRoom components (no longer rendered)
