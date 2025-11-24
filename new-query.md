Nice! Sure, let's removed unused stuff, like `measurementDiv`.

Hmm, the calculated size is too big for "fill" (overflows both vertically and horizontally, should only overflow one of those two, and exactly fit the other):

```
=== CALCULATING OPTIMAL FONT SIZE (Canvas) ===
Message: OMELET
Unique characters: (5) ['O', 'M', 'E', 'L', 'T']
Scaling mode: fill
Viewport: 1196 x 992 (landscape)
Test font: bold 992px -apple-system, "system-ui", "Segoe UI", Arial, sans-serif
Test size: 100vmin = 992.00px
  "O": 674.25px wide, 723.17px tall (canvas measureText)
  "M": 737.95px wide, 698.95px tall (canvas measureText)
  "E": 463.06px wide, 698.95px tall (canvas measureText)
  "L": 451.92px wide, 698.95px tall (canvas measureText)
  "T": 550.73px wide, 698.95px tall (canvas measureText)
Widest char: "M" at 737.95px
Tallest char: "O" at 723.17px
Width ratio: 0.6170 (61.70% of viewport width)
Height ratio: 0.7290 (72.90% of viewport height)
FILL mode: constrained by WIDTH
Constraint ratio: 0.6170
Optimal font size: 162.07vmax (at 100%)
===================================

Displaying "O": 162.07vmax (optimal: 162.07, multiplier: 1)
```

... "fit" is a perfect fit (though there is a slight vertical alignment issue, it's a little too low, needs to come up about 35px):

```
=== CALCULATING OPTIMAL FONT SIZE (Canvas) ===
Message: OMELET
Unique characters: (5) ['O', 'M', 'E', 'L', 'T']
Scaling mode: fill
Viewport: 1196 x 992 (landscape)
Test font: bold 992px -apple-system, "system-ui", "Segoe UI", Arial, sans-serif
Test size: 100vmin = 992.00px
  "O": 674.25px wide, 723.17px tall (canvas measureText)
  "M": 737.95px wide, 698.95px tall (canvas measureText)
  "E": 463.06px wide, 698.95px tall (canvas measureText)
  "L": 451.92px wide, 698.95px tall (canvas measureText)
  "T": 550.73px wide, 698.95px tall (canvas measureText)
Widest char: "M" at 737.95px
Tallest char: "O" at 723.17px
Width ratio: 0.6170 (61.70% of viewport width)
Height ratio: 0.7290 (72.90% of viewport height)
FILL mode: constrained by WIDTH
Constraint ratio: 0.6170
Optimal font size: 162.07vmax (at 100%)
===================================

Displaying "O": 162.07vmax (optimal: 162.07, multiplier: 1)
```