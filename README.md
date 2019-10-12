This is a quick take on the Coding Train ["Coding Challenge #145: 2D Raycasting" (with p5.js)](https://www.youtube.com/watch?v=TOEi6T2mtHo)

Instead of ray tracing out from the mouse pointer uniformly around a circle, I've raytraced from moving points (e.g. agents) toward the mouse pointer and highlit whether they can see it or not. e.g. guards with Line-of-sight.

![Screenshot of raycasting](screenshot-raycasting-agents.png?raw=true)

# Credits:

- uses a simplified version of the line-segment collision intersection function from p5.collide2D https://github.com/bmoren/p5.collide2D [https://creativecommons.org/licenses/by-nc-sa/4.0/](license BY-NC-SA)
