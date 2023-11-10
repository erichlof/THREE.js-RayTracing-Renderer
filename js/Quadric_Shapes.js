// scene/demo-specific variables go here
let UVGridTexture;
let imageTexturesTotalCount = 1;
let numOfImageTexturesLoaded = 0;
let shearMatrix = new THREE.Matrix4();
let groundRectangle, disk, box;
let diffuseSphere, metalSphere, coatSphere, glassSphere;
let cylinder, cone, paraboloid, hyperboloid, hyperbolicParaboloid, capsule;



// called automatically from within initTHREEjs() function (located in InitCommon.js file)
function initSceneData() 
{
	demoFragmentShaderFileName = 'Quadric_Shapes_Fragment.glsl';

	// scene/demo-specific three.js objects setup goes here
	sceneIsDynamic = false;
	
	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 0.75 : 0.75; // less demanding on battery-powered mobile devices

	//EPS_intersect = 0.01;
	

	// set camera's field of view and other options
	worldCamera.fov = 60;
	focusDistance = 20.0;
	//apertureChangeSpeed = 1; // 1 is default
	//focusChangeSpeed = 1; // 1 is default

	// position and orient camera
	cameraControlsObject.position.set(0, 5, 20);
	// look left or right
	//cameraControlsYawObject.rotation.y = 0.3;
	// look up or down
	cameraControlsPitchObject.rotation.x = 0.005;

	cameraFlightSpeed = 30;

	// ClearCoat checkered ground rectangle
	groundRectangle = new RayTracingShape("rectangle");

	groundRectangle.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	groundRectangle.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	groundRectangle.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	groundRectangle.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	groundRectangle.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	groundRectangle.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	groundRectangle.uvScale.set(300, 300); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	groundRectangle.transform.scale.set(1000, 1000, 1); // 1000 width, 1000 height
	groundRectangle.transform.position.set(0, 0, 0);
	groundRectangle.transform.rotation.set(Math.PI * -0.5, 0, 0); // this rotates the rectangle back from upright (default) to flat along the ground
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	groundRectangle.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	// ClearCoat disk with uvGrid texture applied
	disk = new RayTracingShape("disk");

	disk.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	disk.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	disk.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	disk.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	disk.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	disk.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	disk.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	disk.transform.scale.set(2, 2, 1);
	disk.transform.position.set(15, 2, 4);
	disk.transform.rotation.set(-0.7, -0.9, -0.5);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	disk.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// ClearCoat checkered box
	box = new RayTracingShape("box");

	box.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	box.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	box.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	box.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	box.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	box.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	box.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	box.transform.scale.set(2, 2, 4);
	box.transform.position.set(6, 2.01, -18);
	box.transform.rotation.set(0, -0.8, 0);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	box.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	// diffuse sphere
	diffuseSphere = new RayTracingShape("sphere");

	diffuseSphere.material.color.set(1.0, 0.01, 0.01); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	diffuseSphere.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	diffuseSphere.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	diffuseSphere.material.clearcoat = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	diffuseSphere.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	diffuseSphere.material.roughness = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	diffuseSphere.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	diffuseSphere.transform.scale.set(2, 2, 2);
	diffuseSphere.transform.position.set(7.5, 2,-0.5);
	//diffuseSphere.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	diffuseSphere.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// metal sphere
	metalSphere = new RayTracingShape("sphere");

	metalSphere.material.color.set(1.000, 0.766, 0.336); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	metalSphere.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	metalSphere.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	metalSphere.material.clearcoat = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	metalSphere.material.metalness = 1.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	metalSphere.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	metalSphere.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	metalSphere.transform.scale.set(4, 4, 4);
	metalSphere.transform.position.set(12, 4, -9);
	//metalSphere.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	metalSphere.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// clearcoat sphere with uvGrid texture applied
	coatSphere = new RayTracingShape("sphere");

	coatSphere.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	coatSphere.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	coatSphere.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	coatSphere.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	coatSphere.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	coatSphere.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	coatSphere.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	coatSphere.transform.scale.set(4, 4, 4);
	coatSphere.transform.position.set(0, 4, -2);
	//coatSphere.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	coatSphere.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	///shearMatrix.makeShear(1, 0, 0, 0, 0, 0); // parameters are (y_by_x, z_by_x, x_by_y, z_by_y, x_by_z, y_by_z)
	///coatSphere.transform.matrixWorld.multiply(shearMatrix); // multiply this shape's matrix by the shear matrix4
	// note: don't do another call to updateMatrixWorld(), because it would wipe out the scale, position, and rotation values that we changed earlier

	
	// glass sphere
	glassSphere = new RayTracingShape("sphere");

	glassSphere.material.color.set(0.4, 1.0, 0.6); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	glassSphere.material.opacity = 0.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	glassSphere.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	glassSphere.material.clearcoat = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	glassSphere.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	glassSphere.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	glassSphere.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	glassSphere.transform.scale.set(4, 4, 4);
	glassSphere.transform.position.set(-14, 4, -5);
	//glassSphere.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	glassSphere.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// clearcoat cylinder
	cylinder = new RayTracingShape("cylinder");

	cylinder.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	cylinder.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	cylinder.material.ior = 1.3; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	cylinder.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	cylinder.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	cylinder.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	cylinder.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	cylinder.transform.scale.set(3, 5, 3);
	cylinder.transform.position.set(-8, 5, -14);
	//cylinder.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	cylinder.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// checkered clearcoat cone
	cone = new RayTracingShape("cone");

	cone.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	cone.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	cone.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	cone.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	cone.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	cone.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	cone.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	cone.transform.scale.set(2, 2, 2);
	cone.transform.position.set(-10.5, 2, 4);
	//cone.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	cone.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// checkered clearcoat paraboloid
	paraboloid = new RayTracingShape("paraboloid");

	paraboloid.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	paraboloid.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	paraboloid.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	paraboloid.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	paraboloid.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	paraboloid.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	paraboloid.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	paraboloid.transform.scale.set(2, 2, 2);
	paraboloid.transform.position.set(-3.5, 2, 4);
	//paraboloid.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	paraboloid.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// checkered clearcoat hyperboloid
	hyperboloid = new RayTracingShape("hyperboloid");

	hyperboloid.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	hyperboloid.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	hyperboloid.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	hyperboloid.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	hyperboloid.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	hyperboloid.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	hyperboloid.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	hyperboloid.transform.scale.set(2, 2, 2);
	hyperboloid.transform.position.set(3.5, 2, 4);
	//hyperboloid.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	hyperboloid.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	

	// checkered clearcoat hyperbolic paraboloid
	hyperbolicParaboloid = new RayTracingShape("hyperbolic paraboloid");

	hyperbolicParaboloid.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	hyperbolicParaboloid.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	hyperbolicParaboloid.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	hyperbolicParaboloid.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	hyperbolicParaboloid.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	hyperbolicParaboloid.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	hyperbolicParaboloid.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	hyperbolicParaboloid.transform.scale.set(2, 2, 2);
	hyperbolicParaboloid.transform.position.set(11, 2, 4);
	//hyperbolicParaboloid.transform.rotation.set(0, 0, Math.PI * 0.25);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	hyperbolicParaboloid.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	// checkered clearcoat capsule
	capsule = new RayTracingShape("capsule");

	capsule.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	capsule.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	capsule.material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	capsule.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	capsule.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	capsule.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	capsule.uvScale.set(2, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	capsule.transform.scale.set(1.5, 1.5, 1.5);
	capsule.transform.position.set(19, 1.5, -4);
	capsule.transform.rotation.set(0, 0, Math.PI * 0.5);

	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	capsule.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	


	// In addition to the default GUI on all demos, add any special GUI elements that this particular demo requires
	
	// scene/demo-specific uniforms go here     
	rayTracingUniforms.uUVGridTexture = { value: UVGridTexture };
	rayTracingUniforms.uRectangleInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uDiskInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uBoxInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uDiffuseSphereInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uMetalSphereInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uCoatSphereInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uGlassSphereInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uCylinderInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uConeInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uParaboloidInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uHyperboloidInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uHyperbolicParaboloidInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uCapsuleInvMatrix = { value: new THREE.Matrix4() };


	// copy each shape's inverse matrix over to the GPU as a uniform for use in the ray tracing shader.
	rayTracingUniforms.uRectangleInvMatrix.value.copy(groundRectangle.transform.matrixWorld).invert();
	rayTracingUniforms.uDiskInvMatrix.value.copy(disk.transform.matrixWorld).invert();
	rayTracingUniforms.uBoxInvMatrix.value.copy(box.transform.matrixWorld).invert();
	rayTracingUniforms.uDiffuseSphereInvMatrix.value.copy(diffuseSphere.transform.matrixWorld).invert();
	rayTracingUniforms.uMetalSphereInvMatrix.value.copy(metalSphere.transform.matrixWorld).invert();
	rayTracingUniforms.uCoatSphereInvMatrix.value.copy(coatSphere.transform.matrixWorld).invert();
	rayTracingUniforms.uGlassSphereInvMatrix.value.copy(glassSphere.transform.matrixWorld).invert();
	rayTracingUniforms.uCylinderInvMatrix.value.copy(cylinder.transform.matrixWorld).invert();
	rayTracingUniforms.uConeInvMatrix.value.copy(cone.transform.matrixWorld).invert();
	rayTracingUniforms.uParaboloidInvMatrix.value.copy(paraboloid.transform.matrixWorld).invert();
	rayTracingUniforms.uHyperboloidInvMatrix.value.copy(hyperboloid.transform.matrixWorld).invert();
	rayTracingUniforms.uHyperbolicParaboloidInvMatrix.value.copy(hyperbolicParaboloid.transform.matrixWorld).invert();
	rayTracingUniforms.uCapsuleInvMatrix.value.copy(capsule.transform.matrixWorld).invert();

} // end function initSceneData()



// called automatically from within the animate() function (located in InitCommon.js file)
function updateVariablesAndUniforms() 
{   
	/* // do it the following way if the shape's transform matrix is continually updating every animation frame.
	//coatSphere.transform.scale.set(4, 4, 4);
	coatSphere.transform.position.set(0, 4, Math.sin(elapsedTime * 0.5) * 10); //-2 for z axis
	//coatSphere.transform.rotation.set(0, 0, Math.PI * 0.25);
	coatSphere.transform.updateMatrixWorld(true);
	shearMatrix.makeShear(Math.sin(elapsedTime), 0, 0, 0, 0, 0); // parameters are (y_by_x, z_by_x, x_by_y, z_by_y, x_by_z, y_by_z)
	coatSphere.transform.matrixWorld.multiply(shearMatrix); // multiply this shape's matrix by the shear matrix4
	// note: if using a shearing transformation, don't call updateMatrixWorld() again, because it would wipe out the scale, position, and rotation values that we changed earlier
	// finally, send the shape's newly-updated transform over to the GPU as a mat4 uniform (and invert it, so the shader can be more efficient with its raycasting calculations) 
	rayTracingUniforms.uCoatSphereInvMatrix.value.copy(coatSphere.transform.matrixWorld).invert();
 	*/

	// INFO
	cameraInfoElement.innerHTML = "FOV: " + worldCamera.fov + " / Aperture: " + apertureSize.toFixed(2) + 
		" / FocusDistance: " + focusDistance.toFixed(2) + "<br>" + "Samples: " + sampleCounter;

} // end function updateVariablesAndUniforms()


UVGridTexture = textureLoader.load(
	// resource URL
	'textures/uvgrid0.png',

	// onLoad callback
	function (texture)
	{
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.flipY = false;
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.generateMipmaps = false;

		numOfImageTexturesLoaded++;
		// if all textures have been loaded, we can init 
		if (numOfImageTexturesLoaded == imageTexturesTotalCount)
			init(); // init app and start animating
	}
);
