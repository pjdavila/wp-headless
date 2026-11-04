---
name: In-article scroller geometry
description: Why the 700x1600 scroller window is sized to the screen instead of to 700px on desktop.
---

The Teads Scroller Vertical spec frames the 700x1244 safe zone in a window and moves the 7:16 creative slower than the text. A creative that moves slower than the text can only be shown fully if the safe-zone window fits in the visible area (between the collapsed sticky header and the sticky bottom banner). So width = min(column, 700px, visibleHeight*700/1244). On a 1280x900 desktop this means about 350px wide, not 700.

**Why:** the plan asked for both "slower than text" and "the whole piece is seen, window never taller than the screen". Making it 700px wide on desktop would mean the creative moves faster than the text or the safe zone is never fully visible. The Teads demo behaves the same way (it measured an almost fixed creative behind the window).

**How to apply:** if someone asks for a bigger scroller on desktop, explain this tradeoff before changing the sizing. Header collapsed heights are 60px under 1024px wide and 160px from 1024px.
