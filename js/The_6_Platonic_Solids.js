// scene/demo-specific variables go here
let marbleTexture;
let imageTexturesTotalCount = 1;
let numOfImageTexturesLoaded = 0;

let material_TypeObject;
let material_TypeController;
let changeMaterialType = false;
let matType = 0;

let tetrahedron, cube, octahedron, dodecahedron, icosahedron;

// triangular model 
let vp0 = new THREE.Vector3(); // vertex positions data
let vp1 = new THREE.Vector3();
let vp2 = new THREE.Vector3();
let vn0 = new THREE.Vector3(); // vertex normals data
let vn1 = new THREE.Vector3();
let vn2 = new THREE.Vector3();
let vt0 = new THREE.Vector2(); // vertex texture-coordinates(UV) data
let vt1 = new THREE.Vector2();
let vt2 = new THREE.Vector2();
let modelMesh;
let modelPositionOffset = new THREE.Vector3();
let modelScale = 1.0;
let meshList = [];
let geoList = [];
let triangleDataTexture;
let aabbDataTexture;
let totalGeometryCount = 0;
let total_number_of_triangles = 0;
let totalWork;
let triangle_array = new Float32Array(2048 * 2048 * 4);
// 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components
let aabb_array = new Float32Array(2048 * 2048 * 4);
// 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components
let triangleMaterialMarkers = [];
let pathTracingMaterialList = [];



function load_GLTF_Model() 
{

	let gltfLoader = new GLTFLoader();

	gltfLoader.load("models/UtahTeapot.glb", function (meshGroup)
	{ // Triangles: 992

		if (meshGroup.scene)
			meshGroup = meshGroup.scene;

		meshGroup.traverse(function (child)
		{
			if (child.isMesh)
			{
				triangleMaterialMarkers.push(child.geometry.attributes.position.array.length / 9);
				meshList.push(child);
			}
		});

		modelMesh = meshList[0].clone();

		for (let i = 0; i < meshList.length; i++)
		{
			geoList.push(meshList[i].geometry);
		}

		modelMesh.geometry = mergeGeometries(geoList);

		if (modelMesh.geometry.index)
			modelMesh.geometry = modelMesh.geometry.toNonIndexed();

		modelMesh.geometry.center();

		// now that the model has loaded, we can init
		init();

	}); // end gltfLoader.load()

} // end function load_GLTF_Model()


// called automatically from within initTHREEjs() function (located in InitCommon.js file)
function initSceneData() 
{
	demoFragmentShaderFileName = 'The6PlatonicSolids_Fragment.glsl';

	// scene/demo-specific three.js objects setup goes here
	sceneIsDynamic = false;
	
	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 0.75 : 0.75;
	
	EPS_intersect = 0.01;
	
	// in order to match the color palette of this classic scene, the tone mapper is not needed
	useToneMapping = false;

	// set camera's field of view and other options
	worldCamera.fov = 30;
	focusDistance = 34.0;
	//apertureChangeSpeed = 1; // 1 is default
	//focusChangeSpeed = 1; // 1 is default

	// position and orient camera
	cameraControlsObject.position.set(10, 18.6, 30.5);
	// look left or right
	cameraControlsYawObject.rotation.y = 0.2756;
	// look up or down
	cameraControlsPitchObject.rotation.x = -0.375;

	cameraFlightSpeed = 10;


	tetrahedron = new RayTracingShape("convex polyhedron");

	tetrahedron.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	tetrahedron.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	tetrahedron.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	tetrahedron.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	tetrahedron.material.metalness = 1.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	tetrahedron.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	tetrahedron.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	tetrahedron.transform.scale.set(1.31, 1.31, 1.31);
	tetrahedron.transform.position.set(0.2, 7.9, 0.33);
	tetrahedron.transform.rotation.set(-0.65, 0.3, 1.0); // this rotates the rectangle back from upright (default) to flat along the ground
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	tetrahedron.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	cube = new RayTracingShape("box");

	cube.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	cube.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	cube.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	cube.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	cube.material.metalness = 1.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	cube.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	cube.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	cube.transform.scale.set(1, 1, 1);
	cube.transform.position.set(-5.5, 8.75, 0);
	cube.transform.rotation.set(Math.PI * 0.5, Math.PI * -0.3, Math.PI * 0.75);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	cube.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	octahedron = new RayTracingShape("convex polyhedron");

	octahedron.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	octahedron.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	octahedron.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	octahedron.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	octahedron.material.metalness = 1.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	octahedron.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	octahedron.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	octahedron.transform.scale.set(1.8, 1.8, 1.8);
	octahedron.transform.position.set(5.5, 8.87, 0);
	octahedron.transform.rotation.set(0, Math.PI * 0.25, 0);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	octahedron.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	dodecahedron = new RayTracingShape("convex polyhedron");

	dodecahedron.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	dodecahedron.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	dodecahedron.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	dodecahedron.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	dodecahedron.material.metalness = 1.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	dodecahedron.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	dodecahedron.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	dodecahedron.transform.scale.set(1.7, 1.7, 1.7);
	dodecahedron.transform.position.set(-5.5, 11.3, -6);
	dodecahedron.transform.rotation.set(Math.PI * 0.5, 0, 0);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	dodecahedron.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	icosahedron = new RayTracingShape("convex polyhedron");

	icosahedron.material.color.set(1.0, 1.0, 1.0); // (r,g,b) range: 0.0 to 1.0 / default is rgb(1,1,1) white
	icosahedron.material.opacity = 1.0; // range: 0.0 to 1.0 / default is 1.0 (fully opaque)
	icosahedron.material.ior = 1.5; // range: 1.0(air) to 2.33(diamond) / default is 1.5(glass) / other useful ior is 1.33(water)
	icosahedron.material.clearcoat = 1.0; // range: 0.0 to 1.0 / default is 0.0 (no clearcoat)
	icosahedron.material.metalness = 1.0; // range: either 0.0 or 1.0 / default is 0.0 (not metal)
	icosahedron.material.roughness = 0.0; // range: 0.0 to 1.0 / default is 0.0 (no roughness, perfectly smooth)

	icosahedron.uvScale.set(1, 1); // if checkered or using a texture, how many times should the uv's repeat in the X axis / Y axis?

	icosahedron.transform.scale.set(1.8, 1.8, 1.8);
	icosahedron.transform.position.set(5.5, 11.25, -6);
	icosahedron.transform.rotation.set(Math.PI * 0.5, 0, 0);
	// after specifying any desired transforms (scale, position, rotation), we must call updateMatrixWorld() to actually fill in the shape's matrix with these new values
	icosahedron.transform.updateMatrixWorld(true); // 'true' forces a matrix update now, rather than waiting for Three.js' 'renderer.render()' call which happens last


	// scale and place Utah teapot glTF model 
	modelMesh.scale.set(0.18, 0.18, 0.18);
	modelMesh.rotation.set(0, -Math.PI * 0.7, 0);
	modelMesh.position.set(0, 10.95, -6);
	modelMesh.updateMatrixWorld(true); // 'true' forces immediate matrix update



	// In addition to the default GUI on all demos, add any special GUI elements that this particular demo requires
	
	material_TypeObject = {
		Solids_Metal_Type: 'Aluminum'
	};
	
	function handleMaterialTypeChange() 
	{
		changeMaterialType = true;
	}
	
	material_TypeController = gui.add(material_TypeObject, 'Solids_Metal_Type', ['Aluminum', 
		'Gold', 'Copper', 'Silver']).onChange(handleMaterialTypeChange);

	handleMaterialTypeChange();


	// triangle mesh
	total_number_of_triangles = modelMesh.geometry.attributes.position.array.length / 9;
	console.log("Triangle count:" + (total_number_of_triangles));

	totalWork = new Uint32Array(total_number_of_triangles);

	let triangle_b_box_min = new THREE.Vector3();
	let triangle_b_box_max = new THREE.Vector3();
	let triangle_b_box_centroid = new THREE.Vector3();


	let vpa = new Float32Array(modelMesh.geometry.attributes.position.array);
	let vna = new Float32Array(modelMesh.geometry.attributes.normal.array);
	let vta = null;
	let modelHasUVs = false;
	if (modelMesh.geometry.attributes.uv !== undefined)
	{
		vta = new Float32Array(modelMesh.geometry.attributes.uv.array);
		modelHasUVs = true;
	}

	let materialNumber = 0;
	let ix32, ix9;

	for (let i = 0; i < total_number_of_triangles; i++)
	{
		ix32 = i * 32;
		ix9 = i * 9;

		triangle_b_box_min.set(Infinity, Infinity, Infinity);
		triangle_b_box_max.set(-Infinity, -Infinity, -Infinity);

		for (let j = 0; j < pathTracingMaterialList.length; j++)
		{
			if (i < triangleMaterialMarkers[j])
			{
				materialNumber = j;
				break;
			}
		}

		// record vertex texture coordinates (UVs)
		if (modelHasUVs)
		{
			vt0.set(vta[6 * i + 0], vta[6 * i + 1]);
			vt1.set(vta[6 * i + 2], vta[6 * i + 3]);
			vt2.set(vta[6 * i + 4], vta[6 * i + 5]);
		}
		else
		{
			vt0.set(-1, -1);
			vt1.set(-1, -1);
			vt2.set(-1, -1);
		}

		// record vertex normals
		vn0.set(vna[ix9 + 0], vna[ix9 + 1], vna[ix9 + 2]).normalize();
		vn1.set(vna[ix9 + 3], vna[ix9 + 4], vna[ix9 + 5]).normalize();
		vn2.set(vna[ix9 + 6], vna[ix9 + 7], vna[ix9 + 8]).normalize();

		// record vertex positions
		vp0.set(vpa[ix9 + 0], vpa[ix9 + 1], vpa[ix9 + 2]);
		vp1.set(vpa[ix9 + 3], vpa[ix9 + 4], vpa[ix9 + 5]);
		vp2.set(vpa[ix9 + 6], vpa[ix9 + 7], vpa[ix9 + 8]);

		vp0.multiplyScalar(modelScale);
		vp1.multiplyScalar(modelScale);
		vp2.multiplyScalar(modelScale);

		vp0.add(modelPositionOffset);
		vp1.add(modelPositionOffset);
		vp2.add(modelPositionOffset);

		//slot 0
		triangle_array[ix32 + 0] = vp0.x; // r or x
		triangle_array[ix32 + 1] = vp0.y; // g or y 
		triangle_array[ix32 + 2] = vp0.z; // b or z
		triangle_array[ix32 + 3] = vp1.x; // a or w

		//slot 1
		triangle_array[ix32 + 4] = vp1.y; // r or x
		triangle_array[ix32 + 5] = vp1.z; // g or y
		triangle_array[ix32 + 6] = vp2.x; // b or z
		triangle_array[ix32 + 7] = vp2.y; // a or w

		//slot 2
		triangle_array[ix32 + 8] = vp2.z; // r or x
		triangle_array[ix32 + 9] = vn0.x; // g or y
		triangle_array[ix32 + 10] = vn0.y; // b or z
		triangle_array[ix32 + 11] = vn0.z; // a or w

		//slot 3
		triangle_array[ix32 + 12] = vn1.x; // r or x
		triangle_array[ix32 + 13] = vn1.y; // g or y
		triangle_array[ix32 + 14] = vn1.z; // b or z
		triangle_array[ix32 + 15] = vn2.x; // a or w

		//slot 4
		triangle_array[ix32 + 16] = vn2.y; // r or x
		triangle_array[ix32 + 17] = vn2.z; // g or y
		triangle_array[ix32 + 18] = vt0.x; // b or z
		triangle_array[ix32 + 19] = vt0.y; // a or w

		//slot 5
		triangle_array[ix32 + 20] = vt1.x; // r or x
		triangle_array[ix32 + 21] = vt1.y; // g or y
		triangle_array[ix32 + 22] = vt2.x; // b or z
		triangle_array[ix32 + 23] = vt2.y; // a or w

		/* 
		// the remaining slots are used for PBR material properties

		//slot 6
		triangle_array[ix32 + 24] = pathTracingMaterialList[materialNumber].type; // r or x 
		triangle_array[ix32 + 25] = pathTracingMaterialList[materialNumber].color.r; // g or y
		triangle_array[ix32 + 26] = pathTracingMaterialList[materialNumber].color.g; // b or z
		triangle_array[ix32 + 27] = pathTracingMaterialList[materialNumber].color.b; // a or w

		//slot 7
		triangle_array[ix32 + 28] = pathTracingMaterialList[materialNumber].albedoTextureID; // r or x
		triangle_array[ix32 + 29] = 0.0; // g or y
		triangle_array[ix32 + 30] = 0; // b or z
		triangle_array[ix32 + 31] = 0; // a or w
		*/

		triangle_b_box_min.copy(triangle_b_box_min.min(vp0));
		triangle_b_box_max.copy(triangle_b_box_max.max(vp0));
		triangle_b_box_min.copy(triangle_b_box_min.min(vp1));
		triangle_b_box_max.copy(triangle_b_box_max.max(vp1));
		triangle_b_box_min.copy(triangle_b_box_min.min(vp2));
		triangle_b_box_max.copy(triangle_b_box_max.max(vp2));

		triangle_b_box_centroid.copy(triangle_b_box_min).add(triangle_b_box_max).multiplyScalar(0.5);

		aabb_array[ix9 + 0] = triangle_b_box_min.x;
		aabb_array[ix9 + 1] = triangle_b_box_min.y;
		aabb_array[ix9 + 2] = triangle_b_box_min.z;
		aabb_array[ix9 + 3] = triangle_b_box_max.x;
		aabb_array[ix9 + 4] = triangle_b_box_max.y;
		aabb_array[ix9 + 5] = triangle_b_box_max.z;
		aabb_array[ix9 + 6] = triangle_b_box_centroid.x;
		aabb_array[ix9 + 7] = triangle_b_box_centroid.y;
		aabb_array[ix9 + 8] = triangle_b_box_centroid.z;

		totalWork[i] = i;
	}



	console.time("BvhGeneration");
	console.log("BvhGeneration...");

	// Build the BVH acceleration structure, which places a bounding box ('root' of the tree) around all of the
	// triangles of the entire mesh, then subdivides each box into 2 smaller boxes.  It continues until it reaches 1 triangle,
	// which it then designates as a 'leaf'
	BVH_Build_Iterative(totalWork, aabb_array);
	//console.log(buildnodes);

	console.timeEnd("BvhGeneration");


	triangleDataTexture = new THREE.DataTexture(
		triangle_array,
		2048,
		2048,
		THREE.RGBAFormat,
		THREE.FloatType,
		THREE.Texture.DEFAULT_MAPPING,
		THREE.ClampToEdgeWrapping,
		THREE.ClampToEdgeWrapping,
		THREE.NearestFilter,
		THREE.NearestFilter,
		1,
		THREE.NoColorSpace
	);

	triangleDataTexture.flipY = false;
	triangleDataTexture.generateMipmaps = false;
	triangleDataTexture.needsUpdate = true;


	aabbDataTexture = new THREE.DataTexture(
		aabb_array,
		2048,
		2048,
		THREE.RGBAFormat,
		THREE.FloatType,
		THREE.Texture.DEFAULT_MAPPING,
		THREE.ClampToEdgeWrapping,
		THREE.ClampToEdgeWrapping,
		THREE.NearestFilter,
		THREE.NearestFilter,
		1,
		THREE.NoColorSpace
	);

	aabbDataTexture.flipY = false;
	aabbDataTexture.generateMipmaps = false;
	aabbDataTexture.needsUpdate = true;


	// scene/demo-specific uniforms go here
	rayTracingUniforms.uTriangleTexture = { value: triangleDataTexture };
	rayTracingUniforms.uAABBTexture = { value: aabbDataTexture };   
	rayTracingUniforms.uMarbleTexture = { value: marbleTexture };
	rayTracingUniforms.uMaterialType = { value: new THREE.Vector3() };
	rayTracingUniforms.uTetrahedronInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uCubeInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uOctahedronInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uDodecahedronInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uIcosahedronInvMatrix = { value: new THREE.Matrix4() };
	rayTracingUniforms.uTeapotInvMatrix = { value: new THREE.Matrix4() };

	rayTracingUniforms.uTetrahedronInvMatrix.value.copy(tetrahedron.transform.matrixWorld).invert();
	rayTracingUniforms.uCubeInvMatrix.value.copy(cube.transform.matrixWorld).invert();
	rayTracingUniforms.uOctahedronInvMatrix.value.copy(octahedron.transform.matrixWorld).invert();
	rayTracingUniforms.uDodecahedronInvMatrix.value.copy(dodecahedron.transform.matrixWorld).invert();
	rayTracingUniforms.uIcosahedronInvMatrix.value.copy(icosahedron.transform.matrixWorld).invert();
	rayTracingUniforms.uTeapotInvMatrix.value.copy(modelMesh.matrixWorld).invert();

} // end function initSceneData()



// called automatically from within the animate() function (located in InitCommon.js file)
function updateVariablesAndUniforms() 
{   
	if (changeMaterialType) 
	{
		matType = material_TypeController.getValue();

	// rgb values for common metals
	// Gold: (1.000, 0.766, 0.336) / Aluminum: (0.913, 0.921, 0.925) / Copper: (0.955, 0.637, 0.538) / Silver: (0.972, 0.960, 0.915)
		if (matType == 'Aluminum') 
		{ // more of a 'blue-steel' in an attempt to match the original raytraced source image of this demo
			rayTracingUniforms.uMaterialType.value.set(0.9, 0.95, 1.0);
		}
		else if (matType == 'Gold') 
		{
			rayTracingUniforms.uMaterialType.value.set(1.000, 0.766, 0.336);	
		}
		else if (matType == 'Copper') 
		{
			rayTracingUniforms.uMaterialType.value.set(0.955, 0.637, 0.538);	
		}
		else if (matType == 'Silver') 
		{
			rayTracingUniforms.uMaterialType.value.set(0.972, 0.960, 0.915);
		}
			
		cameraIsMoving = true;
		changeMaterialType = false;
	}


	// INFO
	cameraInfoElement.innerHTML = "FOV: " + worldCamera.fov + " / Aperture: " + apertureSize.toFixed(2) + 
		" / FocusDistance: " + focusDistance.toFixed(2) + "<br>" + "Samples: " + sampleCounter;

} // end function updateVariablesAndUniforms()


marbleTexture = textureLoader.load(
	// resource URL
	'textures/marble0.png',

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
		// if all textures have been loaded, we can load the model
		if (numOfImageTexturesLoaded == imageTexturesTotalCount)
			load_GLTF_Model(); // load model, init app, and start animating
	}
);
