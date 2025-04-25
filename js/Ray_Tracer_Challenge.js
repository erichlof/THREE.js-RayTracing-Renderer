// scene/demo-specific variables go here
let boxes = [];
let boxesInvMatrices = [];
let glassSphere;
let glassSphereInvMatrix = new THREE.Matrix4();
let groupTransform = new THREE.Object3D();
let phaseOffsets = [];
let lightPosition = new THREE.Vector3();

let animation_TypeObject;
let animation_TypeController;
let changeAnimationType = false;
let animationType;

let noAnimation = true;
let runAnimation1 = false;
let runAnimation2 = false;
let runAnimation3 = false;
let runAnimation4 = false;
let runAnimation5 = false;


// called automatically from within initTHREEjs() function (located in InitCommon.js file)
function initSceneData() 
{
	demoFragmentShaderFileName = 'RayTracerChallenge_Fragment.glsl';

	// scene/demo-specific three.js objects setup goes here

	// this demo opens up with a static scene, but as soon as the user selects an animation from the menu, 
	// the scene will be changed to dynamic (sceneIsDynamic = true)
	sceneIsDynamic = false;

	// Since this demo has a pure white background, turn tone mapping Off - otherwise, background will appear light gray when run through the tone mapper.  
	// If the tone mapper was on, the background color would have to be set to a really high brightness in order to reach the levels of a 'pure white' color.
	useToneMapping = false;

	// change webpage's info text to black so it shows up against the white background 
	infoElement.style.color = 'rgb(0,0,0)';
	cameraInfoElement.style.color = 'rgb(0,0,0)';

	// mobile devices must use darker buttons so that they show up against the white background
	mobileUseDarkButtons = true;

	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 1.0 : 0.75; // less demanding on battery-powered mobile devices

	//EPS_intersect = 0.01;


	// set camera's field of view and other options
	worldCamera.fov = 50;
	focusDistance = 12.0;
	//apertureChangeSpeed = 1; // 1 is default
	//focusChangeSpeed = 1; // 1 is default

	// position and orient camera
	cameraControlsObject.position.set(-6, 3.5, 15);
	// look left or right
	cameraControlsYawObject.rotation.y = -0.6;
	// look up or down
	cameraControlsPitchObject.rotation.x = -0.25;


	cameraFlightSpeed = 15;

	// glass sphere
	glassSphere = new RayTracingShape("sphere");

	glassSphere.material.color.set(0.4, 1.0, 0.6); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	glassSphere.material.opacity = 0.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	glassSphere.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	glassSphere.material.clearcoat = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	glassSphere.material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	glassSphere.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	glassSphere.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	glassSphere.transform.scale.set(1.75, 1.75, 1.75);
	glassSphere.transform.position.set(0, 1.75, 4.7);

	groupTransform.add(glassSphere.transform)



	// ClearCoat boxes
	for (let i = 0; i < 17; i++)
	{
		boxes[i] = new RayTracingShape("box");

		boxes[i].material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
		boxes[i].material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
		boxes[i].material.ior = 1.4; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
		boxes[i].material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
		boxes[i].material.metalness = 0.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
		boxes[i].material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

		boxes[i].uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?
		boxesInvMatrices[i] = new THREE.Matrix4();

		groupTransform.add(boxes[i].transform);
	}


	setupDefaultScene();


	// In addition to the default GUI on all demos, add any special GUI elements that this particular demo requires

	animation_TypeObject = {
		Play_Animation: 'None'
	};

	function handleAnimationTypeChange() 
	{
		changeAnimationType = true;
	}

	animation_TypeController = gui.add(animation_TypeObject, 'Play_Animation', ['None', 'Animation #1',
		'Animation #2', 'Animation #3', 'Animation #4', 'Animation #5']).onChange(handleAnimationTypeChange);



	// scene/demo-specific uniforms go here
	rayTracingUniforms.uBoxesInvMatrices = { value: boxesInvMatrices };
	rayTracingUniforms.uGlassSphereInvMatrix = { value: glassSphereInvMatrix };
	rayTracingUniforms.uLightPosition = { value: lightPosition };

} // end function initSceneData()


function setupDefaultScene()
{
	boxes[0].transform.rotation.set(0, 0, 0);
	boxes[0].transform.scale.set(1.5, 1.5, 1.5);
	boxes[0].transform.position.set(4, 1.75, 4.7);

	boxes[1].transform.rotation.set(0, 0, 0);
	boxes[1].transform.scale.set(1.75, 1.75, 1.75);
	boxes[1].transform.position.set(8.5, 3.25, 5.2);

	boxes[2].transform.rotation.set(0, 0, 0);
	boxes[2].transform.scale.set(1.75, 1.75, 1.75);
	boxes[2].transform.position.set(0, 1.75, 0.7);

	boxes[3].transform.rotation.set(0, 0, 0);
	boxes[3].transform.scale.set(1, 1, 1);
	boxes[3].transform.position.set(4, 1.75, 0.7);

	boxes[4].transform.rotation.set(0, 0, 0);
	boxes[4].transform.scale.set(1.5, 1.5, 1.5);
	boxes[4].transform.position.set(7.5, 2.25, 0.7);

	boxes[5].transform.rotation.set(0, 0, 0);
	boxes[5].transform.scale.set(1.5, 1.5, 1.5);
	boxes[5].transform.position.set(-0.25, 2, -3.3);

	boxes[6].transform.rotation.set(0, 0, 0);
	boxes[6].transform.scale.set(1.75, 1.75, 1.75);
	boxes[6].transform.position.set(4, 2.75, -2.8);

	boxes[7].transform.rotation.set(0, 0, 0);
	boxes[7].transform.scale.set(1.5, 1.5, 1.5);
	boxes[7].transform.position.set(10, 3.75, -2.8);

	boxes[8].transform.rotation.set(0, 0, 0);
	boxes[8].transform.scale.set(1, 1, 1);
	boxes[8].transform.position.set(8, 3.75, -7.3);

	boxes[9].transform.rotation.set(0, 0, 0);
	boxes[9].transform.scale.set(1, 1, 1);
	boxes[9].transform.position.set(20, 2.75, -4.3);

	boxes[10].transform.rotation.set(0, 0, 0);
	boxes[10].transform.scale.set(1.75, 1.75, 1.75);
	boxes[10].transform.position.set(-0.5, -3.25, 4.45);

	boxes[11].transform.rotation.set(0, 0, 0);
	boxes[11].transform.scale.set(1.75, 1.75, 1.75);
	boxes[11].transform.position.set(4, -2.25, 4.7);

	boxes[12].transform.rotation.set(0, 0, 0);
	boxes[12].transform.scale.set(1.75, 1.75, 1.75);
	boxes[12].transform.position.set(8.5, -2.25, 4.7);

	boxes[13].transform.rotation.set(0, 0, 0);
	boxes[13].transform.scale.set(1.75, 1.75, 1.75);
	boxes[13].transform.position.set(0, -2.25, 0.7);

	boxes[14].transform.rotation.set(0, 0, 0);
	boxes[14].transform.scale.set(1.75, 1.75, 1.75);
	boxes[14].transform.position.set(-0.5, -2.75, -3.3);

	boxes[15].transform.rotation.set(0, 0, 0);
	boxes[15].transform.scale.set(1.75, 1.75, 1.75);
	boxes[15].transform.position.set(0, -6.25, 0.7);

	boxes[16].transform.rotation.set(0, 0, 0);
	boxes[16].transform.scale.set(1.75, 1.75, 1.75);
	boxes[16].transform.position.set(-0.5, -6.75, -3.3);


	groupTransform.rotation.set(0, 0, 0);
	groupTransform.rotateX(0.4);
	groupTransform.updateMatrixWorld(true);

	glassSphere.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
	glassSphereInvMatrix.copy(glassSphere.transform.matrixWorld).invert();

	for (let i = 0; i < 17; i++)
	{
		boxes[i].transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last
		boxesInvMatrices[i].copy(boxes[i].transform.matrixWorld).invert();
	}

	for (let i = 0; i < 17; i++)
	{
		phaseOffsets[i] = Math.random() * TWO_PI;
	}

	lightPosition.set(50, 100, 50);
	lightPosition.applyMatrix4(groupTransform.matrixWorld);

} // end function setupDefaultScene()


// called automatically from within the animate() function (located in InitCommon.js file)
function updateVariablesAndUniforms() 
{

	if (changeAnimationType) 
	{
		animationType = animation_TypeController.getValue();

		if (animationType == 'None') 
		{
			noAnimation = true;
			runAnimation1 = false;
			runAnimation2 = false;
			runAnimation3 = false;
			runAnimation4 = false;
			runAnimation5 = false;
			sceneIsDynamic = false;
		}
		else if (animationType == 'Animation #1') 
		{
			noAnimation = false;
			runAnimation1 = true;
			runAnimation2 = false;
			runAnimation3 = false;
			runAnimation4 = false;
			runAnimation5 = false;
			sceneIsDynamic = true;
		}
		else if (animationType == 'Animation #2') 
		{
			noAnimation = false;
			runAnimation1 = false;
			runAnimation2 = true;
			runAnimation3 = false;
			runAnimation4 = false;
			runAnimation5 = false;
			sceneIsDynamic = true;
		}
		else if (animationType == 'Animation #3') 
		{
			noAnimation = false;
			runAnimation1 = false;
			runAnimation2 = false;
			runAnimation3 = true;
			runAnimation4 = false;
			runAnimation5 = false;
			sceneIsDynamic = true;
		}
		else if (animationType == 'Animation #4') 
		{
			noAnimation = false;
			runAnimation1 = false;
			runAnimation2 = false;
			runAnimation3 = false;
			runAnimation4 = true;
			runAnimation5 = false;
			sceneIsDynamic = true;
		}
		else if (animationType == 'Animation #5') 
		{
			noAnimation = false;
			runAnimation1 = false;
			runAnimation2 = false;
			runAnimation3 = false;
			runAnimation4 = false;
			runAnimation5 = true;
			sceneIsDynamic = true;
		}

		cameraIsMoving = true;
		changeAnimationType = false;

		setupDefaultScene();

	} // end if (changeAnimationType)


	if (runAnimation1)
	{
		groupTransform.rotateX(0.5 * frameTime);
		groupTransform.updateMatrixWorld(true);

		glassSphere.transform.updateMatrixWorld(true);
		glassSphereInvMatrix.copy(glassSphere.transform.matrixWorld).invert();
		for (let i = 0; i < 17; i++)
		{
			boxes[i].transform.updateMatrixWorld(true);
			boxesInvMatrices[i].copy(boxes[i].transform.matrixWorld).invert();
		}
	}

	if (runAnimation2)
	{
		groupTransform.rotation.set(0, 0, 0);
		groupTransform.rotateY(0.5 * frameTime);
		groupTransform.updateMatrixWorld(true);

		lightPosition.applyMatrix4(groupTransform.matrixWorld);
	}

	if (runAnimation3)
	{
		for (let i = 0; i < 17; i++)
		{
			boxes[i].transform.position.y += Math.sin(((elapsedTime * 0.5) + phaseOffsets[i]) % TWO_PI) * 0.02;
			boxes[i].transform.updateMatrixWorld(true);
			boxesInvMatrices[i].copy(boxes[i].transform.matrixWorld).invert();
		}
	}

	if (runAnimation4)
	{
		for (let i = 0; i < 17; i++)
		{
			boxes[i].transform.scale.x += Math.sin(((elapsedTime * 0.5) + phaseOffsets[i]) % TWO_PI) * 0.005;
			boxes[i].transform.scale.y += Math.sin(((elapsedTime * 0.5) + phaseOffsets[i]) % TWO_PI) * 0.005;
			boxes[i].transform.scale.z += Math.sin(((elapsedTime * 0.5) + phaseOffsets[i]) % TWO_PI) * 0.005;
			boxes[i].transform.updateMatrixWorld(true);
			boxesInvMatrices[i].copy(boxes[i].transform.matrixWorld).invert();
		}
	}

	if (runAnimation5)
	{
		for (let i = 0; i < 17; i++)
		{
			boxes[i].transform.rotation.x += (0.5 + (phaseOffsets[i] / TWO_PI)) * frameTime;
			boxes[i].transform.rotation.y += (0.5 + (phaseOffsets[i] / TWO_PI)) * frameTime;
			boxes[i].transform.updateMatrixWorld(true);
			boxesInvMatrices[i].copy(boxes[i].transform.matrixWorld).invert();
		}
	}

	// INFO
	cameraInfoElement.innerHTML = "FOV: " + worldCamera.fov + " / Aperture: " + apertureSize.toFixed(2) +
		" / FocusDistance: " + focusDistance.toFixed(2) + "<br>" + "Samples: " + sampleCounter;

} // end function updateVariablesAndUniforms()


init(); // init app and start animating
