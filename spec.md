# FansBattle – Cricket Fan Wars

## Current State
The LiveMatch tab has a basic guess system with 3 events, 5-coin cost per guess, and always pays out rewards immediately (no correct/wrong logic). There is no timer on guess cards. Questions don't match the intended event types.

## Requested Changes (Diff)

### Add
- Timer displayed on each guess card (countdown showing time remaining to guess)
- Correct/Wrong guess resolution: each guess card shows a result after the timer expires (random simulation for demo)
- Correct guess rewards 25 coins; wrong guess loses the 10 coins spent
- New guess types: Who will win the match, Next wicket, Next six, Over runs above 10
- Result states on cards: pending (timer running), correct (green, +25), wrong (red, -10)
- "Expires in" countdown badge per card

### Modify
- Entry cost changed from 5 to 10 coins per guess
- Guess cards updated to show cost (10), potential reward (25), and a live timer
- After guessing, card shows awaiting result state with countdown
- On timer expiry, simulate result (correct or wrong) and apply coin change
- EVENTS list updated with the four specified guess types plus extras

### Remove
- Immediate reward payout on guess lock (replaced by timer-based result)

## Implementation Plan
1. Define EVENTS with 4 new guess types: Who will win, Next wicket, Next six, Over runs above 10 — each with options, emoji, timers (30–90 seconds)
2. Add per-card countdown timer using useEffect + setInterval
3. Track guess state per card: idle → selected → locked → resolved(correct|wrong)
4. On lock: deduct 10 coins, start timer
5. On timer expiry: simulate result, if correct addCoins(25), show toast
6. Card UI: show timer badge, locked state with countdown, result state (correct/wrong)
7. Cost = 10 coins, reward = 25 coins constants
