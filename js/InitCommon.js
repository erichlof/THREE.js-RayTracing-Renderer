let SCREEN_WIDTH;
let SCREEN_HEIGHT;
let canvas, context;
let container, stats;
let controls;
let rayTracingScene, screenCopyScene, screenOutputScene;
let rayTracingUniforms = {};
let rayTracingUniformsGroups = [];
let screenCopyUniforms, screenOutputUniforms;
let rayTracingDefines;
let rayTracingVertexShader, rayTracingFragmentShader;
let demoFragmentShaderFileName;
let screenCopyVertexShader, screenCopyFragmentShader;
let screenOutputVertexShader, screenOutputFragmentShader;
let rayTracingGeometry, rayTracingMaterial, rayTracingMesh;
let screenCopyGeometry, screenCopyMaterial, screenCopyMesh;
let screenOutputGeometry, screenOutputMaterial, screenOutputMesh;
let rayTracingRenderTarget, screenCopyRenderTarget;
let quadCamera, worldCamera;
let renderer, clock;
let frameTime, elapsedTime;
let sceneIsDynamic = false;
let cameraFlightSpeed = 60;
let cameraRotationSpeed = 1;
let fovScale;
let storedFOV = 0;
let increaseFOV = false;
let decreaseFOV = false;
let dollyCameraIn = false;
let dollyCameraOut = false;
let apertureSize = 0.0;
let increaseAperture = false;
let decreaseAperture = false;
let apertureChangeSpeed = 1;
let focusDistance = 132.0;
let increaseFocusDist = false;
let decreaseFocusDist = false;
let focusChangeSpeed = 1;
let pixelRatio = 0.5;
let windowIsBeingResized = false;
let TWO_PI = Math.PI * 2;
let sampleCounter = 0.0; // will get increased by 1 in animation loop before rendering
let frameCounter = 1.0; // 1 instead of 0 because it is used as a rng() seed in raytracing shader
let cameraIsMoving = false;
let cameraRecentlyMoving = false;
let isPaused = true;
let oldYawRotation, oldPitchRotation;
let mobileJoystickControls = null;
let oldDeltaX = 0;
let oldDeltaY = 0;
let newDeltaX = 0;
let newDeltaY = 0;
let mobileControlsMoveX = 0;
let mobileControlsMoveY = 0;
let oldPinchWidthX = 0;
let oldPinchWidthY = 0;
let pinchDeltaX = 0;
let pinchDeltaY = 0;
let fontAspect;
let useGenericInput = true;
let EPS_intersect = 0.01;
let textureLoader = new THREE.TextureLoader();
let blueNoiseTexture;
let useToneMapping = true;
let canPress_O = true;
let canPress_P = true;
let allowOrthographicCamera = true;
let changeToOrthographicCamera = false;
let changeToPerspectiveCamera = false;

let gui;
let ableToEngagePointerLock = true;
let pixel_ResolutionController, pixel_ResolutionObject;
let needChangePixelResolution = false;
let orthographicCamera_ToggleController, orthographicCamera_ToggleObject;
let currentlyUsingOrthographicCamera = false;

// the following variables will be used to calculate rotations and directions from the camera
let cameraDirectionVector = new THREE.Vector3(); //for moving where the camera is looking
let cameraRightVector = new THREE.Vector3(); //for strafing the camera right and left
let cameraUpVector = new THREE.Vector3(); //for moving camera up and down
let cameraWorldQuaternion = new THREE.Quaternion(); //for rotating scene objects to match camera's current rotation
let cameraControlsObject; //for positioning and moving the camera itself
let cameraControlsYawObject; //allows access to control camera's left/right movements through mobile input
let cameraControlsPitchObject; //allows access to control camera's up/down movements through mobile input

let PI_2 = Math.PI / 2; //used by controls below

let infoElement = document.getElementById('info');
infoElement.style.cursor = "default";
infoElement.style.userSelect = "none";
infoElement.style.MozUserSelect = "none";

let cameraInfoElement = document.getElementById('cameraInfo');
cameraInfoElement.style.cursor = "default";
cameraInfoElement.style.userSelect = "none";
cameraInfoElement.style.MozUserSelect = "none";

let mouseControl = true;
let pointerlockChange;
let fileLoader = new THREE.FileLoader();

// The following list of keys is not exhaustive, but it should be more than enough to build interactive demos and games
let KeyboardState = {
	KeyA: false, KeyB: false, KeyC: false, KeyD: false, KeyE: false, KeyF: false, KeyG: false, KeyH: false, KeyI: false, KeyJ: false, KeyK: false, KeyL: false, KeyM: false,
	KeyN: false, KeyO: false, KeyP: false, KeyQ: false, KeyR: false, KeyS: false, KeyT: false, KeyU: false, KeyV: false, KeyW: false, KeyX: false, KeyY: false, KeyZ: false,
	ArrowLeft: false, ArrowUp: false, ArrowRight: false, ArrowDown: false, Space: false, Enter: false, PageUp: false, PageDown: false, Tab: false,
	Minus: false, Equal: false, BracketLeft: false, BracketRight: false, Semicolon: false, Quote: false, Backquote: false,
	Comma: false, Period: false, ShiftLeft: false, ShiftRight: false, Slash: false, Backslash: false, Backspace: false,
	Digit1: false, Digit2: false, Digit3: false, Digit4: false, Digit5: false, Digit6: false, Digit7: false, Digit8: false, Digit9: false, Digit0: false
}

function onKeyDown(event)
{
	event.preventDefault();

	KeyboardState[event.code] = true;
}

function onKeyUp(event)
{
	event.preventDefault();

	KeyboardState[event.code] = false;
}

function keyPressed(keyName)
{
	if (!mouseControl)
		return;

	return KeyboardState[keyName];
}


function onMouseWheel(event)
{
	if (isPaused)
		return;

	// use the following instead, because event.preventDefault() gives errors in console
	event.stopPropagation();

	if (event.deltaY > 0)
	{
		increaseFOV = true;
		dollyCameraOut = true;
	}
	else if (event.deltaY < 0)
	{
		decreaseFOV = true;
		dollyCameraIn = true;
	}
}

/**
 * originally from https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/PointerLockControls.js
 * @author mrdoob / http://mrdoob.com/
 *
 * edited by Erich Loftis (erichlof on GitHub)
 * https://github.com/erichlof
 * Btw, this is the most consice and elegant way to implement first person camera rotation/movement that I've ever seen -
 * look at how short it is, without spaces/braces it would be around 30 lines!  Way to go, mrdoob!
 */

function FirstPersonCameraControls(camera)
{
	camera.rotation.set(0, 0, 0);

	let pitchObject = new THREE.Object3D();
	pitchObject.add(camera);

	let yawObject = new THREE.Object3D();
	yawObject.add(pitchObject);

	let movementX = 0;
	let movementY = 0;

	function onMouseMove(event)
	{
		if (isPaused)
			return;
		movementX = event.movementX || event.mozMovementX || 0;
		movementY = event.movementY || event.mozMovementY || 0;

		yawObject.rotation.y -= movementX * 0.0012 * cameraRotationSpeed;
		pitchObject.rotation.x -= movementY * 0.001 * cameraRotationSpeed;

		// clamp the camera's vertical movement (around the x-axis) to the scene's 'ceiling' and 'floor'
		pitchObject.rotation.x = Math.max(- PI_2, Math.min(PI_2, pitchObject.rotation.x));
	}

	document.addEventListener('mousemove', onMouseMove, false);


	this.getObject = function()
	{
		return yawObject;
	};

	this.getYawObject = function()
	{
		return yawObject;
	};

	this.getPitchObject = function()
	{
		return pitchObject;
	};

	this.getDirection = function()
	{
		let te = pitchObject.matrixWorld.elements;

		return function(v)
		{
			v.set(te[8], te[9], te[10]).negate();
			return v;
		};
	}();

	this.getUpVector = function()
	{
		let te = pitchObject.matrixWorld.elements;

		return function(v)
		{
			v.set(te[4], te[5], te[6]);
			return v;
		};
	}();

	this.getRightVector = function()
	{
		let te = pitchObject.matrixWorld.elements;

		return function(v)
		{
			v.set(te[0], te[1], te[2]);
			return v;
		};
	}();

} // end function FirstPersonCameraControls(camera)


// the 'type' function argument below is a string in JavaScript. Possible string values are: "rectangle", "disk", "box", "sphere", 
// "cylinder", "capped cylinder", "cone", "capped cone", "paraboloid", "capped paraboloid", "hyperboloid", "hyperbolic paraboloid", "capsule"
function RayTracingShape(type)
{
	this.type = type;

	this.transform = new THREE.Object3D();
	this.transform.visible = false;
	
	this.material = new THREE.MeshPhysicalMaterial({
		color: new THREE.Color(1.0, 1.0, 1.0), // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
		opacity: 1.0, // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
		ior: 1.5, // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
		clearcoat: 0.0, // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
		metalness: 0.0, // range: either 0.0 or 1.0 / default is 0.0 (not metal)
		roughness: 0.0 // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)
	});

	this.material.isCheckered = 0.0; // range: either 0.0 (not checkered) or 1.0 (checkered) / default is 0.0 (not checkered)
	this.material.color2 = new THREE.Color(0.0, 0.0, 0.0); // .color2 is used if this shape will have a checkered material

	this.uvScale = new THREE.Vector2(1, 1);

	return this;
}


function onWindowResize(event)
{

	windowIsBeingResized = true;

	// the following change to document.body.clientWidth and Height works better for mobile, especially iOS
	// suggestion from Github user q750831855  - Thank you!
	SCREEN_WIDTH = document.body.clientWidth; //window.innerWidth; 
	SCREEN_HEIGHT = document.body.clientHeight; //window.innerHeight;

	renderer.setPixelRatio(pixelRatio);
	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

	fontAspect = (SCREEN_WIDTH / 175) * (SCREEN_HEIGHT / 200);
	if (fontAspect > 25) fontAspect = 25;
	if (fontAspect < 4) fontAspect = 4;
	fontAspect *= 2;

	rayTracingUniforms.uResolution.value.x = context.drawingBufferWidth;
	rayTracingUniforms.uResolution.value.y = context.drawingBufferHeight;

	rayTracingRenderTarget.setSize(context.drawingBufferWidth, context.drawingBufferHeight);
	screenCopyRenderTarget.setSize(context.drawingBufferWidth, context.drawingBufferHeight);

	worldCamera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
	// the following is normally used with traditional rasterized rendering, but it is not needed for our fragment shader raytraced rendering 
	///worldCamera.updateProjectionMatrix();

	// the following scales all scene objects by the worldCamera's field of view,
	// taking into account the screen aspect ratio and multiplying the uniform uULen,
	// the x-coordinate, by this ratio
	fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
	rayTracingUniforms.uVLen.value = Math.tan(fovScale);
	rayTracingUniforms.uULen.value = rayTracingUniforms.uVLen.value * worldCamera.aspect;

	if (!mouseControl)
	{
		button1Element.style.display = "";
		button2Element.style.display = "";
		button3Element.style.display = "";
		button4Element.style.display = "";
		button5Element.style.display = "";
		button6Element.style.display = "";
		// check if mobile device is in portrait or landscape mode and position buttons accordingly
		if (SCREEN_WIDTH < SCREEN_HEIGHT)
		{
			button1Element.style.right = 36 + "%";
			button2Element.style.right = 2 + "%";
			button3Element.style.right = 16 + "%";
			button4Element.style.right = 16 + "%";
			button5Element.style.right = 3 + "%";
			button6Element.style.right = 3 + "%";

			button1Element.style.bottom = 5 + "%";
			button2Element.style.bottom = 5 + "%";
			button3Element.style.bottom = 13 + "%";
			button4Element.style.bottom = 2 + "%";
			button5Element.style.bottom = 25 + "%";
			button6Element.style.bottom = 18 + "%";
		}
		else
		{
			button1Element.style.right = 22 + "%";
			button2Element.style.right = 3 + "%";
			button3Element.style.right = 11 + "%";
			button4Element.style.right = 11 + "%";
			button5Element.style.right = 3 + "%";
			button6Element.style.right = 3 + "%";

			button1Element.style.bottom = 10 + "%";
			button2Element.style.bottom = 10 + "%";
			button3Element.style.bottom = 26 + "%";
			button4Element.style.bottom = 4 + "%";
			button5Element.style.bottom = 48 + "%";
			button6Element.style.bottom = 34 + "%";
		}
	} // end if ( !mouseControl ) {

} // end function onWindowResize( event )



function init()
{

	window.addEventListener('resize', onWindowResize, false);
	window.addEventListener('orientationchange', onWindowResize, false);

	if ('ontouchstart' in window) 
	{
		mouseControl = false;
		// if on mobile device, unpause the app because there is no ESC key and no mouse capture to do
		isPaused = false;

		ableToEngagePointerLock = true;

		mobileJoystickControls = new MobileJoystickControls({
			//showJoystick: true
		});
	}

	// default GUI elements for all demos

	pixel_ResolutionObject = {
		pixel_Resolution: 0.5 // will be set by each demo's js file
	}
	orthographicCamera_ToggleObject = {
		Orthographic_Camera: false
	}

	function handlePixelResolutionChange()
	{
		needChangePixelResolution = true;
	}
	function handleCameraProjectionChange()
	{
		if (!currentlyUsingOrthographicCamera)
			changeToOrthographicCamera = true;
		else if (currentlyUsingOrthographicCamera)
			changeToPerspectiveCamera = true;
		// toggle boolean flag
		currentlyUsingOrthographicCamera = !currentlyUsingOrthographicCamera;
	}


	gui = new GUI();

	pixel_ResolutionController = gui.add(pixel_ResolutionObject, 'pixel_Resolution', 0.5, 1.0, 0.05).onChange(handlePixelResolutionChange);
	if (!mouseControl)
		orthographicCamera_ToggleController = gui.add(orthographicCamera_ToggleObject, 'Orthographic_Camera', false).onChange(handleCameraProjectionChange);

	gui.domElement.style.userSelect = "none";
	gui.domElement.style.MozUserSelect = "none";


	if (mouseControl) 
	{

		gui.domElement.addEventListener("mouseenter", function(event) 
		{
			ableToEngagePointerLock = false;
		}, false);
		gui.domElement.addEventListener("mouseleave", function(event) 
		{
			ableToEngagePointerLock = true;
		}, false);

		window.addEventListener('wheel', onMouseWheel, false);

		window.addEventListener("dblclick", function(event) 
		{
			event.preventDefault();
		}, false);

		document.body.addEventListener("click", function(event) 
		{
			if (!ableToEngagePointerLock)
				return;
			this.requestPointerLock = this.requestPointerLock || this.mozRequestPointerLock;
			this.requestPointerLock();
		}, false);


		pointerlockChange = function(event)
		{
			if (document.pointerLockElement === document.body ||
				document.mozPointerLockElement === document.body || document.webkitPointerLockElement === document.body)
			{
				document.addEventListener('keydown', onKeyDown, false);
				document.addEventListener('keyup', onKeyUp, false);
				isPaused = false;
			}
			else
			{
				document.removeEventListener('keydown', onKeyDown, false);
				document.removeEventListener('keyup', onKeyUp, false);
				isPaused = true;
			}
		};

		// Hook pointer lock state change events
		document.addEventListener('pointerlockchange', pointerlockChange, false);
		document.addEventListener('mozpointerlockchange', pointerlockChange, false);
		document.addEventListener('webkitpointerlockchange', pointerlockChange, false);

	} // end if (mouseControl)


	/* // Fullscreen API (optional)
	document.addEventListener("click", function() 
	{
		if ( !document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement ) 
		{
			if (document.documentElement.requestFullscreen) 
				document.documentElement.requestFullscreen();	
			else if (document.documentElement.mozRequestFullScreen) 
				document.documentElement.mozRequestFullScreen();
			else if (document.documentElement.webkitRequestFullscreen) 
				document.documentElement.webkitRequestFullscreen();
		}
	}); */

	// load a resource
	blueNoiseTexture = textureLoader.load(
		// resource URL
		'textures/BlueNoise_RGBA256.png',

		// onLoad callback
		function(texture)
		{
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.flipY = false;
			texture.minFilter = THREE.NearestFilter;
			texture.magFilter = THREE.NearestFilter;
			texture.generateMipmaps = false;
			//console.log("blue noise texture loaded");

			initTHREEjs(); // boilerplate: init necessary three.js items and scene/demo-specific objects
		}
	);


} // end function init()



function initTHREEjs()
{

	canvas = document.createElement('canvas');

	renderer = new THREE.WebGLRenderer({ canvas: canvas, context: canvas.getContext('webgl2') });
	//suggestion: set to false for production
	renderer.debug.checkShaderErrors = true;

	renderer.autoClear = false;

	renderer.toneMapping = THREE.ReinhardToneMapping;

	//required by WebGL 2.0 for rendering to FLOAT textures
	context = renderer.getContext();
	context.getExtension('EXT_color_buffer_float');

	container = document.getElementById('container');
	container.appendChild(renderer.domElement);

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.cursor = "default";
	stats.domElement.style.userSelect = "none";
	stats.domElement.style.MozUserSelect = "none";
	container.appendChild(stats.domElement);


	clock = new THREE.Clock();

	rayTracingScene = new THREE.Scene();
	screenCopyScene = new THREE.Scene();
	screenOutputScene = new THREE.Scene();

	// quadCamera is simply the camera to help render the full screen quad (2 triangles),
	// hence the name.  It is an Orthographic camera that sits facing the view plane, which serves as
	// the window into our 3d world. This camera will not move or rotate for the duration of the app.
	quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	screenCopyScene.add(quadCamera);
	screenOutputScene.add(quadCamera);

	// worldCamera is the dynamic camera 3d object that will be positioned, oriented and 
	// constantly updated inside the 3d scene.  Its view will ultimately get passed back to the 
	// stationary quadCamera, which renders the scene to a fullscreen quad (made up of 2 large triangles).
	worldCamera = new THREE.PerspectiveCamera(60, document.body.clientWidth / document.body.clientHeight, 1, 1000);
	rayTracingScene.add(worldCamera);

	controls = new FirstPersonCameraControls(worldCamera);

	cameraControlsObject = controls.getObject();
	cameraControlsYawObject = controls.getYawObject();
	cameraControlsPitchObject = controls.getPitchObject();

	rayTracingScene.add(cameraControlsObject);


	// setup render targets...
	rayTracingRenderTarget = new THREE.WebGLRenderTarget(context.drawingBufferWidth, context.drawingBufferHeight, {
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		depthBuffer: false,
		stencilBuffer: false
	});
	rayTracingRenderTarget.texture.generateMipmaps = false;

	screenCopyRenderTarget = new THREE.WebGLRenderTarget(context.drawingBufferWidth, context.drawingBufferHeight, {
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		depthBuffer: false,
		stencilBuffer: false
	});
	screenCopyRenderTarget.texture.generateMipmaps = false;

	


	// setup scene/demo-specific objects, variables, GUI elements, and data
	initSceneData();

	pixel_ResolutionController.setValue(pixelRatio);
	if (!allowOrthographicCamera && !mouseControl)
	{
		orthographicCamera_ToggleController.domElement.hidden = true;
		orthographicCamera_ToggleController.domElement.remove();
	}



	// setup screen-size quad geometry and shaders....

	// this full-screen quad mesh performs the ray tracing operations and produces a screen-sized image
	rayTracingGeometry = new THREE.PlaneGeometry(2, 2);

	rayTracingUniforms.uPreviousTexture = { type: "t", value: screenCopyRenderTarget.texture };
	rayTracingUniforms.uBlueNoiseTexture = { type: "t", value: blueNoiseTexture };

	rayTracingUniforms.uCameraMatrix = { type: "m4", value: new THREE.Matrix4() };

	rayTracingUniforms.uResolution = { type: "v2", value: new THREE.Vector2() };
	rayTracingUniforms.uRandomVec2 = { type: "v2", value: new THREE.Vector2() };

	rayTracingUniforms.uEPS_intersect = { type: "f", value: EPS_intersect };
	rayTracingUniforms.uTime = { type: "f", value: 0.0 };
	rayTracingUniforms.uSampleCounter = { type: "f", value: 0.0 };
	rayTracingUniforms.uPreviousSampleCount = { type: "f", value: 1.0 };
	rayTracingUniforms.uFrameCounter = { type: "f", value: 1.0 };
	rayTracingUniforms.uULen = { type: "f", value: 1.0 };
	rayTracingUniforms.uVLen = { type: "f", value: 1.0 };
	rayTracingUniforms.uApertureSize = { type: "f", value: apertureSize };
	rayTracingUniforms.uFocusDistance = { type: "f", value: focusDistance };

	rayTracingUniforms.uCameraIsMoving = { type: "b1", value: false };
	rayTracingUniforms.uUseOrthographicCamera = { type: "b1", value: false };


	rayTracingDefines = {
		//NUMBER_OF_TRIANGLES: total_number_of_triangles
	};

	// load vertex and fragment shader files that are used in the rayTracing material, mesh and scene
	fileLoader.load('shaders/CommonRayTracing_Vertex.glsl', function(vertexShaderText)
	{
		rayTracingVertexShader = vertexShaderText;

		fileLoader.load('shaders/' + demoFragmentShaderFileName, function(fragmentShaderText)
		{

			rayTracingFragmentShader = fragmentShaderText;

			rayTracingMaterial = new THREE.ShaderMaterial({
				uniforms: rayTracingUniforms,
				uniformsGroups: rayTracingUniformsGroups,
				defines: rayTracingDefines,
				vertexShader: rayTracingVertexShader,
				fragmentShader: rayTracingFragmentShader,
				depthTest: false,
				depthWrite: false
			});

			rayTracingMesh = new THREE.Mesh(rayTracingGeometry, rayTracingMaterial);
			rayTracingScene.add(rayTracingMesh);

			// the following keeps the large scene ShaderMaterial quad right in front 
			//   of the camera at all times. This is necessary because without it, the scene 
			//   quad will fall out of view and get clipped when the camera rotates past 180 degrees.
			worldCamera.add(rayTracingMesh);

		});
	});


	// this full-screen quad mesh copies the image output of the raytracing shader and feeds it back in to that shader as a 'previousTexture'
	screenCopyGeometry = new THREE.PlaneGeometry(2, 2);

	screenCopyUniforms = {
		uRayTracedImageTexture: { type: "t", value: rayTracingRenderTarget.texture }
	};

	fileLoader.load('shaders/ScreenCopy_Fragment.glsl', function(shaderText)
	{

		screenCopyFragmentShader = shaderText;

		screenCopyMaterial = new THREE.ShaderMaterial({
			uniforms: screenCopyUniforms,
			vertexShader: rayTracingVertexShader,
			fragmentShader: screenCopyFragmentShader,
			depthWrite: false,
			depthTest: false
		});

		screenCopyMesh = new THREE.Mesh(screenCopyGeometry, screenCopyMaterial);
		screenCopyScene.add(screenCopyMesh);
	});


	// this full-screen quad mesh takes the image output of the ray tracing shader (which is a continuous blend of the previous frame and current frame),
	// and applies gamma correction (which brightens the entire image), and then displays the final accumulated rendering to the screen
	screenOutputGeometry = new THREE.PlaneGeometry(2, 2);

	screenOutputUniforms = {
		uRayTracedImageTexture: { type: "t", value: rayTracingRenderTarget.texture },
		uSampleCounter: { type: "f", value: 0.0 },
		uOneOverSampleCounter: { type: "f", value: 0.0 },
		uSceneIsDynamic: { type: "b1", value: sceneIsDynamic },
		uUseToneMapping: { type: "b1", value: useToneMapping }
	};

	fileLoader.load('shaders/ScreenOutput_Fragment.glsl', function(shaderText)
	{
		screenOutputFragmentShader = shaderText;

		screenOutputMaterial = new THREE.ShaderMaterial({
			uniforms: screenOutputUniforms,
			vertexShader: rayTracingVertexShader,
			fragmentShader: screenOutputFragmentShader,
			depthWrite: false,
			depthTest: false
		});

		screenOutputMesh = new THREE.Mesh(screenOutputGeometry, screenOutputMaterial);
		screenOutputScene.add(screenOutputMesh);
	});


	// this 'jumpstarts' the initial dimensions and parameters for the window and renderer
	onWindowResize();

	// everything is set up, now we can start animating
	animate();

} // end function initTHREEjs()




function animate()
{

	frameTime = clock.getDelta();

	elapsedTime = clock.getElapsedTime() % 1000;

	// reset flags
	cameraIsMoving = false;

	// if GUI has been used, update
	if (needChangePixelResolution)
	{
		pixelRatio = pixel_ResolutionController.getValue();
		onWindowResize();
		needChangePixelResolution = false;
	}

	if (windowIsBeingResized)
	{
		cameraIsMoving = true;
		windowIsBeingResized = false;
	}

	// check user controls
	if (mouseControl)
	{
		// movement detected
		if (oldYawRotation != cameraControlsYawObject.rotation.y ||
			oldPitchRotation != cameraControlsPitchObject.rotation.x)
		{
			cameraIsMoving = true;
		}

		// save state for next frame
		oldYawRotation = cameraControlsYawObject.rotation.y;
		oldPitchRotation = cameraControlsPitchObject.rotation.x;

	} // end if (mouseControl)

	// if on mobile device, get input from the mobileJoystickControls
	if (!mouseControl)
	{

		newDeltaX = joystickDeltaX * cameraRotationSpeed;

		if (newDeltaX)
		{
			cameraIsMoving = true;
			mobileControlsMoveX = oldDeltaX - newDeltaX;
			// mobileJoystick X movement (left and right) affects camera rotation around the Y axis	
			cameraControlsYawObject.rotation.y += (mobileControlsMoveX) * 0.01;
		}

		newDeltaY = joystickDeltaY * cameraRotationSpeed;

		if (newDeltaY)
		{
			cameraIsMoving = true;
			mobileControlsMoveY = oldDeltaY - newDeltaY;
			// mobileJoystick Y movement (up and down) affects camera rotation around the X axis	
			cameraControlsPitchObject.rotation.x += (mobileControlsMoveY) * 0.01;
		}

		// clamp the camera's vertical movement (around the x-axis) to the scene's 'ceiling' and 'floor',
		// so you can't accidentally flip the camera upside down
		cameraControlsPitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, cameraControlsPitchObject.rotation.x));

		// save state for next frame
		oldDeltaX = newDeltaX;
		oldDeltaY = newDeltaY;

		newPinchWidthX = pinchWidthX;
		newPinchWidthY = pinchWidthY;
		pinchDeltaX = newPinchWidthX - oldPinchWidthX;
		pinchDeltaY = newPinchWidthY - oldPinchWidthY;

		if (Math.abs(pinchDeltaX) > Math.abs(pinchDeltaY))
		{
			if (pinchDeltaX < -1)
			{
				increaseFOV = true;
				dollyCameraOut = true;
			}
			if (pinchDeltaX > 1)
			{
				decreaseFOV = true;
				dollyCameraIn = true;
			}
		}

		if (Math.abs(pinchDeltaY) >= Math.abs(pinchDeltaX))
		{
			if (pinchDeltaY > 1)
			{
				increaseAperture = true;
			}
			if (pinchDeltaY < -1)
			{
				decreaseAperture = true;
			}
		}

		// save state for next frame
		oldPinchWidthX = newPinchWidthX;
		oldPinchWidthY = newPinchWidthY;

	} // end if ( !mouseControl )

	// this gives us a vector in the direction that the camera is pointing,
	// which will be useful for moving the camera 'forward' and shooting projectiles in that direction
	controls.getDirection(cameraDirectionVector);
	cameraDirectionVector.normalize();
	controls.getUpVector(cameraUpVector);
	cameraUpVector.normalize();
	controls.getRightVector(cameraRightVector);
	cameraRightVector.normalize();

	// the following gives us a rotation quaternion (4D vector), which will be useful for 
	// rotating scene objects to match the camera's rotation
	worldCamera.getWorldQuaternion(cameraWorldQuaternion);

	if (useGenericInput)
	{

		if (!isPaused)
		{
			if ((keyPressed('KeyW') || button3Pressed) && !(keyPressed('KeyS') || button4Pressed))
			{
				cameraControlsObject.position.add(cameraDirectionVector.multiplyScalar(cameraFlightSpeed * frameTime));
				cameraIsMoving = true;
			}
			if ((keyPressed('KeyS') || button4Pressed) && !(keyPressed('KeyW') || button3Pressed))
			{
				cameraControlsObject.position.sub(cameraDirectionVector.multiplyScalar(cameraFlightSpeed * frameTime));
				cameraIsMoving = true;
			}
			if ((keyPressed('KeyA') || button1Pressed) && !(keyPressed('KeyD') || button2Pressed))
			{
				cameraControlsObject.position.sub(cameraRightVector.multiplyScalar(cameraFlightSpeed * frameTime));
				cameraIsMoving = true;
			}
			if ((keyPressed('KeyD') || button2Pressed) && !(keyPressed('KeyA') || button1Pressed))
			{
				cameraControlsObject.position.add(cameraRightVector.multiplyScalar(cameraFlightSpeed * frameTime));
				cameraIsMoving = true;
			}
			if (keyPressed('KeyQ') && !keyPressed('KeyZ'))
			{
				cameraControlsObject.position.add(cameraUpVector.multiplyScalar(cameraFlightSpeed * frameTime));
				cameraIsMoving = true;
			}
			if (keyPressed('KeyZ') && !keyPressed('KeyQ'))
			{
				cameraControlsObject.position.sub(cameraUpVector.multiplyScalar(cameraFlightSpeed * frameTime));
				cameraIsMoving = true;
			}
			if ((keyPressed('ArrowUp') || button5Pressed) && !(keyPressed('ArrowDown') || button6Pressed))
			{
				increaseFocusDist = true;
			}
			if ((keyPressed('ArrowDown') || button6Pressed) && !(keyPressed('ArrowUp') || button5Pressed))
			{
				decreaseFocusDist = true;
			}
			if (keyPressed('ArrowRight') && !keyPressed('ArrowLeft'))
			{
				increaseAperture = true;
			}
			if (keyPressed('ArrowLeft') && !keyPressed('ArrowRight'))
			{
				decreaseAperture = true;
			}
			if (keyPressed('KeyO') && canPress_O)
			{
				changeToOrthographicCamera = true;
				canPress_O = false;
			}
			if (!keyPressed('KeyO'))
				canPress_O = true;

			if (keyPressed('KeyP') && canPress_P)
			{
				changeToPerspectiveCamera = true;
				canPress_P = false;
			}
			if (!keyPressed('KeyP'))
				canPress_P = true;
		} // end if (!isPaused)

	} // end if (useGenericInput)



	// update scene/demo-specific input(if custom), variables and uniforms every animation frame
	updateVariablesAndUniforms();


	if (increaseFOV)
	{
		worldCamera.fov++;
		if (worldCamera.fov > 179)
			worldCamera.fov = 179;
		fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
		rayTracingUniforms.uVLen.value = Math.tan(fovScale);
		rayTracingUniforms.uULen.value = rayTracingUniforms.uVLen.value * worldCamera.aspect;

		cameraIsMoving = true;
		increaseFOV = false;
	}
	if (decreaseFOV)
	{
		worldCamera.fov--;
		if (worldCamera.fov < 1)
			worldCamera.fov = 1;
		fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
		rayTracingUniforms.uVLen.value = Math.tan(fovScale);
		rayTracingUniforms.uULen.value = rayTracingUniforms.uVLen.value * worldCamera.aspect;

		cameraIsMoving = true;
		decreaseFOV = false;
	}

	if (increaseFocusDist)
	{
		focusDistance += (0.1 * focusChangeSpeed);
		rayTracingUniforms.uFocusDistance.value = focusDistance;
		cameraIsMoving = true;
		increaseFocusDist = false;
	}
	if (decreaseFocusDist)
	{
		focusDistance -= (0.1 * focusChangeSpeed);
		if (focusDistance < 1)
			focusDistance = 1;
		rayTracingUniforms.uFocusDistance.value = focusDistance;
		cameraIsMoving = true;
		decreaseFocusDist = false;
	}

	if (increaseAperture)
	{
		apertureSize += (0.1 * apertureChangeSpeed);
		if (apertureSize > 10000.0)
			apertureSize = 10000.0;
		rayTracingUniforms.uApertureSize.value = apertureSize;
		cameraIsMoving = true;
		increaseAperture = false;
	}
	if (decreaseAperture)
	{
		apertureSize -= (0.1 * apertureChangeSpeed);
		if (apertureSize < 0.0)
			apertureSize = 0.0;
		rayTracingUniforms.uApertureSize.value = apertureSize;
		cameraIsMoving = true;
		decreaseAperture = false;
	}
	if (allowOrthographicCamera && changeToOrthographicCamera)
	{
		storedFOV = worldCamera.fov; // save current perspective camera's FOV

		worldCamera.fov = 90; // good default for Ortho camera - lets user see most of the scene
		fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
		rayTracingUniforms.uVLen.value = Math.tan(fovScale);
		rayTracingUniforms.uULen.value = rayTracingUniforms.uVLen.value * worldCamera.aspect;

		rayTracingUniforms.uUseOrthographicCamera.value = true;
		cameraIsMoving = true;
		changeToOrthographicCamera = false;
	}
	if (allowOrthographicCamera && changeToPerspectiveCamera)
	{
		worldCamera.fov = storedFOV; // return to prior perspective camera's FOV
		fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
		rayTracingUniforms.uVLen.value = Math.tan(fovScale);
		rayTracingUniforms.uULen.value = rayTracingUniforms.uVLen.value * worldCamera.aspect;

		rayTracingUniforms.uUseOrthographicCamera.value = false;
		cameraIsMoving = true;
		changeToPerspectiveCamera = false;
	}

	// now update uniforms that are common to all scenes
	if (!cameraIsMoving)
	{
		if (sceneIsDynamic)
			sampleCounter = 1.0; // reset for continuous updating of image
		else sampleCounter += 1.0; // for progressive refinement of image

		frameCounter += 1.0;

		cameraRecentlyMoving = false;
	}

	if (cameraIsMoving)
	{
		frameCounter += 1.0;

		if (!cameraRecentlyMoving)
		{
			// record current sampleCounter before it gets set to 1.0 below
			rayTracingUniforms.uPreviousSampleCount.value = sampleCounter;
			frameCounter = 1.0;
			cameraRecentlyMoving = true;
		}

		sampleCounter = 1.0;
	}

	rayTracingUniforms.uTime.value = elapsedTime;
	rayTracingUniforms.uCameraIsMoving.value = cameraIsMoving;
	rayTracingUniforms.uSampleCounter.value = sampleCounter;
	rayTracingUniforms.uFrameCounter.value = frameCounter;
	rayTracingUniforms.uRandomVec2.value.set(Math.random(), Math.random());

	// CAMERA
	cameraControlsObject.updateMatrixWorld(true);
	worldCamera.updateMatrixWorld(true);
	rayTracingUniforms.uCameraMatrix.value.copy(worldCamera.matrixWorld);

	screenOutputUniforms.uSampleCounter.value = sampleCounter;
	// PROGRESSIVE SAMPLE WEIGHT (reduces intensity of each successive animation frame's image)
	screenOutputUniforms.uOneOverSampleCounter.value = 1.0 / sampleCounter;


	// RENDERING in 3 steps

	// STEP 1
	// Perform RayTracing and Render(save) into rayTracingRenderTarget, a full-screen texture.
	// Read previous screenCopyRenderTarget(via texelFetch inside fragment shader) to use as a new starting point to blend with
	renderer.setRenderTarget(rayTracingRenderTarget);
	renderer.render(rayTracingScene, worldCamera);

	// STEP 2
	// Render(copy) the rayTracingScene output(rayTracingRenderTarget above) into screenCopyRenderTarget.
	// This will be used as a new starting point for Step 1 above (essentially creating ping-pong buffers)
	renderer.setRenderTarget(screenCopyRenderTarget);
	renderer.render(screenCopyScene, quadCamera);

	// STEP 3
	// Render full screen quad with generated rayTracingRenderTarget in STEP 1 above.
	// After applying tonemapping and gamma-correction to the image, it will be shown on the screen as the final accumulated output
	renderer.setRenderTarget(null);
	renderer.render(screenOutputScene, quadCamera);

	stats.update();

	requestAnimationFrame(animate);

} // end function animate()
