Hmm, I'm not sure those changes were useful, the output looks the same to me, and it's still wrong. Below I outline what I believe to be a clear scenario with an expected (unmet) outcome. If there's any ambiguity in what I'm asking for, let me know and I can be more clear.

---

Verifying "fit" height, when width is excessive, so height is the only limiting factor:

```
Canvas setup: 1024x660 CSS, 2048x1320 physical (DPR: 2)
=== CALCULATING OPTIMAL FONT SIZE (Canvas) ===
Message: OMELET
Unique characters: (5) ['O', 'M', 'E', 'L', 'T']
Scaling mode: fit
Viewport: 1024 x 660 (landscape)
Test font: bold 660px -apple-system, "system-ui", "Segoe UI", Arial, sans-serif
Test size: 100vmin = 660.00px
  "O": 448.59px wide, 481.14px tall (canvas measureText)
  "M": 490.97px wide, 465.03px tall (canvas measureText)
  "E": 308.09px wide, 465.03px tall (canvas measureText)
  "L": 300.67px wide, 465.03px tall (canvas measureText)
  "T": 366.42px wide, 465.03px tall (canvas measureText)
Widest char: "M" at 490.97px
Tallest char: "O" at 481.14px
Width ratio: 0.4795 (47.95% of viewport width)
Height ratio: 0.7290 (72.90% of viewport height)
FIT mode: constrained by HEIGHT
Constraint ratio: 0.7290
Optimal font size: 137.17vmin (at 100%)
===================================

Displaying "O": 137.17vmin = 905.34px (optimal: 137.17, multiplier: 1)
Rendered "O" at (171.39, 648.95), bbox: 615.35x660.00px
Displaying "M": 137.17vmin = 905.34px (optimal: 137.17, multiplier: 1)
Rendered "M" at (122.21, 648.95), bbox: 673.48x637.89px
Displaying "E": 137.17vmin = 905.34px (optimal: 137.17, multiplier: 1)
Rendered "E" at (247.65, 648.95), bbox: 422.61x637.89px
Displaying "L": 137.17vmin = 905.34px (optimal: 137.17, multiplier: 1)
Rendered "L" at (252.73, 648.95), bbox: 412.44x637.89px
Displaying "E": 137.17vmin = 905.34px (optimal: 137.17, multiplier: 1)
Rendered "E" at (247.65, 648.95), bbox: 422.61x637.89px
Displaying "T": 137.17vmin = 905.34px (optimal: 137.17, multiplier: 1)
Rendered "T" at (239.69, 648.95), bbox: 502.62x637.89px
```

---

Verifying "fit" width, when height is excessive, so width is the only limiting factor:

```
Canvas setup: 390x1024 CSS, 780x2048 physical (DPR: 2)
=== CALCULATING OPTIMAL FONT SIZE (Canvas) ===
Message: OMELET
Unique characters: (5) ['O', 'M', 'E', 'L', 'T']
Scaling mode: fit
Viewport: 390 x 1024 (portrait)
Test font: bold 390px -apple-system, "system-ui", "Segoe UI", Arial, sans-serif
Test size: 100vmin = 390.00px
  "O": 265.08px wide, 284.31px tall (canvas measureText)
  "M": 290.12px wide, 274.79px tall (canvas measureText)
  "E": 182.05px wide, 274.79px tall (canvas measureText)
  "L": 177.67px wide, 274.79px tall (canvas measureText)
  "T": 216.52px wide, 274.79px tall (canvas measureText)
Widest char: "M" at 290.12px
Tallest char: "O" at 284.31px
Width ratio: 0.7439 (74.39% of viewport width)
Height ratio: 0.2776 (27.76% of viewport height)
FIT mode: constrained by WIDTH
Constraint ratio: 0.7439
Optimal font size: 134.43vmin (at 100%)
===================================

Displaying "O": 134.43vmin = 524.27px (optimal: 134.43, multiplier: 1)
Rendered "O" at (-2.24, 696.69), bbox: 356.33x382.19px
Displaying "M": 134.43vmin = 524.27px (optimal: 134.43, multiplier: 1)
Rendered "M" at (-30.72, 696.69), bbox: 390.00x369.39px
Displaying "E": 134.43vmin = 524.27px (optimal: 134.43, multiplier: 1)
Rendered "E" at (41.92, 696.69), bbox: 244.72x369.39px
Displaying "L": 134.43vmin = 524.27px (optimal: 134.43, multiplier: 1)
Rendered "L" at (44.86, 696.69), bbox: 238.84x369.39px
Displaying "E": 134.43vmin = 524.27px (optimal: 134.43, multiplier: 1)
Rendered "E" at (41.92, 696.69), bbox: 244.72x369.39px
Displaying "T": 134.43vmin = 524.27px (optimal: 134.43, multiplier: 1)
Rendered "T" at (37.31, 696.69), bbox: 291.06x369.39px
````

---

Then, I combine the two constraining dimensions from above, and toggle on "Independent H/V Scaling", but leaving "Per Letter Scaling" unchecked, I expected that I will get the heights from the first condition, combined with the widths from the second condition, meaning only the "O" (tallest character) should perfectly "fit" vertically, and only the "M" (widest character) should perfectly "fit" horizontally, all other letters should have gaps (and the "O" should have horizontal gaps, and the "M" should have vertical gaps) -- however this is not what I see, what I seem is all letters without gaps, which I would only expect if I had checked "Per Letter Scaling" -- does that make sense?

```
Canvas setup: 390x660 CSS, 780x1320 physical (DPR: 2)
=== CALCULATING OPTIMAL FONT SIZE (Canvas) ===
Message: OMELET
Unique characters: (5) ['O', 'M', 'E', 'L', 'T']
Scaling mode: fit
Viewport: 390 x 660 (portrait)
Test font: bold 390px -apple-system, "system-ui", "Segoe UI", Arial, sans-serif
Test size: 100vmin = 390.00px
  "O": 265.08px wide, 284.31px tall (canvas measureText)
  "M": 290.12px wide, 274.79px tall (canvas measureText)
  "E": 182.05px wide, 274.79px tall (canvas measureText)
  "L": 177.67px wide, 274.79px tall (canvas measureText)
  "T": 216.52px wide, 274.79px tall (canvas measureText)
Widest char: "M" at 290.12px
Tallest char: "O" at 284.31px
Width ratio: 0.7439 (74.39% of viewport width)
Height ratio: 0.4308 (43.08% of viewport height)
FIT mode: constrained by WIDTH
Constraint ratio: 0.7439
Optimal font size: 134.43vmin (at 100%)
===================================

Independent H/V only: "O" uses message-wide size (134.43vmin)
Independent scaling: text bbox 356.33x382.19px -> viewport 390.00x660.00px
Scale factors: X=1.0945, Y=1.7269 (multiplier: 1.00)
Rendered "O" with independent scaling at (-19.07, 375.79) in scaled coords
Independent H/V only: "M" uses message-wide size (134.43vmin)
Independent scaling: text bbox 390.00x369.39px -> viewport 390.00x660.00px
Scale factors: X=1.0000, Y=1.7867 (multiplier: 1.00)
Rendered "M" with independent scaling at (-30.72, 369.39) in scaled coords
Independent H/V only: "E" uses message-wide size (134.43vmin)
Independent scaling: text bbox 244.72x369.39px -> viewport 390.00x660.00px
Scale factors: X=1.5936, Y=1.7867 (multiplier: 1.00)
Rendered "E" with independent scaling at (-30.72, 369.39) in scaled coords
Independent H/V only: "L" uses message-wide size (134.43vmin)
Independent scaling: text bbox 238.84x369.39px -> viewport 390.00x660.00px
Scale factors: X=1.6329, Y=1.7867 (multiplier: 1.00)
Rendered "L" with independent scaling at (-30.72, 369.39) in scaled coords
Independent H/V only: "E" uses message-wide size (134.43vmin)
Independent scaling: text bbox 244.72x369.39px -> viewport 390.00x660.00px
Scale factors: X=1.5936, Y=1.7867 (multiplier: 1.00)
Rendered "E" with independent scaling at (-30.72, 369.39) in scaled coords
Independent H/V only: "T" uses message-wide size (134.43vmin)
Independent scaling: text bbox 291.06x369.39px -> viewport 390.00x660.00px
Scale factors: X=1.3399, Y=1.7867 (multiplier: 1.00)
Rendered "T" with independent scaling at (-12.16, 369.39) in scaled coords
```