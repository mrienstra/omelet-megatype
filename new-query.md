Hmm, it's not working exactly as I'd expect -- in "fit" mode, the letters don't truly fit, they are only constrained by height, not also by width.

For "scroll" mode: Let's draw all the letters to one canvas, and just animate that (after measuring them and whatnot of course).

Also, we need some letter spacing, right now the letters are frequently touching, though not always, I'm not quite sure what the pattern is... There's a decent gap between "M" and "E", and a sliver of a gap between "E" and "L", otherwise the letters touch. I guess we might as well make this adjustable, minimum value should be zero.