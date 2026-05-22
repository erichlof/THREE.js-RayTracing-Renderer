// scene/demo-specific variables go here
let marbleTexture;
let imageTexturesTotalCount = 1;
let numOfImageTexturesLoaded = 0;

let material_TypeObject;
let material_TypeController;
let changeMaterialType = false;
let matType = 0;

let tetrahedron, cube, octahedron, dodecahedron, icosahedron;
let ix32 = 0; // used in loop
let ix9 = 0; // used in loop
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
let aabbIndexList;
let triangle_array = new Float32Array(2048 * 2048 * 4);
// 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components
let aabb_array = new Float32Array(2048 * 2048 * 4);
// 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components
let triangleMaterialMarkers = [];
let pathTracingMaterialList = [];

// quadric shapes models
let invMatrix = new THREE.Matrix4();
let el; // elements of the invMatrix
let shapes_array = new Float32Array(2048 * 2048 * 4);
let shapesDataTexture;
let shapes_aabb_array = new Float32Array(2048 * 2048 * 4);
let shapes_aabbDataTexture;
let aabbShapesIndexList;
let shapeBoundingBox_minCorner = new THREE.Vector3();
let shapeBoundingBox_maxCorner = new THREE.Vector3();
let shapeBoundingBox_centroid = new THREE.Vector3();
let boundingBoxMaterial = new THREE.MeshBasicMaterial();
let boundingBoxMeshes = [];
let boundingBoxGeometries = [];
let sceneShapes = [];
let frontCenterPillarBottom, frontCenterPillarTop;
let frontLeftPillarBottom, frontLeftPillarTop;
let frontRightPillarBottom, frontRightPillarTop;
let backCenterPillarBottom, backCenterPillarTop;
let backLeftPillarBottom, backLeftPillarTop;
let backRightPillarBottom, backRightPillarTop;
let frontCenterCylinderPos = new THREE.Vector3(0, 3.75, 0);
let frontLeftCylinderPos = new THREE.Vector3(-5.5, 3.75, 0);
let frontRightCylinderPos = new THREE.Vector3(5.5, 3.75, 0);
let backCenterCylinderPos = new THREE.Vector3(0, 5,-6);
let backLeftCylinderPos = new THREE.Vector3(-5.5, 4.5,-6);
let backRightCylinderPos = new THREE.Vector3(5.5, 4.5,-6);


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
	pixelRatio = mouseControl ? 1.0 : 0.75;
	
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

	aabbIndexList = new Uint32Array(total_number_of_triangles);

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

		// use the following for leaves that contain triangles (the default case for all glTF meshes)
		triangle_b_box_centroid.copy(vp0).add(vp1).add(vp2).multiplyScalar(0.3333333333333333);
		// or use the following for leaves that contain complete quadric shapes like spheres, cylinders, boxes, etc.
		//triangle_b_box_centroid.copy(triangle_b_box_min).add(triangle_b_box_max).multiplyScalar(0.5);

		aabb_array[ix9 + 0] = triangle_b_box_min.x;
		aabb_array[ix9 + 1] = triangle_b_box_min.y;
		aabb_array[ix9 + 2] = triangle_b_box_min.z;
		aabb_array[ix9 + 3] = triangle_b_box_max.x;
		aabb_array[ix9 + 4] = triangle_b_box_max.y;
		aabb_array[ix9 + 5] = triangle_b_box_max.z;
		aabb_array[ix9 + 6] = triangle_b_box_centroid.x;
		aabb_array[ix9 + 7] = triangle_b_box_centroid.y;
		aabb_array[ix9 + 8] = triangle_b_box_centroid.z;

		aabbIndexList[i] = i;
	}


	// the higher the number of BINS, the better quality of resulting BVH tree, but also increases build time
	N_BINS = 1024;

	BVH_QuickBuild(aabbIndexList, aabb_array);
	


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



	frontCenterPillarBottom = new RayTracingShape("box");
	frontCenterPillarBottom.uvwScale.set(1, 1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	frontCenterPillarBottom.transform.scale.set(1.9, 0.5, 1.9);
	frontCenterPillarBottom.transform.position.set(0, 0.5, 0);
	frontCenterPillarBottom.transform.rotation.set(0, 0, 0);
	sceneShapes.push(frontCenterPillarBottom);

	frontLeftPillarBottom = new RayTracingShape("box");
	frontLeftPillarBottom.uvwScale.set(1,-1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	frontLeftPillarBottom.transform.scale.set(1.9, 0.5, 1.9);
	frontLeftPillarBottom.transform.position.set(-5.5, 0.5, 0);
	frontLeftPillarBottom.transform.rotation.set(0, 0, 0);
	sceneShapes.push(frontLeftPillarBottom);

	frontRightPillarBottom = new RayTracingShape("box");
	frontRightPillarBottom.uvwScale.set(-1, -1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	frontRightPillarBottom.transform.scale.set(1.9, 0.5, 1.9);
	frontRightPillarBottom.transform.position.set(5.5, 0.5, 0);
	frontRightPillarBottom.transform.rotation.set(0, 0, 0);
	sceneShapes.push(frontRightPillarBottom);

	frontCenterPillarTop = new RayTracingShape("box");
	frontCenterPillarTop.uvwScale.set(-1, 1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	frontCenterPillarTop.transform.scale.set(1.9, 0.25, 1.9);
	frontCenterPillarTop.transform.position.set(0, 6.75, 0);
	frontCenterPillarTop.transform.rotation.set(0, 0, 0);
	sceneShapes.push(frontCenterPillarTop);

	frontLeftPillarTop = new RayTracingShape("box");
	frontLeftPillarTop.uvwScale.set(1, 1, -1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	frontLeftPillarTop.transform.scale.set(1.9, 0.25, 1.9);
	frontLeftPillarTop.transform.position.set(-5.5, 6.75, 0);
	frontLeftPillarTop.transform.rotation.set(0, 0, 0);
	sceneShapes.push(frontLeftPillarTop);

	frontRightPillarTop = new RayTracingShape("box");
	frontRightPillarTop.uvwScale.set(1, -1, -1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	frontRightPillarTop.transform.scale.set(1.9, 0.25, 1.9);
	frontRightPillarTop.transform.position.set(5.5, 6.75, 0);
	frontRightPillarTop.transform.rotation.set(0, 0, 0);
	sceneShapes.push(frontRightPillarTop);



	backCenterPillarBottom = new RayTracingShape("box");
	backCenterPillarBottom.uvwScale.set(1, 1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	backCenterPillarBottom.transform.scale.set(1.9, 0.5, 1.9);
	backCenterPillarBottom.transform.position.set(0, 0.5, -6);
	backCenterPillarBottom.transform.rotation.set(0, 0, 0);
	sceneShapes.push(backCenterPillarBottom);

	backLeftPillarBottom = new RayTracingShape("box");
	backLeftPillarBottom.uvwScale.set(1,-1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	backLeftPillarBottom.transform.scale.set(1.9, 0.5, 1.9);
	backLeftPillarBottom.transform.position.set(-5.5, 0.5, -6);
	backLeftPillarBottom.transform.rotation.set(0, 0, 0);
	sceneShapes.push(backLeftPillarBottom);

	backRightPillarBottom = new RayTracingShape("box");
	backRightPillarBottom.uvwScale.set(-1, -1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	backRightPillarBottom.transform.scale.set(1.9, 0.5, 1.9);
	backRightPillarBottom.transform.position.set(5.5, 0.5, -6);
	backRightPillarBottom.transform.rotation.set(0, 0, 0);
	sceneShapes.push(backRightPillarBottom);

	backCenterPillarTop = new RayTracingShape("box");
	backCenterPillarTop.uvwScale.set(-1, 1, 1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	backCenterPillarTop.transform.scale.set(1.9, 0.25, 1.9);
	backCenterPillarTop.transform.position.set(0, 9.25, -6);
	backCenterPillarTop.transform.rotation.set(0, 0, 0);
	sceneShapes.push(backCenterPillarTop);

	backLeftPillarTop = new RayTracingShape("box");
	backLeftPillarTop.uvwScale.set(1, 1, -1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	backLeftPillarTop.transform.scale.set(1.9, 0.25, 1.9);
	backLeftPillarTop.transform.position.set(-5.5, 9.25, -6);
	backLeftPillarTop.transform.rotation.set(0, 0, 0);
	sceneShapes.push(backLeftPillarTop);

	backRightPillarTop = new RayTracingShape("box");
	backRightPillarTop.uvwScale.set(1, -1, -1); // if checkered or using a texture, how many times should the uvw's repeat in the X axis / Y axis / Z axis?
	backRightPillarTop.transform.scale.set(1.9, 0.25, 1.9);
	backRightPillarTop.transform.position.set(5.5, 9.25, -6);
	backRightPillarTop.transform.rotation.set(0, 0, 0);
	sceneShapes.push(backRightPillarTop);

	
	let positionAroundPillar = new THREE.Vector3();

	let frontCenterPillarCylinders = [];

	for (let i = 0, angle = 0; i < 36; i++, angle += ((Math.PI * 2) / 36))
	{
		frontCenterPillarCylinders[i] = new RayTracingShape("cylinder");
		frontCenterPillarCylinders[i].transform.scale.set(0.164, 2.75, 0.164);
		positionAroundPillar.set(Math.cos(angle) * (1.9 - 0.328), 0, Math.sin(angle) * (1.9 - 0.328));
		positionAroundPillar.add(frontCenterCylinderPos);
		frontCenterPillarCylinders[i].transform.position.copy(positionAroundPillar);
		sceneShapes.push(frontCenterPillarCylinders[i]);
	}

	let frontLeftPillarCylinders = [];

	for (let i = 0, angle = 0; i < 36; i++, angle += ((Math.PI * 2) / 36))
	{
		frontLeftPillarCylinders[i] = new RayTracingShape("cylinder");
		frontLeftPillarCylinders[i].transform.scale.set(0.164, 2.75, 0.164);
		positionAroundPillar.set(Math.cos(angle) * (1.9 - 0.328), 0, Math.sin(angle) * (1.9 - 0.328));
		positionAroundPillar.add(frontLeftCylinderPos);
		frontLeftPillarCylinders[i].transform.position.copy(positionAroundPillar);
		sceneShapes.push(frontLeftPillarCylinders[i]);
	}
	
	let frontRightPillarCylinders = [];

	for (let i = 0, angle = 0; i < 36; i++, angle += ((Math.PI * 2) / 36))
	{
		frontRightPillarCylinders[i] = new RayTracingShape("cylinder");
		frontRightPillarCylinders[i].transform.scale.set(0.164, 2.75, 0.164);
		positionAroundPillar.set(Math.cos(angle) * (1.9 - 0.328), 0, Math.sin(angle) * (1.9 - 0.328));
		positionAroundPillar.add(frontRightCylinderPos);
		frontRightPillarCylinders[i].transform.position.copy(positionAroundPillar);
		sceneShapes.push(frontRightPillarCylinders[i]);
	}

	let backCenterPillarCylinders = [];

	for (let i = 0, angle = 0; i < 36; i++, angle += ((Math.PI * 2) / 36))
	{
		backCenterPillarCylinders[i] = new RayTracingShape("cylinder");
		backCenterPillarCylinders[i].transform.scale.set(0.164, 4, 0.164);
		positionAroundPillar.set(Math.cos(angle) * (1.9 - 0.328), 0, Math.sin(angle) * (1.9 - 0.328));
		positionAroundPillar.add(backCenterCylinderPos);
		backCenterPillarCylinders[i].transform.position.copy(positionAroundPillar);
		sceneShapes.push(backCenterPillarCylinders[i]);
	}

	let backLeftPillarCylinders = [];

	for (let i = 0, angle = 0; i < 36; i++, angle += ((Math.PI * 2) / 36))
	{
		backLeftPillarCylinders[i] = new RayTracingShape("cylinder");
		backLeftPillarCylinders[i].transform.scale.set(0.164, 4, 0.164);
		positionAroundPillar.set(Math.cos(angle) * (1.9 - 0.328), 0, Math.sin(angle) * (1.9 - 0.328));
		positionAroundPillar.add(backLeftCylinderPos);
		backLeftPillarCylinders[i].transform.position.copy(positionAroundPillar);
		sceneShapes.push(backLeftPillarCylinders[i]);
	}
	
	let backRightPillarCylinders = [];

	for (let i = 0, angle = 0; i < 36; i++, angle += ((Math.PI * 2) / 36))
	{
		backRightPillarCylinders[i] = new RayTracingShape("cylinder");
		backRightPillarCylinders[i].transform.scale.set(0.164, 4, 0.164);
		positionAroundPillar.set(Math.cos(angle) * (1.9 - 0.328), 0, Math.sin(angle) * (1.9 - 0.328));
		positionAroundPillar.add(backRightCylinderPos);
		backRightPillarCylinders[i].transform.position.copy(positionAroundPillar);
		sceneShapes.push(backRightPillarCylinders[i]);
	}
	

	console.log("Shape count: " + sceneShapes.length);


	aabbShapesIndexList = new Uint32Array(sceneShapes.length);


	for (let i = 0; i < sceneShapes.length; i++) 
	{
		ix32 = i * 32;
		ix9 = i * 9;

		sceneShapes[i].transform.updateMatrixWorld(true); // 'true' forces immediate matrix update
		invMatrix.copy(sceneShapes[i].transform.matrixWorld).invert();
		el = invMatrix.elements;

		//slot 0                       Shape transform Matrix 4x4 (16 elements total)
		shapes_array[ix32 + 0] = el[0]; // r or x // shape transform Matrix element[0]
		shapes_array[ix32 + 1] = el[1]; // g or y // shape transform Matrix element[1] 
		shapes_array[ix32 + 2] = el[2]; // b or z // shape transform Matrix element[2]
		shapes_array[ix32 + 3] = el[3]; // a or w // shape transform Matrix element[3]

		//slot 1
		shapes_array[ix32 + 4] = el[4]; // r or x // shape transform Matrix element[4]
		shapes_array[ix32 + 5] = el[5]; // g or y // shape transform Matrix element[5]
		shapes_array[ix32 + 6] = el[6]; // b or z // shape transform Matrix element[6]
		shapes_array[ix32 + 7] = el[7]; // a or w // shape transform Matrix element[7]

		//slot 2
		shapes_array[ix32 + 8] = el[8]; // r or x // shape transform Matrix element[8]
		shapes_array[ix32 + 9] = el[9]; // g or y // shape transform Matrix element[9]
		shapes_array[ix32 + 10] = el[10]; // b or z // shape transform Matrix element[10]
		shapes_array[ix32 + 11] = el[11]; // a or w // shape transform Matrix element[11]

		//slot 3
		shapes_array[ix32 + 12] = el[12]; // r or x // shape transform Matrix element[12]
		shapes_array[ix32 + 13] = el[13]; // g or y // shape transform Matrix element[13]
		shapes_array[ix32 + 14] = el[14]; // b or z // shape transform Matrix element[14]
		shapes_array[ix32 + 15] = el[15]; // a or w // shape transform Matrix element[15]

		//slot 4
		if (sceneShapes[i].type == "box")
			shapes_array[ix32 + 16] = 0; // r or x // shape type id#  (0: box, 1: sphere, 2: cylinder, 3: cone, 4: paraboloid, etc)
		else if (sceneShapes[i].type == "sphere")
			shapes_array[ix32 + 16] = 1; // r or x // shape type id#  (0: box, 1: sphere, 2: cylinder, 3: cone, 4: paraboloid, etc)
		else if (sceneShapes[i].type == "cylinder")
			shapes_array[ix32 + 16] = 2; // r or x // shape type id#  (0: box, 1: sphere, 2: cylinder, 3: cone, 4: paraboloid, etc)
		
		// default = 1 = Diffuse material
		shapes_array[ix32 + 17] = 1; // g or y // material type id# (0: LIGHT, 1: DIFF, 2: REFR, 3: SPEC, 4: COAT, etc)
		if (sceneShapes[i].material.metalness > 0.0)
			shapes_array[ix32 + 17] = 3; // g or y // material type id# (0: LIGHT, 1: DIFF, 2: REFR, 3: SPEC, 4: COAT, etc)
		if (sceneShapes[i].material.clearcoat > 0.0)
			shapes_array[ix32 + 17] = 4; // g or y // material type id# (0: LIGHT, 1: DIFF, 2: REFR, 3: SPEC, 4: COAT, etc)
		if (sceneShapes[i].material.opacity < 1.0)
			shapes_array[ix32 + 17] = 2; // g or y // material type id# (0: LIGHT, 1: DIFF, 2: REFR, 3: SPEC, 4: COAT, etc)
		shapes_array[ix32 + 18] = sceneShapes[i].material.metalness; // b or z // material Metalness
		shapes_array[ix32 + 19] = sceneShapes[i].material.roughness; // a or w // material Roughness

		//slot 5
		shapes_array[ix32 + 20] = sceneShapes[i].material.color.r; // r or x // material albedo color R (if LIGHT, this is also its emissive color R)
		shapes_array[ix32 + 21] = sceneShapes[i].material.color.g; // g or y // material albedo color G (if LIGHT, this is also its emissive color G)
		shapes_array[ix32 + 22] = sceneShapes[i].material.color.b; // b or z // material albedo color B (if LIGHT, this is also its emissive color B)
		shapes_array[ix32 + 23] = sceneShapes[i].material.opacity; // a or w // material Opacity (Alpha)

		//slot 6
		shapes_array[ix32 + 24] = sceneShapes[i].material.ior; // r or x // material Index of Refraction(IoR)
		shapes_array[ix32 + 25] = sceneShapes[i].material.clearcoat; // g or y // material ClearCoat Amount
		shapes_array[ix32 + 26] = sceneShapes[i].material.clearcoatRoughness; // b or z // material ClearCoat Roughness (0.0-1.0, default: 0.0)
		shapes_array[ix32 + 27] = sceneShapes[i].textureID; // integer number of texture to use / default is -1 (no texture)

		//slot 7
		shapes_array[ix32 + 28] = sceneShapes[i].uvwScale.x; // r or x // 3D uvw scale, u component
		shapes_array[ix32 + 29] = sceneShapes[i].uvwScale.y; // g or y // 3D uvw scale, v component
		shapes_array[ix32 + 30] = sceneShapes[i].uvwScale.z; // b or z // 3D uvw scale, w component
		shapes_array[ix32 + 31] = 0; // a or w // material data (unused)


		boundingBoxGeometries[i] = new THREE.BoxGeometry(2, 2, 2); // Box with Unit Radius of 1, so a Diameter(length) of 2 in each dimension / min:(-1,-1,-1), max(+1,+1,+1)
		boundingBoxMeshes[i] = new THREE.Mesh(boundingBoxGeometries[i], boundingBoxMaterial);

		boundingBoxMeshes[i].geometry.applyMatrix4(sceneShapes[i].transform.matrixWorld);
		boundingBoxMeshes[i].geometry.computeBoundingBox();

		shapeBoundingBox_minCorner.copy(boundingBoxMeshes[i].geometry.boundingBox.min);
		shapeBoundingBox_maxCorner.copy(boundingBoxMeshes[i].geometry.boundingBox.max);
		boundingBoxMeshes[i].geometry.boundingBox.getCenter(shapeBoundingBox_centroid);


		shapes_aabb_array[ix9 + 0] = shapeBoundingBox_minCorner.x;
		shapes_aabb_array[ix9 + 1] = shapeBoundingBox_minCorner.y;
		shapes_aabb_array[ix9 + 2] = shapeBoundingBox_minCorner.z;
		shapes_aabb_array[ix9 + 3] = shapeBoundingBox_maxCorner.x;
		shapes_aabb_array[ix9 + 4] = shapeBoundingBox_maxCorner.y;
		shapes_aabb_array[ix9 + 5] = shapeBoundingBox_maxCorner.z;
		shapes_aabb_array[ix9 + 6] = shapeBoundingBox_centroid.x;
		shapes_aabb_array[ix9 + 7] = shapeBoundingBox_centroid.y;
		shapes_aabb_array[ix9 + 8] = shapeBoundingBox_centroid.z;

		aabbShapesIndexList[i] = i;
	} // end for (let i = 0; i < sceneShapes.length; i++)


	// the higher the number of BINS, the better quality of resulting BVH tree, but also increases build time
	N_BINS = 1024;
	
	BVH_QuickBuild(aabbShapesIndexList, shapes_aabb_array);


	shapesDataTexture = new THREE.DataTexture(shapes_array,
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
		THREE.NoColorSpace);

	shapesDataTexture.flipY = false;
	shapesDataTexture.generateMipmaps = false;
	shapesDataTexture.needsUpdate = true;

	shapes_aabbDataTexture = new THREE.DataTexture(shapes_aabb_array,
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
		THREE.NoColorSpace);

	shapes_aabbDataTexture.flipY = false;
	shapes_aabbDataTexture.generateMipmaps = false;
	shapes_aabbDataTexture.needsUpdate = true;


	// scene/demo-specific uniforms go here
	rayTracingUniforms.uTriangleTexture = { value: triangleDataTexture };
	rayTracingUniforms.uAABBTexture = { value: aabbDataTexture };
	rayTracingUniforms.uShapes_DataTexture = { value: shapesDataTexture };
	rayTracingUniforms.uShapes_AABB_DataTexture = { value: shapes_aabbDataTexture };
	rayTracingUniforms.uMarbleTexture = { value: marbleTexture };
	rayTracingUniforms.uMaterialColor = { value: new THREE.Color() };
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
			rayTracingUniforms.uMaterialColor.value.setRGB(0.9, 0.95, 1.0);
		}
		else if (matType == 'Gold') 
		{
			rayTracingUniforms.uMaterialColor.value.setRGB(1.000, 0.766, 0.336);	
		}
		else if (matType == 'Copper') 
		{
			rayTracingUniforms.uMaterialColor.value.setRGB(0.955, 0.637, 0.538);	
		}
		else if (matType == 'Silver') 
		{
			rayTracingUniforms.uMaterialColor.value.setRGB(0.972, 0.960, 0.915);
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
