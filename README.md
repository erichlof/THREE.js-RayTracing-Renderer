# THREE.js-RayTracing-Renderer
Real-time Classic Ray Tracing on all devices with a browser, with real reflections, refractions, and depth of field, all on top of the Three.js WebGL framework.

<h4>Quick Controls Notes</h4>

* *Desktop*: Mouse click anywhere to capture mouse, then the usual Mouse-move and WASD/QZ keys control 1st person camera. Mousewheel to zoom in and out. O and P keys toggle Orthographic and Perspective camera modes. Left/Right arrow keys control camera's aperture size (depth of field blur effect), while Up/Down arrow keys control the Focal point distance from the camera. ESC key to exit and return the mouse pointer.

* *Mobile*: Swipe to rotate 1st person camera. The 4 Large Arrow buttons control camera movement. Horizontal pinch to zoom in and out.  Vertical Pinch controls camera's aperture size (depth of field blur effect).  The 2 smaller Up/Down Arrow buttons control the Focal point distance from the camera.  Orthographic camera mode can be turned on/off through the GUI checkbox.   

<h2>LIVE DEMOS</h2>

* [Classic Geometry Showcase Demo](https://erichlof.github.io/THREE.js-RayTracing-Renderer/Classic_Geometry_Showcase.html) features some classic ray tracing shapes (spheres, planes, etc) while showing the main capabilities of the RayTracing Renderer: real reflections, refractions, pixel-perfect shadows, shadow caustics, 4 different material types (Phong, Metal, ClearCoat, and Transparent) - all running at 60fps, even on your cell phone!

* [Quadric Shapes Demo](https://erichlof.github.io/THREE.js-RayTracing-Renderer/Quadric_Shapes.html) contains a directional light source (like the Sun) and demonstrates every shape from the Quadric Shapes family (spheres, cylinders, cones, paraboloids, hyperboloids, etc).  All of the objects are instantiated with easy Three.js library-type calls.  Each shape has its own transform (scaling, position, rotation, shearing) as well as its own material and uv coordinates.  All of this info is fed into the GPU via uniforms. Lastly, the Ray Tracing fragment shader (which runs on the GPU) takes in all of this data, then raycasts each quadric shape, handles all of the reflections, refractions, and direct lighting (and shadows) from the directional light source (the Sun), and finally delivers the beautiful ray traced images to your screen with blazing-fast speed! <br>


<h2>TODO</h2>

* For simple scenes without gltf models, instead of scene description hard-coded in the ray tracing shaders, let the scene be defined using familiar Three.js mesh creation commands.  The ultimate goal is to be able to create and load any arbritrary scene that uses the standard, simple Three.js library calls for scene construction.
* Dynamic Scene description/BVH rigged model animation streamed real-time to the GPU ray tracer (1/21/21 made progress in this area by working on my new game The Sentinel: 2nd Look.  Featues a dynamic top-level BVH that can change and update itself every animation frame)<br>


<h2>ABOUT</h2>

* This project is a cross between a labor of love (I love creating all types of ray tracers!) and an educational resource for showing how Classic (1980's and early 90's) Ray Tracing was achieved.  Inspiration for this ray tracer comes from the seminal work of Arthur Appel (late 1960's), Turner Whitted (late 1970's and 80's), the MAGI group (who did the Ray Tracing for the movie TRON in the early 80's), and Robert Cook (mid 1980's).  Although this type of rendering is not as complete and photo-realistic as path tracing (especially on diffuse color bleeding and physically-accurate caustics), I think you'll agree that this Classic style of Ray Tracing has its own cool, nostalgic, unique look that you just can't get from traditional rasterization! <br>

More examples, features, and content to come!

