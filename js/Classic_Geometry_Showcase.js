// scene/demo-specific variables go here
let UVGridTexture;
let imageTexturesTotalCount = 1;
let numOfImageTexturesLoaded = 0;
let material_RoughnessObject, material_RoughnessController;
let needChangeMaterialRoughness = false;
let material_MetalnessObject, material_MetalnessController;
let needChangeMaterialMetalness = false;

// called automatically from within initTHREEjs() function (located in InitCommon.js file)
function initSceneData() 
{
	demoFragmentShaderFileName = 'ClassicGeometryShowcase_Fragment.glsl';

	// scene/demo-specific three.js objects setup goes here
	sceneIsDynamic = false;
	
	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 1.0 : 0.75; // less demanding on battery-powered mobile devices

	//EPS_intersect = 0.01;
	

	// set camera's field of view and other options
	worldCamera.fov = 60;
	focusDistance = 23.0;
	//apertureChangeSpeed = 1; // 1 is default
	//focusChangeSpeed = 1; // 1 is default

	// position and orient camera
	cameraControlsObject.position.set(3, 5, 25);
	// look left or right
	cameraControlsYawObject.rotation.y = 0.3;
	// look up or down
	cameraControlsPitchObject.rotation.x = 0.005;

	cameraFlightSpeed = 30;

	// In addition to the default GUI on all demos, add any special GUI elements that this particular demo requires
	material_RoughnessObject = { Material_Roughness: 0.0 };
	material_MetalnessObject = { GoldSphere_Metalness: 1.0 };

	function handleMaterialRoughnessChange() 
	{ 
		needChangeMaterialRoughness = true; 
	}
	function handleMaterialMetalnessChange() 
	{ 
		needChangeMaterialMetalness = true; 
	}

	material_RoughnessController = gui.add(material_RoughnessObject, 'Material_Roughness', 0.0, 1.0, 0.01).onChange(handleMaterialRoughnessChange);
	material_MetalnessController = gui.add(material_MetalnessObject, 'GoldSphere_Metalness', 0.0, 1.0, 0.01).onChange(handleMaterialMetalnessChange);

	// jumpstart some of the gui controller-change handlers so that the pathtracing fragment shader uniforms are correct and up-to-date
	handleMaterialRoughnessChange();
	handleMaterialMetalnessChange();


	// scene/demo-specific uniforms go here     
	rayTracingUniforms.uUVGridTexture = { value: UVGridTexture };
	rayTracingUniforms.uRoughness = { value: 0.0 };
	rayTracingUniforms.uMetalness = { value: 1.0 };

} // end function initSceneData()



// called automatically from within the animate() function (located in InitCommon.js file)
function updateVariablesAndUniforms() 
{   

	if (needChangeMaterialRoughness) 
	{
		rayTracingUniforms.uRoughness.value = material_RoughnessController.getValue();
		cameraIsMoving = true;
		needChangeMaterialRoughness = false;
	}

	if (needChangeMaterialMetalness) 
	{
		rayTracingUniforms.uMetalness.value = material_MetalnessController.getValue();
		cameraIsMoving = true;
		needChangeMaterialMetalness = false;
	}

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
