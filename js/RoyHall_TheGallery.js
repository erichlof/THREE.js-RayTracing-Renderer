// scene/demo-specific variables go here
let cube, platform;


// called automatically from within initTHREEjs() function (located in InitCommon.js file)
function initSceneData() 
{
	demoFragmentShaderFileName = 'RoyHallTheGallery_Fragment.glsl';

	// scene/demo-specific three.js objects setup goes here
	sceneIsDynamic = false;
	
	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 0.75 : 0.75; // less demanding on battery-powered mobile devices

	//EPS_intersect = 0.01;
	

	// set camera's field of view and other options
	worldCamera.fov = 37;
	focusDistance = 36.0;
	//apertureChangeSpeed = 1; // 1 is default
	//focusChangeSpeed = 1; // 1 is default

	cameraFlightSpeed = 15;

	// position and orient camera
	cameraControlsObject.position.set(10.6, 11.1, 28.9);
	// look left or right
	cameraControlsYawObject.rotation.y = 0.2;
	// look up or down
	cameraControlsPitchObject.rotation.x = 0;

	
	// CUBE sculpture in middle of room
	cube = new RayTracingShape("box");
	cube.transform.scale.set(3.2, 3.2, 3.2);
	cube.transform.position.set(-2, 6.75, -8);
	cube.transform.rotation.set(Math.PI * 0.73, Math.PI * 0.74, 0);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	cube.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last

	// platform box underneath the cube sculpture
	platform = new RayTracingShape("box");
	platform.transform.scale.set(2.75, 1.25, 2.75);
	platform.transform.position.set(-2, 0, -8);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	platform.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last



	// In addition to the default GUI on all demos, add any special GUI elements that this particular demo requires
	

	// scene/demo-specific uniforms go here     
	rayTracingUniforms.uCubeInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uPlatformInvMatrix = { value: new THREE.Matrix4() };

	// go ahead and calculate/set the inverse matrices, because this scene is static -  these objects don't move
	rayTracingUniforms.uCubeInvMatrix.value.copy(cube.transform.matrixWorld).invert();
	rayTracingUniforms.uPlatformInvMatrix.value.copy(platform.transform.matrixWorld).invert();

} // end function initSceneData()



// called automatically from within the animate() function (located in InitCommon.js file)
function updateVariablesAndUniforms() 
{   

	// INFO
	cameraInfoElement.innerHTML = "FOV: " + worldCamera.fov + " / Aperture: " + apertureSize.toFixed(2) + 
		" / FocusDistance: " + focusDistance.toFixed(2) + "<br>" + "Samples: " + sampleCounter;

} // end function updateVariablesAndUniforms()


init(); // init app and start animating