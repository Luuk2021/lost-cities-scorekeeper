# Lost Cities Scorekeeper — GitHub Pages

## Scoring used by this version

For each expedition:

1. If there are **no wager cards and no number cards**, the expedition scores **0**. There is no -20 penalty.
2. Otherwise:
   `((sum of number cards - 20) × (wager cards + 1))`
3. Add **+20** after the wager multiplication when the expedition has **8 or more total cards**.
4. Wager cards count toward the 8-card threshold, but do not contribute to the number-card sum.

Example:
- 2 wager cards
- 6 number cards
- 8 total cards
- score before bonus = `(sum - 20) × 3`
- then add `+20`

Number cards supported in the UI are **2 through 9**. Each value has a quantity field (0–3), so duplicate cards can be entered.

## GitHub Pages

Upload `index.html`, `style.css`, and `script.js` to a repository, then enable:
**Settings → Pages → Deploy from a branch → main → / (root)**.
#
