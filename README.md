This is a quick take on the coding train challenge "2d ray tracing with p5.js".

Instead of ray tracing out from the mouse pointer uniformly around a circle, I've raytraced from moving points (e.g. agents) toward the mouse pointer and highlit whether they can see it or not. e.g. guards with Line-of-sight.

# Credits:

- uses a simplified version of the line-segment collision intersection function from p5.collide2D https://github.com/bmoren/p5.collide2D [https://creativecommons.org/licenses/by-nc-sa/4.0/](license BY-NC-SA)
