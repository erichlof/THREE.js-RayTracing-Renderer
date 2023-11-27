# THREE.js-RayTracing-Renderer
Real-time Classic Ray Tracing on all devices with a browser, with real reflections, refractions, and depth of field, all on top of the Three.js WebGL framework.

<h4>Quick Controls Notes</h4>

* *Desktop*: Mouse click anywhere to capture mouse, then the usual Mouse-move and WASD/QZ keys control 1st person camera. Mousewheel to zoom in and out. O and P keys toggle Orthographic and Perspective camera modes. Left/Right arrow keys control camera's aperture size (depth of field blur effect), while Up/Down arrow keys control the Focal point distance from the camera. ESC key to exit and return the mouse pointer.

* *Mobile*: Swipe to rotate 1st person camera. The 4 Large Arrow buttons control camera movement. Horizontal pinch to zoom in and out.  Vertical Pinch controls camera's aperture size (depth of field blur effect).  The 2 smaller Up/Down Arrow buttons control the Focal point distance from the camera.  Orthographic camera mode can be turned on/off through the GUI checkbox.   

<h2>LIVE DEMOS</h2>

* [Classic Geometry Showcase Demo](https://erichlof.github.io/THREE.js-RayTracing-Renderer/Classic_Geometry_Showcase.html) features some classic ray tracing shapes (spheres, planes, etc) while showing the main capabilities of the RayTracing Renderer: real reflections, refractions, pixel-perfect shadows, shadow caustics, 4 different material types (Phong, Metal, ClearCoat, and Transparent) - all running at 60fps, even on your cell phone! <br>

* [Quadric Shapes Demo](https://erichlof.github.io/THREE.js-RayTracing-Renderer/Quadric_Shapes.html) contains a directional light source (like the Sun) and demonstrates every shape from the Quadric Shapes family (spheres, cylinders, cones, paraboloids, hyperboloids, etc).  All of the objects are instantiated with easy Three.js library-type calls.  Each shape has its own transform (scaling, position, rotation, shearing) as well as its own material and uv coordinates.  All of this info is fed into the GPU via uniforms. Lastly, the Ray Tracing fragment shader (which runs on the GPU) takes in all of this data, then raycasts each quadric shape, handles all of the reflections, refractions, and direct lighting (and shadows) from the directional light source, and finally delivers the beautiful ray traced images to your screen with blazing-fast speed! <br>

* [Instance Mapping Demo](https://erichlof.github.io/THREE.js-RayTracing-Renderer/Instance_Mapping.html) You may have heard of bump mapping before, but this new technique I've developed goes a step beyond that and actually creates new instanced geometry along the surface of the parent object.  For example, we can start out with a large sphere parent object, and then as a ray intersects that parent sphere, the UV coordinates of the intersection point are recorded.  Then a smaller shape (a tiny sphere, for example) spawns out of the surface at that exact UV coordinate.  By scaling/rounding the floating-point UV coordinates up and down, we can have more or less tiny child shapes pop up all over the parent's surface.  Now, just like normal maps and bump mapping, the illusion is broken as you glide the camera along the silhouette edge of the parent shape (it is just a smooth parent sphere after all!) - but, since we are using the power of ray tracing with its realistic lighting, every single tiny shape that pops up behaves like a real raytraced object - complete with reflections, refractions, and shadows!  This is something you just can't get from normal maps and traditional bump mapping.  The best part is that since the camera rays are spawning all of these tiny shapes in parallel on the GPU, we don't have to pay the cost for having thousands or millions of more shapes appear along the surface - maybe just a couple of more adjacent tiny shapes to help make shadows on the sides of the shape 'bumps'.  I wasn't sure what to call this unique raytracing method, so for now I'm naming this technique 'Instance Mapping'.  I think this name succinctly describes what is happening along the parent shape's surface.  Enjoy! ;-) <br>


<h3>Classic Scenes / Ray Tracing History</h3>

![Intro_To_Ray_Tracing](https://github.com/erichlof/THREE.js-RayTracing-Renderer/assets/3434843/3d887b98-c0c6-4823-ba31-4322d74c06bc)

The above image is the cover of the classic book, An Introduction To Ray Tracing (of which I own a copy!).  The iconic cover image inspired me to try and recreate this classic scene inside my Three.js RayTracing Renderer.  Not only did I want to try and recapture the look and feel if this image, I wanted to be able to move the camera and fly around the scene in real time (30 to 60fps) on any device - even a cell phone!  I am happy to present my homage to this classic scene and the great book which it comes from:

* [The 6 Platonic Solids demo](https://erichlof.github.io/THREE.js-RayTracing-Renderer/The_6_Platonic_Solids.html) This demo features two techniques that I have recently developed: Convex Polyhedra raycasting and Instance Mapping.  The 5 Platonic solids (minus the 'Teapotahedron', lol) featured in the demo are efficiently rendered with a plane-cutting technique first developed by Eric Haines (one of the authors of this book!) back in 1991.  This algorithm allows you to raycast a convex faceted shape consisting of 4 to 20 planes.  The 'Teapotaheadron' is rendered with the traditional triangular model and BVH acceleration system.  The other technique, Instance Mapping, is used on the 6 marble pillars.  The algorithm for efficiently raycasting multiple small instances located on and around a large parent shape produces the dozens of smaller cylinder columns around each large pillar.  Without these two techniques, we would have no hope of running this complex classic scene at real time frame rates, let alone on mobile devices!  Enjoy! ;-)

<h2>TODO</h2>

* For simple scenes without gltf models, instead of scene description hard-coded in the ray tracing shaders, let the scene be defined using familiar Three.js mesh creation commands.  The ultimate goal is to be able to create and load any arbritrary scene that uses the standard, simple Three.js library calls for scene construction.
* Dynamic Scene description/BVH rigged model animation streamed real-time to the GPU ray tracer (1/21/21 made progress in this area by working on my new game The Sentinel: 2nd Look.  Featues a dynamic top-level BVH that can change and update itself every animation frame)<br>


<h2>ABOUT</h2>

* This project is a cross between a labor of love (I love creating all types of ray tracers!) and an educational resource for showing how Classic (1980's and early 90's) Ray Tracing was achieved.  Inspiration for this ray tracer comes from the seminal work of Arthur Appel (late 1960's), Turner Whitted (late 1970's and 80's), the MAGI group (who did the Ray Tracing for the movie TRON in the early 80's), and Robert Cook (mid 1980's).  Although this type of rendering is not as complete and photo-realistic as path tracing (especially on diffuse color bleeding and physically-accurate caustics), I think you'll agree that this Classic style of Ray Tracing has its own cool, nostalgic, unique look that you just can't get from traditional rasterization! <br>

More examples, features, and content to come!

