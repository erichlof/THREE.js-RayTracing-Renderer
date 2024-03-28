precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform sampler2D uMarbleTexture;
uniform sampler2D uTriangleTexture;
uniform sampler2D uAABBTexture;
uniform mat4 uTetrahedronInvMatrix;
uniform mat4 uCubeInvMatrix;
uniform mat4 uOctahedronInvMatrix;
uniform mat4 uDodecahedronInvMatrix;
uniform mat4 uIcosahedronInvMatrix;
uniform mat4 uTeapotInvMatrix;
uniform vec3 uMaterialColor;

//float InvTextureWidth = 0.000244140625; // (1 / 4096 texture width)
//float InvTextureWidth = 0.00048828125;  // (1 / 2048 texture width)
//float InvTextureWidth = 0.0009765625;   // (1 / 1024 texture width)

#define INV_TEXTURE_WIDTH 0.00048828125

#define N_RECTANGLES 1
#define N_BOXES 12
#define N_CYLINDERS 18


vec3 rayOrigin, rayDirection;
// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;
int intersectionShapeIsClosed;

struct Material { int type; int isCheckered; vec3 color; vec3 color2; float metalness; float roughness; float IoR; int textureID; };
struct Rectangle { vec3 position; vec3 normal; vec3 vectorU; vec3 vectorV; float radiusU; float radiusV; vec2 uvScale; Material material; };
struct Box { vec3 minCorner; vec3 maxCorner; vec2 uvScale; Material material; };
struct Cylinder { float widthRadius; float heightRadius; vec3 position; vec2 uvScale; Material material; };

Material intersectionMaterial;
Rectangle rectangles[N_RECTANGLES];
Box boxes[N_BOXES];
Cylinder cylinders[N_CYLINDERS];


#include <raytracing_core_functions>

#include <raytracing_rectangle_intersect>

#include <raytracing_box_intersect>

#include <raytracing_cylinder_intersect>

#include <raytracing_convexpolyhedron_intersect>

#include <raytracing_boundingbox_intersect>

#include <raytracing_bvhTriangle_intersect>


vec4 tetrahedron_planes[4];
vec4 octahedron_planes[8];
vec4 dodecahedron_planes[12];
vec4 icosahedron_planes[20];
vec4 planes[20];

vec2 stackLevels[28];

//vec4 boxNodeData0 corresponds to .x = idTriangle,  .y = aabbMin.x, .z = aabbMin.y, .w = aabbMin.z
//vec4 boxNodeData1 corresponds to .x = idRightChild .y = aabbMax.x, .z = aabbMax.y, .w = aabbMax.z

void GetBoxNodeData(const in float i, inout vec4 boxNodeData0, inout vec4 boxNodeData1)
{
	// each bounding box's data is encoded in 2 rgba(or xyzw) texture slots 
	float ix2 = i * 2.0;
	// (ix2 + 0.0) corresponds to .x = idTriangle,  .y = aabbMin.x, .z = aabbMin.y, .w = aabbMin.z 
	// (ix2 + 1.0) corresponds to .x = idRightChild .y = aabbMax.x, .z = aabbMax.y, .w = aabbMax.z 

	ivec2 uv0 = ivec2( mod(ix2 + 0.0, 2048.0), (ix2 + 0.0) * INV_TEXTURE_WIDTH ); // data0
	ivec2 uv1 = ivec2( mod(ix2 + 1.0, 2048.0), (ix2 + 1.0) * INV_TEXTURE_WIDTH ); // data1
	
	boxNodeData0 = texelFetch(uAABBTexture, uv0, 0);
	boxNodeData1 = texelFetch(uAABBTexture, uv1, 0);
}


//---------------------------------------------------------------------------------------
float SceneIntersect( int isShadowRay )
//---------------------------------------------------------------------------------------
{
	
	Material diffuseMetalMaterial = Material(METAL, FALSE, uMaterialColor * 0.42, vec3(1.000, 0.766, 0.336), 1.0, 0.0, 0.0, -1);

	vec4 currentBoxNodeData0, nodeAData0, nodeBData0, tmpNodeData0;
	vec4 currentBoxNodeData1, nodeAData1, nodeBData1, tmpNodeData1;
	vec4 vd0, vd1, vd2, vd3, vd4, vd5, vd6, vd7;
	vec4 sd0, sd1, sd2, sd3, sd4, sd5, sd6, sd7;

	vec3 rObjOrigin, rObjDirection; 
	vec3 intersectionPoint, normal;
	vec3 inverseDir;
	vec3 normalizedVec, smallCylinderPos;

	vec2 currentStackData, stackDataA, stackDataB, tmpStackData;
	ivec2 uv0, uv1, uv2, uv3, uv4, uv5, uv6, uv7;

        float d;
	float t = INFINITY;
	float u, v;
	float stackptr = 0.0;
	float id = 0.0;
	float tu, tv;
	float triangleID = 0.0;
	float triangleU = 0.0;
	float triangleV = 0.0;
	float triangleW = 0.0;
	float thetaPlusOne, thetaMinusOne, phiPlusOne, phiMinusOne;
	float thetaScale = 1.0;
	float phiScale = 6.5;
	float oneOver_thetaScale = 1.0 / thetaScale;
	float oneOver_phiScale = 1.0 / phiScale;
	float bumpCylinderWidthRadius = 0.164;
	float bumpCylinderHeightRadius;
	float theta, phi;

	int isRayExiting = FALSE;
	int skip = FALSE;
	int triangleLookupNeeded = FALSE;

	/* 
	// When shadow rays are trying to intersect a small point light source, a tiny box makes a better shape to try and hit
	// than a tiny sphere (due to floating-point precision error, some rays will hit while others will miss the small sphere from far away).  
	// Viewers will still see a tiny sphere representing the point light, but shadow rays will instead "see" a tiny box in the same spot.
	if (isShadowRay == TRUE)
	{
		d = BoxIntersect( boxes[0].minCorner, boxes[0].maxCorner, rayOrigin, rayDirection, normal, isRayExiting );
		if (d < t)
		{
			t = d;
			//intersectionNormal = normal;
			intersectionMaterial = boxes[0].material;
		}
	} */


	// UTAH TEAPOT

	// transform ray into teapot's object space
	rObjOrigin = vec3( uTeapotInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uTeapotInvMatrix * vec4(rayDirection, 0.0) );
	inverseDir = 1.0 / rObjDirection;

	GetBoxNodeData(stackptr, currentBoxNodeData0, currentBoxNodeData1);
	currentStackData = vec2(stackptr, BoundingBoxIntersect(currentBoxNodeData0.yzw, currentBoxNodeData1.yzw, rObjOrigin, inverseDir));
	stackLevels[0] = currentStackData;
	skip = (currentStackData.y < t) ? TRUE : FALSE;

	while (true)
        {
		if (skip == FALSE) 
                {
                        // decrease pointer by 1 (0.0 is root level, 27.0 is maximum depth)
                        if (--stackptr < 0.0) // went past the root level, terminate loop
                                break;

                        currentStackData = stackLevels[int(stackptr)];
			
			if (currentStackData.y >= t)
				continue;
			
			GetBoxNodeData(currentStackData.x, currentBoxNodeData0, currentBoxNodeData1);
                }
		skip = FALSE; // reset skip
		

		if (currentBoxNodeData0.x < 0.0) // < 0.0 signifies an inner node
		{
			GetBoxNodeData(currentStackData.x + 1.0, nodeAData0, nodeAData1);
			GetBoxNodeData(currentBoxNodeData1.x, nodeBData0, nodeBData1);
			stackDataA = vec2(currentStackData.x + 1.0, BoundingBoxIntersect(nodeAData0.yzw, nodeAData1.yzw, rObjOrigin, inverseDir));
			stackDataB = vec2(currentBoxNodeData1.x, BoundingBoxIntersect(nodeBData0.yzw, nodeBData1.yzw, rObjOrigin, inverseDir));
			
			// first sort the branch node data so that 'a' is the smallest
			if (stackDataB.y < stackDataA.y)
			{
				tmpStackData = stackDataB;
				stackDataB = stackDataA;
				stackDataA = tmpStackData;

				tmpNodeData0 = nodeBData0;   tmpNodeData1 = nodeBData1;
				nodeBData0   = nodeAData0;   nodeBData1   = nodeAData1;
				nodeAData0   = tmpNodeData0; nodeAData1   = tmpNodeData1;
			} // branch 'b' now has the larger rayT value of 'a' and 'b'

			if (stackDataB.y < t) // see if branch 'b' (the larger rayT) needs to be processed
			{
				currentStackData = stackDataB;
				currentBoxNodeData0 = nodeBData0;
				currentBoxNodeData1 = nodeBData1;
				skip = TRUE; // this will prevent the stackptr from decreasing by 1
			}
			if (stackDataA.y < t) // see if branch 'a' (the smaller rayT) needs to be processed 
			{
				if (skip == TRUE) // if larger branch 'b' needed to be processed also,
					stackLevels[int(stackptr++)] = stackDataB; // cue larger branch 'b' for future round
							// also, increase pointer by 1
				
				currentStackData = stackDataA;
				currentBoxNodeData0 = nodeAData0; 
				currentBoxNodeData1 = nodeAData1;
				skip = TRUE; // this will prevent the stackptr from decreasing by 1
			}

			continue;
		} // end if (currentBoxNodeData0.x < 0.0) // inner node


		// else this is a leaf

		// each triangle's data is encoded in 8 rgba(or xyzw) texture slots
		id = 8.0 * currentBoxNodeData0.x;

		uv0 = ivec2( mod(id + 0.0, 2048.0), (id + 0.0) * INV_TEXTURE_WIDTH );
		uv1 = ivec2( mod(id + 1.0, 2048.0), (id + 1.0) * INV_TEXTURE_WIDTH );
		uv2 = ivec2( mod(id + 2.0, 2048.0), (id + 2.0) * INV_TEXTURE_WIDTH );
		
		vd0 = texelFetch(uTriangleTexture, uv0, 0);
		vd1 = texelFetch(uTriangleTexture, uv1, 0);
		vd2 = texelFetch(uTriangleTexture, uv2, 0);

		d = BVH_TriangleIntersect( vec3(vd0.xyz), vec3(vd0.w, vd1.xy), vec3(vd1.zw, vd2.x), rObjOrigin, rObjDirection, tu, tv );

		if (d < t)
		{
			t = d;
			triangleID = id;
			triangleU = tu;
			triangleV = tv;
			triangleLookupNeeded = TRUE;
		}
	      
        } // end while (TRUE)


	if (triangleLookupNeeded == TRUE)
	{
		uv0 = ivec2( mod(triangleID + 0.0, 2048.0), (triangleID + 0.0) * INV_TEXTURE_WIDTH );
		uv1 = ivec2( mod(triangleID + 1.0, 2048.0), (triangleID + 1.0) * INV_TEXTURE_WIDTH );
		uv2 = ivec2( mod(triangleID + 2.0, 2048.0), (triangleID + 2.0) * INV_TEXTURE_WIDTH );
		uv3 = ivec2( mod(triangleID + 3.0, 2048.0), (triangleID + 3.0) * INV_TEXTURE_WIDTH );
		uv4 = ivec2( mod(triangleID + 4.0, 2048.0), (triangleID + 4.0) * INV_TEXTURE_WIDTH );
		uv5 = ivec2( mod(triangleID + 5.0, 2048.0), (triangleID + 5.0) * INV_TEXTURE_WIDTH );
		uv6 = ivec2( mod(triangleID + 6.0, 2048.0), (triangleID + 6.0) * INV_TEXTURE_WIDTH );
		uv7 = ivec2( mod(triangleID + 7.0, 2048.0), (triangleID + 7.0) * INV_TEXTURE_WIDTH );
		
		vd0 = texelFetch(uTriangleTexture, uv0, 0);
		vd1 = texelFetch(uTriangleTexture, uv1, 0);
		vd2 = texelFetch(uTriangleTexture, uv2, 0);
		vd3 = texelFetch(uTriangleTexture, uv3, 0);
		vd4 = texelFetch(uTriangleTexture, uv4, 0);
		vd5 = texelFetch(uTriangleTexture, uv5, 0);
		vd6 = texelFetch(uTriangleTexture, uv6, 0);
		vd7 = texelFetch(uTriangleTexture, uv7, 0);
	
		// interpolated normal using triangle intersection's uv's
		triangleW = 1.0 - triangleU - triangleV;
		//normal = (triangleW * vec3(vd2.yzw) + triangleU * vec3(vd3.xyz) + triangleV * vec3(vd3.w, vd4.xy));
		// or, triangle face normal for flat-shaded, low-poly look
		normal = ( cross(vec3(vd0.w, vd1.xy) - vec3(vd0.xyz), vec3(vd1.zw, vd2.x) - vec3(vd0.xyz)) );
		intersectionNormal = transpose(mat3(uTeapotInvMatrix)) * normal;
		intersectionUV = (triangleW * vec2(vd4.zw)) + (triangleU * vec2(vd5.xy)) + (triangleV * vec2(vd5.zw));
		intersectionMaterial = diffuseMetalMaterial;

	} // end if (triangleLookupNeeded == TRUE)




	// TETRAHEDRON - 4 faces
	// transform ray into tetrahedron's object space
	rObjOrigin = vec3( uTetrahedronInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uTetrahedronInvMatrix * vec4(rayDirection, 0.0) );

	planes[0] = tetrahedron_planes[0];
	planes[1] = tetrahedron_planes[1];
	planes[2] = tetrahedron_planes[2];
	planes[3] = tetrahedron_planes[3];
	
	d = ConvexPolyhedronIntersect( rObjOrigin, rObjDirection, normal, 4, planes );
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uTetrahedronInvMatrix)) * normal;
		intersectionMaterial = diffuseMetalMaterial;
		intersectionShapeIsClosed = TRUE;
	}

	// CUBE - 6 faces - I chose to use the usual 'BoxIntersect' routine here, rather than the 'ConvexPolyhedronIntersect' with 6 planes
	// transform ray into cube's object space
	rObjOrigin = vec3( uCubeInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCubeInvMatrix * vec4(rayDirection, 0.0) );
	d = BoxIntersect(vec3(-1), vec3(1), rObjOrigin, rObjDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uCubeInvMatrix)) * normal;
		intersectionMaterial = diffuseMetalMaterial;
		intersectionShapeIsClosed = TRUE;
	}

	// OCTAHEDRON - 8 faces
	// transform ray into octahedron's object space
	rObjOrigin = vec3( uOctahedronInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uOctahedronInvMatrix * vec4(rayDirection, 0.0) );

	planes[0] = octahedron_planes[0];
	planes[1] = octahedron_planes[1];
	planes[2] = octahedron_planes[2];
	planes[3] = octahedron_planes[3];
	planes[4] = octahedron_planes[4];
	planes[5] = octahedron_planes[5];
	planes[6] = octahedron_planes[6];
	planes[7] = octahedron_planes[7];
	
	d = ConvexPolyhedronIntersect( rObjOrigin, rObjDirection, normal, 8, planes );
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uOctahedronInvMatrix)) * normal;
		intersectionMaterial = diffuseMetalMaterial;
		intersectionShapeIsClosed = TRUE;
	}

	// DODECAHEDRON - 12 faces
	// transform ray into dodecahedron's object space
	rObjOrigin = vec3( uDodecahedronInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uDodecahedronInvMatrix * vec4(rayDirection, 0.0) );

	planes[0] = dodecahedron_planes[0];
	planes[1] = dodecahedron_planes[1];
	planes[2] = dodecahedron_planes[2];
	planes[3] = dodecahedron_planes[3];
	planes[4] = dodecahedron_planes[4];
	planes[5] = dodecahedron_planes[5];
	planes[6] = dodecahedron_planes[6];
	planes[7] = dodecahedron_planes[7];
	planes[8] = dodecahedron_planes[8];
	planes[9] = dodecahedron_planes[9];
	planes[10] = dodecahedron_planes[10];
	planes[11] = dodecahedron_planes[11];
	
	d = ConvexPolyhedronIntersect( rObjOrigin, rObjDirection, normal, 12, planes );
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uDodecahedronInvMatrix)) * normal;
		intersectionMaterial = diffuseMetalMaterial;
		intersectionShapeIsClosed = TRUE;
	}

	// ICOSAHEDRON - 20 faces
	// transform ray into icosahedron's object space
	rObjOrigin = vec3( uIcosahedronInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uIcosahedronInvMatrix * vec4(rayDirection, 0.0) );

	planes[0] = icosahedron_planes[0];
	planes[1] = icosahedron_planes[1];
	planes[2] = icosahedron_planes[2];
	planes[3] = icosahedron_planes[3];
	planes[4] = icosahedron_planes[4];
	planes[5] = icosahedron_planes[5];
	planes[6] = icosahedron_planes[6];
	planes[7] = icosahedron_planes[7];
	planes[8] = icosahedron_planes[8];
	planes[9] = icosahedron_planes[9];
	planes[10] = icosahedron_planes[10];
	planes[11] = icosahedron_planes[11];
	planes[12] = icosahedron_planes[12];
	planes[13] = icosahedron_planes[13];
	planes[14] = icosahedron_planes[14];
	planes[15] = icosahedron_planes[15];
	planes[16] = icosahedron_planes[16];
	planes[17] = icosahedron_planes[17];
	planes[18] = icosahedron_planes[18];
	planes[19] = icosahedron_planes[19];
	
	d = ConvexPolyhedronIntersect( rObjOrigin, rObjDirection, normal, 20, planes );
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uIcosahedronInvMatrix)) * normal;
		intersectionMaterial = diffuseMetalMaterial;
		intersectionShapeIsClosed = TRUE;
	}


	// Ground Rectangle
	d = RectangleIntersect( rectangles[0].position, rectangles[0].normal, rectangles[0].vectorU, rectangles[0].vectorV, 
		rectangles[0].radiusU, rectangles[0].radiusV, rayOrigin, rayDirection, u, v );
	if (d < t)
	{
		t = d;
		intersectionNormal = rectangles[0].normal;
		intersectionMaterial = rectangles[0].material;
		intersectionUV = vec2(u, v) * rectangles[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}


	d = BoxIntersect(boxes[0].minCorner, boxes[0].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[0].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,1,1)) * boxes[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[1].minCorner, boxes[1].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[1].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(-1,1,1)) * boxes[1].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[2].minCorner, boxes[2].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[2].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,-1,1)) * boxes[2].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[3].minCorner, boxes[3].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[3].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,1,-1)) * boxes[3].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[4].minCorner, boxes[4].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[4].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(-1,-1,1)) * boxes[4].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[5].minCorner, boxes[5].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[5].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,-1,-1)) * boxes[5].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	d = BoxIntersect(boxes[6].minCorner, boxes[6].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[6].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,1,1)) * boxes[6].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[7].minCorner, boxes[7].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[7].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(-1,1,1)) * boxes[7].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[8].minCorner, boxes[8].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[8].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,-1,1)) * boxes[8].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[9].minCorner, boxes[9].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[9].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,1,-1)) * boxes[9].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[10].minCorner, boxes[10].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[10].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(-1,-1,1)) * boxes[10].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
	d = BoxIntersect(boxes[11].minCorner, boxes[11].maxCorner, rayOrigin, rayDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = boxes[11].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, vec3(1,-1,-1)) * boxes[11].uvScale;
		intersectionShapeIsClosed = TRUE;
	}



	// smaller adjacent cylinders on bump map from the previous intersection
	d = CylinderIntersect( cylinders[1].widthRadius, cylinders[1].heightRadius, cylinders[1].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[1].material;
		intersectionShapeIsClosed = FALSE;
	}
	d = CylinderIntersect( cylinders[2].widthRadius, cylinders[2].heightRadius, cylinders[2].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[2].material;
		intersectionShapeIsClosed = FALSE;
	}

	d = CylinderIntersect( cylinders[4].widthRadius, cylinders[4].heightRadius, cylinders[4].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[4].material;
		intersectionShapeIsClosed = FALSE;
	}
	d = CylinderIntersect( cylinders[5].widthRadius, cylinders[5].heightRadius, cylinders[5].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[5].material;
		intersectionShapeIsClosed = FALSE;
	}

	d = CylinderIntersect( cylinders[7].widthRadius, cylinders[7].heightRadius, cylinders[7].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[7].material;
		intersectionShapeIsClosed = FALSE;
	}
	d = CylinderIntersect( cylinders[8].widthRadius, cylinders[8].heightRadius, cylinders[8].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[8].material;
		intersectionShapeIsClosed = FALSE;
	}

	d = CylinderIntersect( cylinders[10].widthRadius, cylinders[10].heightRadius, cylinders[10].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[10].material;
		intersectionShapeIsClosed = FALSE;
	}
	d = CylinderIntersect( cylinders[11].widthRadius, cylinders[11].heightRadius, cylinders[11].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[11].material;
		intersectionShapeIsClosed = FALSE;
	}

	d = CylinderIntersect( cylinders[13].widthRadius, cylinders[13].heightRadius, cylinders[13].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[13].material;
		intersectionShapeIsClosed = FALSE;
	}
	d = CylinderIntersect( cylinders[14].widthRadius, cylinders[14].heightRadius, cylinders[14].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[14].material;
		intersectionShapeIsClosed = FALSE;
	}

	d = CylinderIntersect( cylinders[16].widthRadius, cylinders[16].heightRadius, cylinders[16].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[16].material;
		intersectionShapeIsClosed = FALSE;
	}
	d = CylinderIntersect( cylinders[17].widthRadius, cylinders[17].heightRadius, cylinders[17].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = cylinders[17].material;
		intersectionShapeIsClosed = FALSE;
	}

	

	// large base cylinder
	d = CylinderIntersect( cylinders[0].widthRadius, cylinders[0].heightRadius, cylinders[0].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		// large base cylinder
		t = d;
		intersectionPoint = rayOrigin + (d * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = cylinders[0].material;
		intersectionUV = calcCylinderUV(intersectionPoint, cylinders[0].heightRadius, cylinders[0].position) * cylinders[0].uvScale;
		intersectionShapeIsClosed = FALSE;

		normalizedVec = intersectionPoint - cylinders[0].position;
		// must compute theta before normalizing the Vec
		theta = normalizedVec.y * (1.0 / cylinders[0].heightRadius);
		normalizedVec = normalize(normalizedVec);
		phi = atan(normalizedVec.z, normalizedVec.x);

		/* theta *= thetaScale;
		thetaMinusOne = theta - (1.0 / thetaScale);
		thetaPlusOne  = theta + (1.0 / thetaScale);
		theta = round(theta);
		thetaMinusOne = round(thetaMinusOne);
		thetaPlusOne = round(thetaPlusOne);
		theta *= oneOver_thetaScale;
		thetaMinusOne *= oneOver_thetaScale;
		thetaPlusOne *= oneOver_thetaScale; */
		
		phi *= phiScale;
		phiMinusOne = phi - (TWO_PI / phiScale);
		phiPlusOne  = phi + (TWO_PI / phiScale);
		phi = round(phi);
		phiMinusOne = round(phiMinusOne);
		phiPlusOne = round(phiPlusOne);
		phi *= oneOver_phiScale;
		phiMinusOne *= oneOver_phiScale;
		phiPlusOne *= oneOver_phiScale;
		
		normalizedVec = vec3( cos(phi), 0.0, sin(phi) );
		smallCylinderPos = cylinders[0].position + (cylinders[0].widthRadius * normalizedVec);
		//smallCylinderPos.y += (theta * cylinders[0].heightRadius);

		bumpCylinderHeightRadius = cylinders[0].heightRadius;
		cylinders[1].widthRadius = bumpCylinderWidthRadius;
		cylinders[1].heightRadius = bumpCylinderHeightRadius;
		cylinders[2].widthRadius = bumpCylinderWidthRadius;
		cylinders[2].heightRadius = bumpCylinderHeightRadius;
		
		// (theta, phi - 1)
		normalizedVec = vec3( cos(phiMinusOne), 0.0, sin(phiMinusOne) );
		cylinders[1].position = cylinders[0].position + (cylinders[0].widthRadius * normalizedVec);
		//cylinders[1].position.y += (theta * cylinders[0].heightRadius);
		// (theta, phi + 1)
		normalizedVec = vec3( cos(phiPlusOne), 0.0, sin(phiPlusOne) );
		cylinders[2].position = cylinders[0].position + (cylinders[0].widthRadius * normalizedVec);
		//cylinders[2].position.y += (theta * cylinders[0].heightRadius);

		d = CylinderIntersect( bumpCylinderWidthRadius, bumpCylinderHeightRadius, smallCylinderPos, rayOrigin, rayDirection, normal );
		if (d < t)
		{
			t = d;
			intersectionPoint = rayOrigin + (t * rayDirection);
			intersectionNormal = normal;
			intersectionMaterial = cylinders[0].material;
			intersectionUV = (calcCylinderUV(intersectionPoint, cylinders[0].heightRadius, cylinders[0].position) + vec2(0.5, 0.0)) * vec2(3, 1);
			intersectionShapeIsClosed = FALSE;
		}
		
	}

	// large base cylinder
	d = CylinderIntersect( cylinders[3].widthRadius, cylinders[3].heightRadius, cylinders[3].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		// large base cylinder
		t = d;
		intersectionPoint = rayOrigin + (d * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = cylinders[3].material;
		intersectionUV = calcCylinderUV(intersectionPoint, cylinders[3].heightRadius, cylinders[3].position) * cylinders[3].uvScale;
		intersectionShapeIsClosed = FALSE;

		normalizedVec = intersectionPoint - cylinders[3].position;
		// must compute theta before normalizing the Vec
		theta = normalizedVec.y * (1.0 / cylinders[3].heightRadius);
		normalizedVec = normalize(normalizedVec);
		phi = atan(normalizedVec.z, normalizedVec.x);

		/* theta *= thetaScale;
		thetaMinusOne = theta - (1.0 / thetaScale);
		thetaPlusOne  = theta + (1.0 / thetaScale);
		theta = round(theta);
		thetaMinusOne = round(thetaMinusOne);
		thetaPlusOne = round(thetaPlusOne);
		theta *= oneOver_thetaScale;
		thetaMinusOne *= oneOver_thetaScale;
		thetaPlusOne *= oneOver_thetaScale; */
		
		phi *= phiScale;
		phiMinusOne = phi - (TWO_PI / phiScale);
		phiPlusOne  = phi + (TWO_PI / phiScale);
		phi = round(phi);
		phiMinusOne = round(phiMinusOne);
		phiPlusOne = round(phiPlusOne);
		phi *= oneOver_phiScale;
		phiMinusOne *= oneOver_phiScale;
		phiPlusOne *= oneOver_phiScale;
		
		normalizedVec = vec3( cos(phi), 0.0, sin(phi) );
		smallCylinderPos = cylinders[3].position + (cylinders[3].widthRadius * normalizedVec);
		//smallCylinderPos.y += (theta * cylinders[0].heightRadius);

		bumpCylinderHeightRadius = cylinders[3].heightRadius;
		cylinders[4].widthRadius = bumpCylinderWidthRadius;
		cylinders[4].heightRadius = bumpCylinderHeightRadius;
		cylinders[5].widthRadius = bumpCylinderWidthRadius;
		cylinders[5].heightRadius = bumpCylinderHeightRadius;
		
		// (theta, phi - 1)
		normalizedVec = vec3( cos(phiMinusOne), 0.0, sin(phiMinusOne) );
		cylinders[4].position = cylinders[3].position + (cylinders[3].widthRadius * normalizedVec);
		//cylinders[1].position.y += (theta * cylinders[0].heightRadius);
		// (theta, phi + 1)
		normalizedVec = vec3( cos(phiPlusOne), 0.0, sin(phiPlusOne) );
		cylinders[5].position = cylinders[3].position + (cylinders[3].widthRadius * normalizedVec);
		//cylinders[2].position.y += (theta * cylinders[0].heightRadius);

		d = CylinderIntersect( bumpCylinderWidthRadius, bumpCylinderHeightRadius, smallCylinderPos, rayOrigin, rayDirection, normal );
		if (d < t)
		{
			t = d;
			intersectionPoint = rayOrigin + (t * rayDirection);
			intersectionNormal = normal;
			intersectionMaterial = cylinders[3].material;
			intersectionUV = (calcCylinderUV(intersectionPoint, cylinders[3].heightRadius, cylinders[3].position) + vec2(0.5, 0.5)) * vec2(3, -1);
			intersectionShapeIsClosed = FALSE;
		}
		
	}

	// large base cylinder
	d = CylinderIntersect( cylinders[6].widthRadius, cylinders[6].heightRadius, cylinders[6].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		// large base cylinder
		t = d;
		intersectionPoint = rayOrigin + (d * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = cylinders[3].material;
		intersectionUV = calcCylinderUV(intersectionPoint, cylinders[6].heightRadius, cylinders[6].position) * cylinders[6].uvScale;
		intersectionShapeIsClosed = FALSE;

		normalizedVec = intersectionPoint - cylinders[6].position;
		// must compute theta before normalizing the Vec
		theta = normalizedVec.y * (1.0 / cylinders[6].heightRadius);
		normalizedVec = normalize(normalizedVec);
		phi = atan(normalizedVec.z, normalizedVec.x);

		/* theta *= thetaScale;
		thetaMinusOne = theta - (1.0 / thetaScale);
		thetaPlusOne  = theta + (1.0 / thetaScale);
		theta = round(theta);
		thetaMinusOne = round(thetaMinusOne);
		thetaPlusOne = round(thetaPlusOne);
		theta *= oneOver_thetaScale;
		thetaMinusOne *= oneOver_thetaScale;
		thetaPlusOne *= oneOver_thetaScale; */
		
		phi *= phiScale;
		phiMinusOne = phi - (TWO_PI / phiScale);
		phiPlusOne  = phi + (TWO_PI / phiScale);
		phi = round(phi);
		phiMinusOne = round(phiMinusOne);
		phiPlusOne = round(phiPlusOne);
		phi *= oneOver_phiScale;
		phiMinusOne *= oneOver_phiScale;
		phiPlusOne *= oneOver_phiScale;
		
		normalizedVec = vec3( cos(phi), 0.0, sin(phi) );
		smallCylinderPos = cylinders[6].position + (cylinders[6].widthRadius * normalizedVec);
		//smallCylinderPos.y += (theta * cylinders[0].heightRadius);

		bumpCylinderHeightRadius = cylinders[6].heightRadius;
		cylinders[7].widthRadius = bumpCylinderWidthRadius;
		cylinders[7].heightRadius = bumpCylinderHeightRadius;
		cylinders[8].widthRadius = bumpCylinderWidthRadius;
		cylinders[8].heightRadius = bumpCylinderHeightRadius;
		
		// (theta, phi - 1)
		normalizedVec = vec3( cos(phiMinusOne), 0.0, sin(phiMinusOne) );
		cylinders[7].position = cylinders[6].position + (cylinders[6].widthRadius * normalizedVec);
		//cylinders[1].position.y += (theta * cylinders[0].heightRadius);
		// (theta, phi + 1)
		normalizedVec = vec3( cos(phiPlusOne), 0.0, sin(phiPlusOne) );
		cylinders[8].position = cylinders[6].position + (cylinders[6].widthRadius * normalizedVec);
		//cylinders[2].position.y += (theta * cylinders[0].heightRadius);

		d = CylinderIntersect( bumpCylinderWidthRadius, bumpCylinderHeightRadius, smallCylinderPos, rayOrigin, rayDirection, normal );
		if (d < t)
		{
			t = d;
			intersectionPoint = rayOrigin + (t * rayDirection);
			intersectionNormal = normal;
			intersectionMaterial = cylinders[6].material;
			intersectionUV = (calcCylinderUV(intersectionPoint, cylinders[6].heightRadius, cylinders[6].position) + vec2(-0.5, 0.5)) * vec2(3, 1);
			intersectionShapeIsClosed = FALSE;
		}
		
	}

	// large base cylinder
	d = CylinderIntersect( cylinders[9].widthRadius, cylinders[9].heightRadius, cylinders[9].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		// large base cylinder
		t = d;
		intersectionPoint = rayOrigin + (d * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = cylinders[9].material;
		intersectionUV = calcCylinderUV(intersectionPoint, cylinders[9].heightRadius, cylinders[9].position) * cylinders[9].uvScale;
		intersectionShapeIsClosed = FALSE;

		normalizedVec = intersectionPoint - cylinders[9].position;
		// must compute theta before normalizing the Vec
		theta = normalizedVec.y * (1.0 / cylinders[9].heightRadius);
		normalizedVec = normalize(normalizedVec);
		phi = atan(normalizedVec.z, normalizedVec.x);

		/* theta *= thetaScale;
		thetaMinusOne = theta - (1.0 / thetaScale);
		thetaPlusOne  = theta + (1.0 / thetaScale);
		theta = round(theta);
		thetaMinusOne = round(thetaMinusOne);
		thetaPlusOne = round(thetaPlusOne);
		theta *= oneOver_thetaScale;
		thetaMinusOne *= oneOver_thetaScale;
		thetaPlusOne *= oneOver_thetaScale; */
		
		phi *= phiScale;
		phiMinusOne = phi - (TWO_PI / phiScale);
		phiPlusOne  = phi + (TWO_PI / phiScale);
		phi = round(phi);
		phiMinusOne = round(phiMinusOne);
		phiPlusOne = round(phiPlusOne);
		phi *= oneOver_phiScale;
		phiMinusOne *= oneOver_phiScale;
		phiPlusOne *= oneOver_phiScale;
		
		normalizedVec = vec3( cos(phi), 0.0, sin(phi) );
		smallCylinderPos = cylinders[9].position + (cylinders[9].widthRadius * normalizedVec);
		//smallCylinderPos.y += (theta * cylinders[0].heightRadius);

		bumpCylinderHeightRadius = cylinders[9].heightRadius;
		cylinders[10].widthRadius = bumpCylinderWidthRadius;
		cylinders[10].heightRadius = bumpCylinderHeightRadius;
		cylinders[11].widthRadius = bumpCylinderWidthRadius;
		cylinders[11].heightRadius = bumpCylinderHeightRadius;
		
		// (theta, phi - 1)
		normalizedVec = vec3( cos(phiMinusOne), 0.0, sin(phiMinusOne) );
		cylinders[10].position = cylinders[9].position + (cylinders[9].widthRadius * normalizedVec);
		//cylinders[1].position.y += (theta * cylinders[0].heightRadius);
		// (theta, phi + 1)
		normalizedVec = vec3( cos(phiPlusOne), 0.0, sin(phiPlusOne) );
		cylinders[11].position = cylinders[9].position + (cylinders[9].widthRadius * normalizedVec);
		//cylinders[2].position.y += (theta * cylinders[0].heightRadius);

		d = CylinderIntersect( bumpCylinderWidthRadius, bumpCylinderHeightRadius, smallCylinderPos, rayOrigin, rayDirection, normal );
		if (d < t)
		{
			t = d;
			intersectionPoint = rayOrigin + (t * rayDirection);
			intersectionNormal = normal;
			intersectionMaterial = cylinders[9].material;
			intersectionUV = (calcCylinderUV(intersectionPoint, cylinders[9].heightRadius, cylinders[9].position) + vec2(-0.5, -0.5)) * vec2(3, 1);
			intersectionShapeIsClosed = FALSE;
		}
		
	}

	// large base cylinder
	d = CylinderIntersect( cylinders[12].widthRadius, cylinders[12].heightRadius, cylinders[12].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		// large base cylinder
		t = d;
		intersectionPoint = rayOrigin + (d * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = cylinders[12].material;
		intersectionUV = calcCylinderUV(intersectionPoint, cylinders[12].heightRadius, cylinders[12].position) * cylinders[12].uvScale;
		intersectionShapeIsClosed = FALSE;

		normalizedVec = intersectionPoint - cylinders[12].position;
		// must compute theta before normalizing the Vec
		theta = normalizedVec.y * (1.0 / cylinders[12].heightRadius);
		normalizedVec = normalize(normalizedVec);
		phi = atan(normalizedVec.z, normalizedVec.x);

		/* theta *= thetaScale;
		thetaMinusOne = theta - (1.0 / thetaScale);
		thetaPlusOne  = theta + (1.0 / thetaScale);
		theta = round(theta);
		thetaMinusOne = round(thetaMinusOne);
		thetaPlusOne = round(thetaPlusOne);
		theta *= oneOver_thetaScale;
		thetaMinusOne *= oneOver_thetaScale;
		thetaPlusOne *= oneOver_thetaScale; */
		
		phi *= phiScale;
		phiMinusOne = phi - (TWO_PI / phiScale);
		phiPlusOne  = phi + (TWO_PI / phiScale);
		phi = round(phi);
		phiMinusOne = round(phiMinusOne);
		phiPlusOne = round(phiPlusOne);
		phi *= oneOver_phiScale;
		phiMinusOne *= oneOver_phiScale;
		phiPlusOne *= oneOver_phiScale;
		
		normalizedVec = vec3( cos(phi), 0.0, sin(phi) );
		smallCylinderPos = cylinders[12].position + (cylinders[12].widthRadius * normalizedVec);
		//smallCylinderPos.y += (theta * cylinders[0].heightRadius);

		bumpCylinderHeightRadius = cylinders[12].heightRadius;
		cylinders[13].widthRadius = bumpCylinderWidthRadius;
		cylinders[13].heightRadius = bumpCylinderHeightRadius;
		cylinders[14].widthRadius = bumpCylinderWidthRadius;
		cylinders[14].heightRadius = bumpCylinderHeightRadius;
		
		// (theta, phi - 1)
		normalizedVec = vec3( cos(phiMinusOne), 0.0, sin(phiMinusOne) );
		cylinders[13].position = cylinders[12].position + (cylinders[12].widthRadius * normalizedVec);
		//cylinders[1].position.y += (theta * cylinders[0].heightRadius);
		// (theta, phi + 1)
		normalizedVec = vec3( cos(phiPlusOne), 0.0, sin(phiPlusOne) );
		cylinders[14].position = cylinders[12].position + (cylinders[12].widthRadius * normalizedVec);
		//cylinders[2].position.y += (theta * cylinders[0].heightRadius);

		d = CylinderIntersect( bumpCylinderWidthRadius, bumpCylinderHeightRadius, smallCylinderPos, rayOrigin, rayDirection, normal );
		if (d < t)
		{
			t = d;
			intersectionPoint = rayOrigin + (t * rayDirection);
			intersectionNormal = normal;
			intersectionMaterial = cylinders[12].material;
			intersectionUV = (calcCylinderUV(intersectionPoint, cylinders[12].heightRadius, cylinders[12].position) + vec2(-0.5, 0.5)) * vec2(-3, -1);
			intersectionShapeIsClosed = FALSE;
		}
		
	}

	// large base cylinder
	d = CylinderIntersect( cylinders[15].widthRadius, cylinders[15].heightRadius, cylinders[15].position, rayOrigin, rayDirection, normal );
	if (d < t)
	{
		// large base cylinder
		t = d;
		intersectionPoint = rayOrigin + (d * rayDirection);
		intersectionNormal = normal;
		intersectionMaterial = cylinders[15].material;
		intersectionUV = calcCylinderUV(intersectionPoint, cylinders[15].heightRadius, cylinders[15].position) * cylinders[15].uvScale;
		intersectionShapeIsClosed = FALSE;

		normalizedVec = intersectionPoint - cylinders[15].position;
		// must compute theta before normalizing the Vec
		theta = normalizedVec.y * (1.0 / cylinders[15].heightRadius);
		normalizedVec = normalize(normalizedVec);
		phi = atan(normalizedVec.z, normalizedVec.x);
		

		/* theta *= thetaScale;
		thetaMinusOne = theta - (1.0 / thetaScale);
		thetaPlusOne  = theta + (1.0 / thetaScale);
		theta = round(theta);
		thetaMinusOne = round(thetaMinusOne);
		thetaPlusOne = round(thetaPlusOne);
		theta *= oneOver_thetaScale;
		thetaMinusOne *= oneOver_thetaScale;
		thetaPlusOne *= oneOver_thetaScale; */
		
		phi *= phiScale;
		phiMinusOne = phi - (TWO_PI / phiScale);
		phiPlusOne  = phi + (TWO_PI / phiScale);
		phi = round(phi);
		phiMinusOne = round(phiMinusOne);
		phiPlusOne = round(phiPlusOne);
		phi *= oneOver_phiScale;
		phiMinusOne *= oneOver_phiScale;
		phiPlusOne *= oneOver_phiScale;
		
		normalizedVec = vec3( cos(phi), 0.0, sin(phi) );
		smallCylinderPos = cylinders[15].position + (cylinders[15].widthRadius * normalizedVec);
		//smallCylinderPos.y += (theta * cylinders[0].heightRadius);

		bumpCylinderHeightRadius = cylinders[15].heightRadius;
		cylinders[16].widthRadius = bumpCylinderWidthRadius;
		cylinders[16].heightRadius = bumpCylinderHeightRadius;
		cylinders[17].widthRadius = bumpCylinderWidthRadius;
		cylinders[17].heightRadius = bumpCylinderHeightRadius;
		
		// (theta, phi - 1)
		normalizedVec = vec3( cos(phiMinusOne), 0.0, sin(phiMinusOne) );
		cylinders[16].position = cylinders[15].position + (cylinders[15].widthRadius * normalizedVec);
		//cylinders[1].position.y += (theta * cylinders[0].heightRadius);
		// (theta, phi + 1)
		normalizedVec = vec3( cos(phiPlusOne), 0.0, sin(phiPlusOne) );
		cylinders[17].position = cylinders[15].position + (cylinders[15].widthRadius * normalizedVec);
		//cylinders[2].position.y += (theta * cylinders[0].heightRadius);

		d = CylinderIntersect( bumpCylinderWidthRadius, bumpCylinderHeightRadius, smallCylinderPos, rayOrigin, rayDirection, normal );
		if (d < t)
		{
			t = d;
			intersectionPoint = rayOrigin + (t * rayDirection);
			intersectionNormal = normal;
			intersectionMaterial = cylinders[15].material;
			intersectionUV = (calcCylinderUV(intersectionPoint, cylinders[15].heightRadius, cylinders[15].position) + vec2(0.5, 0.5)) * vec2(-3, -1);
			intersectionShapeIsClosed = FALSE;
		}
		
	}


 
	return t;
} // end float SceneIntersect( int isShadowRay )



vec3 getSkyColor(vec3 rayDir)
{
	vec3 skyColor = mix(vec3(0.4, 0.7, 1.0) * 0.9, vec3(0.005), clamp(exp(rayDir.y * -8.0), 0.0, 1.0));
	return skyColor;
}


//-------------------------------------------------------------------------------------------
vec3 RayTrace()
//-------------------------------------------------------------------------------------------
{
	// the following 2 variables are just placeholders in this directional light-only scene, so that the 'bounces' code loop below will still work 
	vec3 pointLightPosition; // placeholder in this scene with no pointLights
	Material pointLightMaterial; // placeholder in this scene with no pointLights
	vec3 accumulatedColor = vec3(0); // this will hold the final raytraced color for this pixel
        vec3 rayColorMask = vec3(1); // all rays start out un-tinted pure white (vec3(1)) - no color tinting, yet
	vec3 reflectionRayOrigin, reflectionRayDirection; // these rays will be used to capture surface reflections from the surrounding environment
	vec3 reflectionRayColorMask;
        vec3 geometryNormal, shadingNormal;
	vec3 halfwayVector;
	vec3 intersectionPoint;
	vec3 directionToLight = normalize(vec3(0.5, 1.0, 0.6));
	float sunlightPower = 4.0;
	vec3 sunlightColor = vec3(1.0, 1.0, 1.0) * sunlightPower;
	vec3 lightColor = sunlightColor;//pointLightMaterial.color;
	vec3 ambientContribution = vec3(0);
	vec3 diffuseContribution = vec3(0);
	vec3 specularContribution = vec3(0);
	vec3 textureColor;

	float t = INFINITY;
	float initial_t = INFINITY;
	float ambientIntensity = 0.1;
	float diffuseIntensity;
	float fogStart;
	float reflectance, transmittance;
	float IoR_ratio;
	float transparentThickness;

	int isShadowRay = FALSE;
	int willNeedReflectionRay = FALSE;
	int sceneUsesDirectionalLight = TRUE;
	int initialIntersectionMaterialType;
	int previousIntersectionMaterialType;
	intersectionMaterial.type = -100;

	// For the kind of ray tracing we're doing, 7 or 8 bounces is enough to do all the reflections and refractions that are most clearly noticeable.
	// You might be able to get away with 5/6 bounces if on a mobile budget, or crank it up to 9/10 bounces if your scene has a bunch of mirrors or glass objects.

	for (int bounces = 0; bounces < 6; bounces++)
	{
		previousIntersectionMaterialType = intersectionMaterial.type;

		// the following tests for intersections with the entire scene, then reports back the closest object (min t value)
		t = SceneIntersect( isShadowRay );

		if (bounces == 0)
			initialIntersectionMaterialType = intersectionMaterial.type;


		if (t == INFINITY) // ray has missed all objects and hit the background sky
		{
			if (bounces == 0) // if this is the initial camera ray, just draw the sky and exit
			{
				//accumulatedColor = vec3(0.005);
				accumulatedColor = getSkyColor(rayDirection);
				break;
			}
			
			if (isShadowRay == TRUE) // the shadow ray was successful, so we know we can see the light from the surface where the shadow ray
			{			//  emerged from - therefore, the direct diffuse lighting and specular lighting can be added to that surface.
				accumulatedColor += diffuseContribution; // diffuse direct lighting
				accumulatedColor += specularContribution; // bright specular highlights
			}
			else if (initialIntersectionMaterialType == METAL)
			{
				accumulatedColor += (rayColorMask * getSkyColor(rayDirection));
			}
			
			// now that the initial camera ray has completed its journey, we can spawn the saved reflectionRay to gather reflections from shiny surfaces.
			if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask; // this was the ray color at the time of branching between transmitted and reflected rays  
				rayOrigin = reflectionRayOrigin; // this is the saved reflection ray origin back at the surface location before branching occured
				rayDirection = reflectionRayDirection; // this was the saved reflection direction of the ray at the reflective surface location
				willNeedReflectionRay = FALSE; // we just set up the reflection ray, so we can turn this flag off
				isShadowRay = FALSE; // this is a reflection ray, not a shadow ray
				continue; // continue next with this reflection ray's own path
			}
			// if we get here, we've done all the bounces/reflections that we can do, so exit
			break;
		}

		

		// if we get here and isShadowRay == TRUE still, that means the shadow ray failed to find the light source
		//  (another object was in the way of the light). This surface will be rendered in shadow (ambient contribution only)
		if (isShadowRay == TRUE && intersectionMaterial.type != TRANSPARENT)
		{
			// if the shadow ray failed, we can still rewind back to the surface of a shiny object (either ClearCoat or Transparent)
			// and follow the saved reflectionRay path to gather the mirror reflections in the clearcoat
			if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;
				willNeedReflectionRay = FALSE;
				isShadowRay = FALSE;
				continue;
			}

			// failed to find light source, so leave surface in shadow and exit
			break;
		}

		// useful data 
		// there are 2 types of surface normals that we must handle in all ray tracers - the geometry normal and the shading normal.
		// The geometery normal is simply the original, unaltered surface normal from the shape or triangle mesh.  However, while doing shading, all normals must be on the same side of the surface as the ray
		// (in the opposing direction to the rayDirection), so that's when the shading normal comes in. The shading normal starts out as an exact copy of the geometry normal, but
		// if it is determined that the shading normal is pointing in the same direction as the ray (or nearly the same), it means the normal is on the wrong side of the surface and we must flip it (negate it)
		geometryNormal = normalize(intersectionNormal); // geometry normals are the unaltered normals from the intersected shape definition / or from the triangle mesh data
                shadingNormal = dot(geometryNormal, rayDirection) < 0.0 ? geometryNormal : -geometryNormal; // if geometry normal is pointing in the same manner as ray, must flip the shading normal (negate it) 
		intersectionPoint = rayOrigin + (t * rayDirection); // use the ray equation to find intersection point (P = O + tD)
		// the directionToLight vector will point from the intersected surface either towards the Sun, or up to the point light position
		directionToLight = (sceneUsesDirectionalLight == TRUE) ? directionToLight : normalize(pointLightPosition - intersectionPoint);
		halfwayVector = normalize(-rayDirection + directionToLight); // this is Blinn's modification to Phong's model

		// if the intersection material has a valid texture ID (> -1), go ahead and sample the texture at the hit material's UV coordinates
		if (intersectionMaterial.textureID > -1)
		{
			textureColor = texture(uMarbleTexture, intersectionUV).rgb;
			textureColor *= textureColor; // remove image gamma by raising texture color to the power of 2.2 (but squaring is close enough and cheaper)
			intersectionMaterial.color *= (textureColor * 0.7); // now that the texture color is in linear space, we can do simple math with it, like multiplying and adding
		}

		// if (intersectionMaterial.isCheckered == TRUE)
		// {
		// 	intersectionMaterial.color = mod(floor(intersectionUV.x) + floor(intersectionUV.y), 2.0) == 0.0 ? intersectionMaterial.color : intersectionMaterial.color2;
		// }
		
                if (intersectionMaterial.type == PHONG)
                {
			// Phong's original lighting model consists of 3 components - Ambient, Diffuse, and Specular contributions.
			// Ambient is an old 'hack' to cheaply simulate the effect of soft, diffuse bounce lighting (Global Illumination)
			ambientContribution = doAmbientLighting(rayColorMask, ambientIntensity, intersectionMaterial.color);
			accumulatedColor += ambientContribution; // on diffuse surfaces (including Phong materials), ambient is always present no matter what, so go ahead and add it to the final accumColor now

			// Diffuse is the typical Lambertian lighting (NdotL) that arrives directly from the light source - this gives non-metallic surfaces their color & gradient shading
			diffuseContribution = doDiffuseDirectLighting(rayColorMask, shadingNormal, directionToLight, lightColor, intersectionMaterial.color, diffuseIntensity);
			//diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(spheres[0].position, intersectionPoint));
			
			// Specular is the bright highlight on shiny surfaces, resulting from a direct reflection of the light source itself
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, lightColor, intersectionMaterial.roughness, diffuseIntensity);
			// when all 3 components (Ambient, Diffuse, and Specular) have been calculated, they are just simply added up to give the final lighting.
			// Since Ambient lighting (global) is always present no matter what, it was immediately added a couple lines above.
			// However, in order to add the Diffuse and Specular lighting contributions, we must be able to 'see' the light source from the surface's perspective.
			// Therefore, a shadow ray (i.e. a test ray) is created and sent out toward the light's position. If the shadow ray successfully hits the light source, 
			// the Diffuse and Specular lighting may be added. If it fails to find the light source (another object is in the way), the surface is left in shadow with Ambient light only.
			isShadowRay = TRUE;
			// first we must nudge shadow ray origin out from the surface (along the surface normal) just a little bit, in order to avoid self-intersection on the next bounces loop iteration
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal);
			rayDirection = directionToLight; // all shadow rays go directly toward the light
			continue; // continue next with shadow ray towards the light source
                }
		
                if (intersectionMaterial.type == METAL)
		{
			rayColorMask *= intersectionMaterial.color;

			ambientContribution = doAmbientLighting(rayColorMask, ambientIntensity, intersectionMaterial.color);
			accumulatedColor += ambientContribution; // on diffuse surfaces (dusty metal), ambient is always present no matter what, so go ahead and add it to the final accumColor now

			diffuseContribution = doDiffuseDirectLighting(rayColorMask, shadingNormal, directionToLight, lightColor, intersectionMaterial.color, diffuseIntensity);
			//diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(spheres[0].position, intersectionPoint));
			
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, lightColor, intersectionMaterial.roughness, diffuseIntensity);

			// If this Metal type of material is either the first thing that the camera ray encounters (bounces == 0), or the 2nd thing the ray encounters after reflecting from METAL (bounces == 1),
			// then setup and save a reflection ray for later use. After we've done that, first we'll send out the usual shadow ray to see if the Diffuse and Specular contributions can be added. Then once the shadow ray 
			// is done testing for light visibility, we'll rewind back to this surface and send out the saved reflection ray on its own trajectory, in order to capture reflections of the environment. 
			if (bounces == 0)// || (bounces == 1 && previousIntersectionMaterialType == METAL))
			{
				willNeedReflectionRay = TRUE; // this flag will let the future code know that it needs to rewind time and trace the saved reflection ray
				reflectionRayColorMask = rayColorMask * intersectionMaterial.color2;
				reflectionRayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				reflectionRayDirection = reflect(rayDirection, shadingNormal);
			}

			if (previousIntersectionMaterialType == METAL)
			{
				rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the shadow rayOrigin out from the surface to avoid self-intersection
				rayDirection = reflect(rayDirection, shadingNormal);
				continue;
			}
			// First, send out the usual shadow ray for the diffuse part of this surface. When that's done with its job, the saved reflection ray will take over.  
			// The reflection ray above will start right back at this same spot on the surface, but will go off on its own mirror reflection trajectory.
			isShadowRay = TRUE;
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the shadow rayOrigin out from the surface to avoid self-intersection
			rayDirection = directionToLight; // all shadow rays go directly toward the light
			continue; // continue next with shadow ray towards the light source
		}

		

		if (intersectionMaterial.type == DIFFUSE_METAL)
		{	
			ambientContribution = doAmbientLighting(rayColorMask, ambientIntensity, intersectionMaterial.color);
			accumulatedColor += ambientContribution; // on diffuse surfaces (dusty metal), ambient is always present no matter what, so go ahead and add it to the final accumColor now

			diffuseContribution = doDiffuseDirectLighting(rayColorMask, shadingNormal, directionToLight, lightColor, intersectionMaterial.color, diffuseIntensity);
			//diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(spheres[0].position, intersectionPoint));
			
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, lightColor, intersectionMaterial.roughness, diffuseIntensity);

			// If this DiffuseMetal type of material is either the first thing that the camera ray encounters (bounces == 0), or the 2nd thing the ray encounters after reflecting from METAL (bounces == 1),
			// then setup and save a reflection ray for later use. After we've done that, first we'll send out the usual shadow ray to see if the Diffuse and Specular contributions can be added. Then once the shadow ray 
			// is done testing for light visibility, we'll rewind back to this surface and send out the saved reflection ray on its own trajectory, in order to capture reflections of the environment. 
			if (bounces == 0)// || (bounces == 1 && previousIntersectionMaterialType == METAL))
			{
				willNeedReflectionRay = TRUE; // this flag will let the future code know that it needs to rewind time and trace the saved reflection ray
				reflectionRayColorMask = rayColorMask * intersectionMaterial.color2;
				reflectionRayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				reflectionRayDirection = reflect(rayDirection, shadingNormal);
			}
			// First, send out the usual shadow ray for the diffuse part of this surface. When that's done with its job, the saved reflection ray will take over.  
			// The reflection ray above will start right back at this same spot on the surface, but will go off on its own mirror reflection trajectory.
			isShadowRay = TRUE;
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the shadow rayOrigin out from the surface to avoid self-intersection
			rayDirection = directionToLight; // all shadow rays go directly toward the light
			continue; // continue next with shadow ray towards the light source
		}

		
	} // end for (int bounces = 0; bounces < 5; bounces++)
		

	return max(vec3(0), accumulatedColor);

}  // end vec3 RayTrace()


//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
	// tetrahedron (triangular pyramid)
	tetrahedron_planes[0] = vec4(vec3(-0.5773502588272095, 0.5773502588272095, 0.5773502588272095), 0.5);
	tetrahedron_planes[1] = vec4(vec3( 0.5773502588272095, 0.5773502588272095,-0.5773502588272095), 0.5);
	tetrahedron_planes[2] = vec4(vec3( 0.5773502588272095,-0.5773502588272095, 0.5773502588272095), 0.5);
	tetrahedron_planes[3] = vec4(vec3(-0.5773502588272095,-0.5773502588272095,-0.5773502588272095), 0.5);
	
	// octahedron (rectangular bipyramid) 
	octahedron_planes[0] = vec4(vec3( 0.5773502588272095, 0.5773502588272095, 0.5773502588272095), 0.6);
	octahedron_planes[1] = vec4(vec3( 0.5773502588272095,-0.5773502588272095, 0.5773502588272095), 0.6);
	octahedron_planes[2] = vec4(vec3( 0.5773502588272095,-0.5773502588272095,-0.5773502588272095), 0.6);
	octahedron_planes[3] = vec4(vec3( 0.5773502588272095, 0.5773502588272095,-0.5773502588272095), 0.6);
	octahedron_planes[4] = vec4(vec3(-0.5773502588272095, 0.5773502588272095,-0.5773502588272095), 0.6);
	octahedron_planes[5] = vec4(vec3(-0.5773502588272095,-0.5773502588272095,-0.5773502588272095), 0.6);
	octahedron_planes[6] = vec4(vec3(-0.5773502588272095,-0.5773502588272095, 0.5773502588272095), 0.6);
	octahedron_planes[7] = vec4(vec3(-0.5773502588272095, 0.5773502588272095, 0.5773502588272095), 0.6);

	// dodecahedron
	dodecahedron_planes[ 0] = vec4(vec3(0, 0.8506507873535156, 0.525731086730957), 0.9);
	dodecahedron_planes[ 1] = vec4(vec3(0.8506507873535156, 0.525731086730957, 0), 0.9);
	dodecahedron_planes[ 2] = vec4(vec3(0.525731086730957, 0, -0.8506508469581604), 0.9);
	dodecahedron_planes[ 3] = vec4(vec3(-0.525731086730957, 0, -0.8506508469581604), 0.9);
	dodecahedron_planes[ 4] = vec4(vec3(-0.8506507873535156, -0.525731086730957, 0), 0.9);
	dodecahedron_planes[ 5] = vec4(vec3(0, 0.8506507873535156, -0.525731086730957), 0.9);
	dodecahedron_planes[ 6] = vec4(vec3(-0.8506508469581604, 0.525731086730957, 0), 0.9);
	dodecahedron_planes[ 7] = vec4(vec3(-0.525731086730957, 0, 0.8506508469581604), 0.9);
	dodecahedron_planes[ 8] = vec4(vec3(0, -0.8506508469581604, -0.525731086730957), 0.9);
	dodecahedron_planes[ 9] = vec4(vec3(0.525731086730957, 0, 0.8506508469581604), 0.9);
	dodecahedron_planes[10] = vec4(vec3(0.8506508469581604, -0.525731086730957, 0), 0.9);
	dodecahedron_planes[11] = vec4(vec3(0, -0.8506508469581604, 0.525731086730957), 0.9);

	// icosahedron
	icosahedron_planes[ 0] = vec4(vec3(-0.5773502588272095, 0.5773502588272095, 0.5773502588272095), 0.9);
	icosahedron_planes[ 1] = vec4(vec3(0, 0.9341723322868347, 0.35682210326194763), 0.9);
	icosahedron_planes[ 2] = vec4(vec3(0, 0.9341723322868347, -0.35682210326194763), 0.9);
	icosahedron_planes[ 3] = vec4(vec3(-0.5773502588272095, 0.5773502588272095, -0.5773502588272095), 0.9);
	icosahedron_planes[ 4] = vec4(vec3(-0.9341723322868347, 0.35682210326194763, 0), 0.9);
	icosahedron_planes[ 5] = vec4(vec3(0.5773502588272095, 0.5773502588272095, 0.5773502588272095), 0.9);
	icosahedron_planes[ 6] = vec4(vec3(-0.35682210326194763, 0, 0.9341723322868347), 0.9);
	icosahedron_planes[ 7] = vec4(vec3(-0.9341723322868347, -0.35682210326194763, 0), 0.9);
	icosahedron_planes[ 8] = vec4(vec3(-0.35682210326194763, 0, -0.9341723322868347), 0.9);
	icosahedron_planes[ 9] = vec4(vec3(0.5773502588272095, 0.5773502588272095, -0.5773502588272095), 0.9);
	icosahedron_planes[10] = vec4(vec3(0.5773502588272095, -0.5773502588272095, 0.5773502588272095), 0.9);
	icosahedron_planes[11] = vec4(vec3(0, -0.9341723322868347, 0.35682210326194763), 0.9);
	icosahedron_planes[12] = vec4(vec3(0, -0.9341723322868347, -0.35682210326194763), 0.9);
	icosahedron_planes[13] = vec4(vec3(0.5773502588272095, -0.5773502588272095, -0.5773502588272095), 0.9);
	icosahedron_planes[14] = vec4(vec3(0.9341723322868347, -0.35682210326194763, 0), 0.9);
	icosahedron_planes[15] = vec4(vec3(0.35682210326194763, 0, 0.9341723322868347), 0.9);
	icosahedron_planes[16] = vec4(vec3(-0.5773502588272095, -0.5773502588272095, 0.5773502588272095), 0.9);
	icosahedron_planes[17] = vec4(vec3(-0.5773502588272095, -0.5773502588272095, -0.5773502588272095), 0.9);
	icosahedron_planes[18] = vec4(vec3(0.35682210326194763, 0, -0.9341723322868347), 0.9);
	icosahedron_planes[19] = vec4(vec3(0.9341723322868347, 0.35682210326194763, 0), 0.9);


	// rgb values for common metals
	// Gold: (1.000, 0.766, 0.336) / Aluminum: (0.913, 0.921, 0.925) / Copper: (0.955, 0.637, 0.538) / Silver: (0.972, 0.960, 0.915)
	
	Material marbleMaterial = Material(PHONG, FALSE, vec3(0.3), vec3(0.0, 0.0, 0.0), 0.0, 1.0, 0.0, 0);
	Material blueDiffuseMetalMaterial = Material(DIFFUSE_METAL, FALSE, vec3(0.0, 0.01, 0.035), vec3(0.0, 0.2, 1.0), 1.0, 0.0, 0.0, -1);


	rectangles[0] = Rectangle(vec3(0, 0, 0), vec3(0,1,0), vec3(1,0,0), vec3(0,0,1), 100.0, 25.0, vec2(300, 300), blueDiffuseMetalMaterial);

	vec3 frontCenterCylinderPos = vec3(0, 4, 0);
	vec3 frontLeftCylinderPos = vec3(-5.5, 4, 0);
	vec3 frontRightCylinderPos = vec3(5.5, 4, 0);
	vec3 backCenterCylinderPos = vec3(0, 4.5,-6);
	vec3 backLeftCylinderPos = vec3(-5.5, 4.5,-6);
	vec3 backRightCylinderPos = vec3(5.5, 4.5,-6);

	cylinders[0] = Cylinder(1.7, 3.0, frontCenterCylinderPos, vec2(1, 1), marbleMaterial);
	cylinders[1] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);
	cylinders[2] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);

	cylinders[3] = Cylinder(1.7, 3.0, frontLeftCylinderPos, vec2(1, 1), marbleMaterial);
	cylinders[4] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);
	cylinders[5] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);

	cylinders[6] = Cylinder(1.7, 3.0, frontRightCylinderPos, vec2(1, 1), marbleMaterial);
	cylinders[7] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);
	cylinders[8] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);

	cylinders[9] = Cylinder(1.7, 4.5, backCenterCylinderPos, vec2(1, 1), marbleMaterial);
	cylinders[10] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);
	cylinders[11] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);

	cylinders[12] = Cylinder(1.7, 4.5, backLeftCylinderPos, vec2(1, 1), marbleMaterial);
	cylinders[13] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);
	cylinders[14] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);

	cylinders[15] = Cylinder(1.7, 4.5, backRightCylinderPos, vec2(1, 1), marbleMaterial);
	cylinders[16] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);
	cylinders[17] = Cylinder(0.0, 0.0, vec3(0), vec2(1, 1), marbleMaterial);

	boxes[0] = Box( frontCenterCylinderPos - vec3(1.9,4,1.9), frontCenterCylinderPos + vec3(1.9,-3,1.9), vec2(1, 1), marbleMaterial);
	boxes[1] = Box( frontCenterCylinderPos - vec3(1.9,-2.5,1.9), frontCenterCylinderPos + vec3(1.9,3,1.9), vec2(1, 1), marbleMaterial);
	boxes[2] = Box( frontLeftCylinderPos - vec3(1.9,4,1.9), frontLeftCylinderPos + vec3(1.9,-3,1.9), vec2(1, 1), marbleMaterial);
	boxes[3] = Box( frontLeftCylinderPos - vec3(1.9,-2.5,1.9), frontLeftCylinderPos + vec3(1.9,3,1.9), vec2(1, 1), marbleMaterial);
	boxes[4] = Box( frontRightCylinderPos - vec3(1.9,4,1.9), frontRightCylinderPos + vec3(1.9,-3,1.9), vec2(1, 1), marbleMaterial);
	boxes[5] = Box( frontRightCylinderPos - vec3(1.9,-2.5,1.9), frontRightCylinderPos + vec3(1.9,3,1.9), vec2(1, 1), marbleMaterial);

	boxes[6] = Box( backCenterCylinderPos - vec3(1.9,4.5,1.9), backCenterCylinderPos + vec3(1.9,-3.5,1.9), vec2(1, 1), marbleMaterial);
	boxes[7] = Box( backCenterCylinderPos - vec3(1.9,-4.5,1.9), backCenterCylinderPos + vec3(1.9,5,1.9), vec2(1, 1), marbleMaterial);
	boxes[8] = Box( backLeftCylinderPos - vec3(1.9,4.5,1.9), backLeftCylinderPos + vec3(1.9,-3.5,1.9), vec2(1, 1), marbleMaterial);
	boxes[9] = Box( backLeftCylinderPos - vec3(1.9,-4.5,1.9), backLeftCylinderPos + vec3(1.9,5,1.9), vec2(1, 1), marbleMaterial);
	boxes[10] = Box( backRightCylinderPos - vec3(1.9,4.5,1.9), backRightCylinderPos + vec3(1.9,-3.5,1.9), vec2(1, 1), marbleMaterial);
	boxes[11] = Box( backRightCylinderPos - vec3(1.9,-4.5,1.9), backRightCylinderPos + vec3(1.9,5,1.9), vec2(1, 1), marbleMaterial);

}


#include <raytracing_main>
