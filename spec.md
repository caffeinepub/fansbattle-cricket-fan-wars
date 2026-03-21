# FansBattle – Cricket Fan Wars

## Current State

FansBattle is a cricket fan engagement app with Firebase/Firestore backend, device-based auto-login, live cricket data via CricAPI, and a coin economy. Current economy values are overly generous (100 starting coins, +20 daily reward, +3 per vote, guaranteed rewards). The system allows most users to gain more coins than they spend, which is not sustainable.

## Requested Changes (Diff)

### Add
- Pool system: every guess/vote/room entry fee is pooled; only 70–80% distributed to winners
- Ad cooldown (2–5 min) and daily cap on ad rewards
- Low-balance purchase prompt when user has <10 coins
- Anti-abuse: one entry per user per question (already partially done)
- Custom coin purchase input (min ₹10) with dynamic coin calculation

### Modify
- Initial coins: 100 → **10**
- Daily reward: 20 → **5 coins max**
- Ad reward: 20 → **2–5 coins** (random), with 2-min cooldown and daily cap of 3 ads
- Vote: **costs 2 coins** (no guaranteed reward; removed +3 per vote)
- Guess: costs 10 coins (unchanged), but winner logic now distributes only 70–80% of pool
- Room win reward: now computed as 75% of pool (25% commission); not a fixed 70 coins
- Coin packages: ₹10→10, ₹50→55, ₹100→120 (was 100/600/1500)
- DailyRewardModal: show 5 coins
- Spin wheel: removed (was guaranteed win which is inflationary)
- Invite reward: removed (was free +50 coins with no cost)
- VoteBattle header: update copy to reflect cost ("Vote costs 2 coins")

### Remove
- Spin wheel game (always gave coins, inflating the economy)
- Invite reward button (free +50 coins, no verification)
- Per-vote coin reward (+3 per vote)
- Guaranteed "everyone wins" logic in FriendsRoom

## Implementation Plan

1. **firestore.ts**: Change `createOrGetUserByDeviceId` initial coins to 10. Change `claimDailyReward` to award 5 coins. Add `adCooldown` / `adDailyCount` tracking.
2. **UserContext.tsx**: Change `createFallbackUser` coins to 10.
3. **App.tsx**: Update `DAILY_REWARD_COINS` to 5. Ad reward = random 2–5 coins with cooldown tracking (localStorage `lastAdTime`, `adCountToday`). Show low-balance prompt.
4. **DailyRewardModal.tsx**: Update day card values to show 5 coins max.
5. **Shop.tsx**: New packages (₹10=10, ₹50=55, ₹100=120). Remove spin wheel. Remove invite reward button. Ad button shows 2-5 coins, shows cooldown timer. Add custom amount input. Daily claim shows 5 coins.
6. **VoteBattle.tsx**: `handleVote` now calls `spendCoins(2, 'vote')` before voting. Remove `addCoins(3, 'vote_reward')`. Update UI copy.
7. **FriendsRoom.tsx**: Win reward = `Math.floor(totalPool * 0.75)`. Commission = 25% of pool. Update UI to show pool and commission clearly.
8. **LiveMatch / GuessSystem**: Ensure guess pool logic: winner only if ranked top — for single-player guess, use 70% payout rule (entry 10 coins, win = 7 coins if correct — no guaranteed win).
