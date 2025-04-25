// scene/demo-specific variables go here
let UVGridTexture;
let imageTexturesTotalCount = 1;
let numOfImageTexturesLoaded = 0;

let material_TypeObject;
let material_TypeController;
let changeMaterialType = false;
let matType = 0;


// called automatically from within initTHREEjs() function (located in InitCommon.js file)
function initSceneData() 
{
	demoFragmentShaderFileName = 'InstanceMapping_Fragment.glsl';

	// scene/demo-specific three.js objects setup goes here
	sceneIsDynamic = false;
	
	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 1.0 : 0.75; // less demanding on battery-powered mobile devices

	EPS_intersect = 0.01;
	

	// set camera's field of view and other options
	worldCamera.fov = 60;
	focusDistance = 23.0;
	//apertureChangeSpeed = 1; // 1 is default
	//focusChangeSpeed = 1; // 1 is default

	// position and orient camera
	cameraControlsObject.position.set(1, 6, 16);
	// look left or right
	///cameraControlsYawObject.rotation.y = 0.3;
	// look up or down
	cameraControlsPitchObject.rotation.x = 0.005;

	cameraFlightSpeed = 10;

	// In addition to the default GUI on all demos, add any special GUI elements that this particular demo requires
	
	material_TypeObject = {
		LeftSpheres_Material: 'Metal'
	};
	
	function handleMaterialTypeChange() 
	{
		changeMaterialType = true;
	}
	
	material_TypeController = gui.add(material_TypeObject, 'LeftSpheres_Material', ['Diffuse', 
		'Metal', 'ClearCoat Diffuse', 'Transparent Refractive']).onChange(handleMaterialTypeChange);

	// scene/demo-specific uniforms go here     
	rayTracingUniforms.uUVGridTexture = { value: UVGridTexture };
	rayTracingUniforms.uMaterialType = { value: 2 };

} // end function initSceneData()



// called automatically from within the animate() function (located in InitCommon.js file)
function updateVariablesAndUniforms() 
{   
	if (changeMaterialType) 
	{
		matType = material_TypeController.getValue();

		if (matType == 'Diffuse') 
		{
			rayTracingUniforms.uMaterialType.value = 1;
		}
		else if (matType == 'Metal') 
		{
			rayTracingUniforms.uMaterialType.value = 2;	
		}
		else if (matType == 'ClearCoat Diffuse') 
		{
			rayTracingUniforms.uMaterialType.value = 3;	
		}
		else if (matType == 'Transparent Refractive') 
		{
			rayTracingUniforms.uMaterialType.value = 4;
		}
			
		cameraIsMoving = true;
		changeMaterialType = false;
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
