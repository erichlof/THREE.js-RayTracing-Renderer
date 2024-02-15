precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform mat4 uBoxesInvMatrices[17];
uniform mat4 uGlassSphereInvMatrix;
uniform vec3 uLightPosition;

#define N_LIGHT_BOXES 1
#define N_BOXES 17
#define N_SPHERES 1

vec3 rayOrigin, rayDirection;

struct Material { int type; int isCheckered; vec3 color; vec3 color2; float roughness; float IoR; int textureID; };
struct Box { vec3 minCorner; vec3 maxCorner; vec2 uvScale; Material material; };
struct UnitBox { vec2 uvScale; Material material; };
struct UnitSphere { vec2 uvScale; Material material; };

// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;
int intersectionShapeIsClosed;
Material intersectionMaterial;

Box lightBoxes[N_LIGHT_BOXES];
UnitBox boxes[N_BOXES];
UnitSphere spheres[N_SPHERES];

#include <raytracing_core_functions>

#include <raytracing_box_intersect>

#include <raytracing_unit_box_intersect>

#include <raytracing_unit_sphere_intersect>



//---------------------------------------------------------------------------------------
float SceneIntersect( int isShadowRay, int sceneUsesDirectionalLight )
//---------------------------------------------------------------------------------------
{
	
	vec3 rObjOrigin, rObjDirection; 
	vec3 intersectionPoint, normal;
	vec3 absPoint;
        float d;
	float t = INFINITY;
	float u, v;
	int isRayExiting = FALSE;

	// When shadow rays are trying to intersect a small point light source, a tiny box makes a better shape to try and hit
	// than a tiny sphere (due to floating-point precision error, some rays will hit while others will miss the small sphere from far away).  
	// Viewers will still see a tiny sphere representing the point light, but shadow rays will instead "see" a tiny box in the same spot.
	if (isShadowRay == TRUE && sceneUsesDirectionalLight == FALSE)
	{
		d = BoxIntersect( lightBoxes[0].minCorner, lightBoxes[0].maxCorner, rayOrigin, rayDirection, normal, isRayExiting );
		if (d < t)
		{
			t = d;
			//intersectionNormal = normal;
			intersectionMaterial = lightBoxes[0].material;
		}
	}

	

	// transform ray into Glass Unit Sphere's object space
	rObjOrigin = vec3( uGlassSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uGlassSphereInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitSphereIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uGlassSphereInvMatrix)) * normal;
		intersectionMaterial = spheres[0].material;
		intersectionUV = calcUnitSphereUV(intersectionPoint) * spheres[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}


	// transform ray into Unit Box's object space
	rObjOrigin = vec3( uBoxesInvMatrices[0] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[0] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[0])) * normal;
		intersectionMaterial = boxes[0].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[1] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[1] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[1])) * normal;
		intersectionMaterial = boxes[1].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[2] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[2] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[2])) * normal;
		intersectionMaterial = boxes[2].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[3] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[3] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[3])) * normal;
		intersectionMaterial = boxes[3].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[4] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[4] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[4])) * normal;
		intersectionMaterial = boxes[4].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[5] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[5] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[5])) * normal;
		intersectionMaterial = boxes[5].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[6] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[6] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[6])) * normal;
		intersectionMaterial = boxes[6].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[7] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[7] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[7])) * normal;
		intersectionMaterial = boxes[7].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[8] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[8] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[8])) * normal;
		intersectionMaterial = boxes[8].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[9] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[9] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[9])) * normal;
		intersectionMaterial = boxes[9].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[10] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[10] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[10])) * normal;
		intersectionMaterial = boxes[10].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[11] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[11] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[11])) * normal;
		intersectionMaterial = boxes[11].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[12] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[12] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[12])) * normal;
		intersectionMaterial = boxes[12].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[13] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[13] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[13])) * normal;
		intersectionMaterial = boxes[13].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[14] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[14] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[14])) * normal;
		intersectionMaterial = boxes[14].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[15] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[15] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[15])) * normal;
		intersectionMaterial = boxes[15].material;
		intersectionShapeIsClosed = TRUE;
	}
	rObjOrigin = vec3( uBoxesInvMatrices[16] * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxesInvMatrices[16] * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		absPoint = abs(intersectionPoint);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (absPoint.x > absPoint.y && absPoint.x >= absPoint.z)
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (absPoint.y > absPoint.x && absPoint.y >= absPoint.z)
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxesInvMatrices[16])) * normal;
		intersectionMaterial = boxes[16].material;
		intersectionShapeIsClosed = TRUE;
	}


	return t;
} // end float SceneIntersect( )


vec3 getSkyColor()
{
	return vec3(0.95); // almost 'pure white' background
}


//-------------------------------------------------------------------------------------------
vec3 RayTrace()
//-------------------------------------------------------------------------------------------
{
	
	Material pointLightMaterial = lightBoxes[0].material;
	vec3 pointLightPosition = (lightBoxes[0].minCorner + lightBoxes[0].maxCorner) * 0.5;
	vec3 directionToSunlight = normalize(vec3(-1, 1, 0.5));
	float sunlightPower = 4.0;
	vec3 sunlightColor = vec3(1.0, 1.0, 1.0) * sunlightPower;
	vec3 lightColor = pointLightMaterial.color; // or sunlightColor
	vec3 accumulatedColor = vec3(0); // this will hold the final raytraced color for this pixel
        vec3 rayColorMask = vec3(1); // all rays start out un-tinted pure white (vec3(1)) - no color tinting, yet
	vec3 reflectionRayOrigin, reflectionRayDirection; // these rays will be used to capture surface reflections from the surrounding environment
	vec3 reflectionRayColorMask;
        vec3 geometryNormal, shadingNormal;
	vec3 intersectionPoint;
	vec3 directionToLight;
	vec3 ambientContribution = vec3(0);
	vec3 diffuseContribution = vec3(0);
	vec3 specularContribution = vec3(0);
	vec3 textureColor;
	// go ahead and get the skyColor for our camera ray - we'll use it if the ray misses everything, 
	vec3 initialSkyColor = getSkyColor();
	vec3 skyColor;

	float t = INFINITY;
	float initial_t = INFINITY;
	float ambientIntensity = 0.15;
	float diffuseIntensity;
	float fogStart;
	float reflectance, transmittance;
	float IoR_ratio;
	float transparentThickness;

	int isShadowRay = FALSE;
	int willNeedReflectionRay = FALSE;
	int sceneUsesDirectionalLight = FALSE;
	int previousIntersectionMaterialType;
	intersectionMaterial.type = -100;

	// For the kind of ray tracing we're doing, 7 or 8 bounces is enough to do all the reflections and refractions that are most noticeable.
	// You might be able to get away with 5/6 bounces if on a mobile budget, or crank it up to 9/10 bounces if your scene has a bunch of mirrors or glass objects.

	for (int bounces = 0; bounces < 6; bounces++)
	{
		previousIntersectionMaterialType = intersectionMaterial.type;

		// the following tests for intersections with the entire scene, then reports back the closest object (min t value)
		t = SceneIntersect( isShadowRay, sceneUsesDirectionalLight );
		// on the 1st bounce only, record the initial t value - will be used later when applying fog/atmosphere blending
		initial_t = bounces == 0 ? t : initial_t;

		if (t == INFINITY) // ray has missed all objects and hit the background sky
		{
			if (bounces == 0) // if this is the initial camera ray, just draw the sky and exit
			{
				accumulatedColor = initialSkyColor;
				break;
			}
			if (isShadowRay == TRUE) // the shadow ray was successful, so we know we can see the light from the surface where the shadow ray
			{			//  emerged from - therefore, the direct diffuse lighting and specular lighting can be added to that surface.
				accumulatedColor += diffuseContribution; // diffuse direct lighting
				accumulatedColor += specularContribution; // bright specular highlights
			}
			// else this is a reflection/refraction ray that has hit the background sky
			else
			{
				accumulatedColor += rayColorMask * initialSkyColor;
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

		
		if (intersectionMaterial.type == POINT_LIGHT)
		{	
			if (bounces == 0) // if this is the initial camera ray, set it to the light's color and exit 
			{
				accumulatedColor = clamp(lightColor, 0.0, 4.0);
				break;
			}	
				
			if (isShadowRay == TRUE) // the shadow ray was successful, so we know we can see the light from the surface where the shadow ray
			{			//  emerged from - therefore, the direct diffuse lighting and specular lighting can be added to that surface.
				accumulatedColor += diffuseContribution; // diffuse direct lighting
				accumulatedColor += specularContribution; // bright specular highlights
			}
			else
			{
				accumulatedColor += rayColorMask * clamp(lightColor, 0.0, 2.0);
			}
			// if the shadow ray that reached the light source was from a ClearCoat Diffuse object, after adding its diffuse color and specular highlights (above),
			// we need to rewind back to the surface and then follow the reflection ray path, in order to gather the mirror reflections on the shiny clearcoat.
			if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;
				willNeedReflectionRay = FALSE;
				isShadowRay = FALSE;
				continue;
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
		directionToLight = (sceneUsesDirectionalLight == TRUE) ? directionToSunlight : normalize(pointLightPosition - intersectionPoint);


		if (intersectionMaterial.isCheckered == TRUE)
		{
			intersectionMaterial.color = mod(floor(intersectionUV.x) + floor(intersectionUV.y), 2.0) == 0.0 ? intersectionMaterial.color : intersectionMaterial.color2;
		}
		
		
		/* if (intersectionMaterial.type == PHONG)
                {
			// Phong's original lighting model consists of 3 components - Ambient, Diffuse, and Specular contributions.
			// Ambient is an old 'hack' to cheaply simulate the effect of soft, diffuse bounce lighting (Global Illumination)
			ambientContribution = doAmbientLighting(rayColorMask, ambientIntensity, intersectionMaterial);
			accumulatedColor += ambientContribution; // on diffuse surfaces (including Phong materials), ambient is always present no matter what, so go ahead and add it to the final accumColor now

			// Diffuse is the typical Lambertian lighting (NdotL) that arrives directly from the light source - this gives non-metallic surfaces their color & gradient shading
			diffuseContribution = doDiffuseDirectLighting(rayColorMask, shadingNormal, directionToLight, lightColor, intersectionMaterial, diffuseIntensity);
			//diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(pointLightPosition, intersectionPoint));
			
			// Specular is the bright highlight on shiny surfaces, resulting from a direct reflection of the light source itself
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, rayDirection, shadingNormal, directionToLight, lightColor, intersectionMaterial, diffuseIntensity);
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
                } */

		if (intersectionMaterial.type == CLEARCOAT)
		{
			// the following will decrease the IndexOfRefracton, or IoR(shininess) of the clear coating as the roughness increases 
			intersectionMaterial.IoR = mix(1.0, intersectionMaterial.IoR, clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0)); // as roughness increases, the IndexOfRefraction(shininess/brightness) decreases
			// reflectance (range: 0-1), given by the Fresnel equations, will tell us what fraction of the light is reflected(reflectance), vs. what fraction is refracted(transmittance)
			reflectance = calcFresnelReflectance(rayDirection, shadingNormal, 1.0, intersectionMaterial.IoR, IoR_ratio); // the fraction of light that is reflected,
			transmittance = 1.0 - reflectance; // and the fraction of light that is transmitted

			ambientContribution = doAmbientLighting(rayColorMask, ambientIntensity, intersectionMaterial);
			accumulatedColor += ambientContribution; // on diffuse surfaces (underneath the clearcoat), ambient is always present no matter what, so go ahead and add it to the final accumColor now
			
			diffuseContribution = doDiffuseDirectLighting(rayColorMask, shadingNormal, directionToLight, lightColor, intersectionMaterial, diffuseIntensity);
			//diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(pointLightPosition, intersectionPoint));
			diffuseContribution *= max(0.1, transmittance); // the diffuse reflections from the surface are transmitted through the ClearCoat material, so we must weight them accordingly
			
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, rayDirection, shadingNormal, directionToLight, lightColor, intersectionMaterial, diffuseIntensity);

			// If this ClearCoat type of material is either the first thing that the camera ray encounters (bounces == 0), or the 2nd thing the ray encounters after reflecting from METAL (bounces == 1),
			// then setup and save a reflection ray for later use. After we've done that, first we'll send out the usual shadow ray to see if the Diffuse and Specular contributions can be added. Then once the shadow ray 
			// is done testing for light visibility, we'll rewind back to this surface and send out the saved reflection ray on its own trajectory, in order to capture reflections of the environment. 
			if (bounces == 0 || (bounces == 1 && previousIntersectionMaterialType == METAL))
			{
				willNeedReflectionRay = TRUE; // this flag will let the future code know that it needs to rewind time and trace the saved reflection ray
				reflectionRayColorMask = rayColorMask * reflectance * clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0); // weight reflected ray with reflectance value we got
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

		if (intersectionMaterial.type == TRANSPARENT)
		{
			reflectance = calcFresnelReflectance(rayDirection, geometryNormal, 1.0, intersectionMaterial.IoR, IoR_ratio);
			transmittance = 1.0 - reflectance;
			// Ideal Transparent materials (like glass, water, clear plastic, etc.) are purely specular with no diffuse component.
			// Therefore, the Ambient (global bounced diffuse) and Diffuse (direct diffuse from light source) contributions are skipped.
			// ambientContribution = NA
			// diffuseContribution = NA
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, rayDirection, shadingNormal, directionToLight, lightColor, intersectionMaterial, 1.0);
			// shadow rays are only test rays and must not contribute any lighting of their own.
			// So if the current ray is a shadow ray (isShadowRay == TRUE), then we shut off the specular highlights.
			specularContribution = (isShadowRay == TRUE) ? vec3(0) : specularContribution;
			accumulatedColor += specularContribution; // ideally we would send a new shadow ray to see if this surface can actually see the light, but to minimize complexity/time, we just add specular highlight now

			// If this Transparent type of material is either the first thing the camera ray encounters (bounces == 0) or the 2nd thing the ray encounters after reflecting from METAL (bounces == 1) then setup 
			// and save a reflection ray for later use. After we've done that, first we'll send out the refracted ray (transmitted ray) to find what parts of the scene we can see through the material. Then once the 
			// refraction(transmitted) ray is done with its work, we'll send out the saved reflection ray on its own trajectory, in order to capture reflections of the surrounding environment. 
			// In the end, this will give us the photo-realistic double image (reflected portion & refracted portion) that we see on real-life transparent materials like glass, windows, water, plastic, etc.
			if (bounces == 0 || (bounces == 1 && previousIntersectionMaterialType == METAL))
			{
				willNeedReflectionRay = TRUE;
				reflectionRayColorMask = rayColorMask * reflectance * clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0);
				reflectionRayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				reflectionRayDirection = reflect(rayDirection, shadingNormal);
			}
			if (reflectance == 1.0 && isShadowRay == FALSE) // total internal reflection occured - all light is mirror reflection only, because refraction/transmittance is physically impossible for this viewing angle
			{
				rayColorMask = rayColorMask * reflectance * clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0); // weight reflected ray with reflectance value we got
				rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				rayDirection = reflect(rayDirection, shadingNormal);

				willNeedReflectionRay = FALSE;
				continue; // abandon transmitted ray(below) and go ahead and trace reflection ray now
			}

			// This part of the code handles the transmitted(refracted) portion of the Transparent surface
			
			rayColorMask *= intersectionMaterial.color;
			// the refraction through the surface only accounts for the portion of light that is transmitted, so we must weight it accordingly (Reflectance vs. Transmittance)
			rayColorMask *= transmittance;
			rayColorMask *= clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0); // inverse relationship: as roughness increases, refraction(transmission) brightness decreases

			if (isShadowRay == FALSE) // do usual refraction - this is the case most often
			{
				// note the minus(-) sign below, which nudges the rayOrigin below the surface along the normal, instead of above it (like for the usual bounced reflections) 
				rayOrigin = intersectionPoint - (uEPS_intersect * shadingNormal); // nudge transmitted rayOrigin below the surface to avoid self-intersection
				rayDirection = refract(rayDirection, shadingNormal, IoR_ratio); // ray is now refracted through the material, according to Snell's Law
			}
			else // special case: shadow rays are allowed to penetrate transparent surfaces un-refracted, in order to generate 'shadow' caustics (a clever technique found in the Hall Lighting Model)
			{
				diffuseContribution *= intersectionMaterial.color; // color future-generated caustics with the transparent material color
				diffuseContribution *= max(0.2, transmittance); // the light that generates the caustics only accounts for the transmitted portion, so weight it accordingly
				diffuseContribution *= clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0); // inverse relationship: as roughness increases, caustics brightness decreases
				rayOrigin = intersectionPoint + (uEPS_intersect * rayDirection); // nudge the caustics rayOrigin through the surface along the same rayDirection to avoid self-intersection
				rayDirection = rayDirection; // ray direction is unchanged - the caustics ray is allowed to pass through (un-refracted)
			}
			
			continue; // continue ray tracing next with the refracted(or transmitted) ray
		}
		
	} // end for (int bounces = 0; bounces < 6; bounces++)
	

	return max(vec3(0), accumulatedColor);

}  // end vec3 RayTrace()


//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
	float pointLightPower = 1.0;
	Material pointLightMaterial = Material(POINT_LIGHT, FALSE, vec3(1.0, 1.0, 1.0) * pointLightPower, vec3(0), 0.0, 0.0, -1 );
	Material whiteMaterial = Material(CLEARCOAT, FALSE, vec3(0.7, 0.7, 0.7), vec3(0), 0.0, 1.4, -1 );
	Material blueMaterial = Material(CLEARCOAT, FALSE, vec3(0.2, 0.5, 0.7), vec3(0), 0.0, 1.4, -1 );
	Material redMaterial = Material(CLEARCOAT, FALSE, vec3(0.7, 0.1, 0.1), vec3(0), 0.0, 1.4, -1 );
	Material purpleMaterial = Material(CLEARCOAT, FALSE, vec3(0.3, 0.3, 0.5), vec3(0), 0.0, 1.4, -1 );
	Material glassMaterial = Material(TRANSPARENT, FALSE, vec3(0.4, 0.5, 0.6), vec3(0), 0.1, 1.5, -1 );
	
	lightBoxes[0] = Box(uLightPosition - vec3(1), uLightPosition + vec3(1), vec2(1, 1), pointLightMaterial);

	boxes[0] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[1] = UnitBox(vec2(1, 1), blueMaterial);
	boxes[2] = UnitBox(vec2(1, 1), redMaterial);
	boxes[3] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[4] = UnitBox(vec2(1, 1), purpleMaterial);
	boxes[5] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[6] = UnitBox(vec2(1, 1), blueMaterial);
	boxes[7] = UnitBox(vec2(1, 1), redMaterial);
	boxes[8] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[9] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[10] = UnitBox(vec2(1, 1), blueMaterial);
	boxes[11] = UnitBox(vec2(1, 1), redMaterial);
	boxes[12] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[13] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[14] = UnitBox(vec2(1, 1), purpleMaterial);
	boxes[15] = UnitBox(vec2(1, 1), whiteMaterial);
	boxes[16] = UnitBox(vec2(1, 1), whiteMaterial);
	
	spheres[0] = UnitSphere(vec2(2, 1), glassMaterial);
}


#include <raytracing_main>
