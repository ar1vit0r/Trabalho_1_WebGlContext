# Trabalho_1_WebGlContext
WebGL - Orthographic 3D
This post is a continuation of a series of posts about WebGL. The first started with fundamentals and the previous was about 2D matrices. If you haven't read those please view them first.

In the last post we went over how 2D matrices worked. We talked about how translation, rotation, scaling, and even projecting from pixels into clip space can all be done by 1 matrix and some magic matrix math. To do 3D is only a small step from there.

In our previous 2D examples we had 2D points (x, y) that we multiplied by a 3x3 matrix. To do 3D we need 3D points (x, y, z) and a 4x4 matrix.

Let's take our last example and change it to 3D. We'll use an F again but this time a 3D 'F'.
  As edited by me.
