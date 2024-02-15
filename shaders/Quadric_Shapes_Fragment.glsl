precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform sampler2D uUVGridTexture;
uniform mat4 uRectangleInvMatrix;
uniform mat4 uDiskInvMatrix;
uniform mat4 uBoxInvMatrix;
uniform mat4 uWedgeInvMatrix;
uniform mat4 uDiffuseSphereInvMatrix;
uniform mat4 uMetalSphereInvMatrix;
uniform mat4 uCoatSphereInvMatrix;
uniform mat4 uGlassSphereInvMatrix;
uniform mat4 uCylinderInvMatrix;
uniform mat4 uCappedCylinderInvMatrix;
uniform mat4 uConeInvMatrix;
uniform mat4 uCappedConeInvMatrix;
uniform mat4 uParaboloidInvMatrix;
uniform mat4 uCappedParaboloidInvMatrix;
uniform mat4 uHyperboloidInvMatrix;
uniform mat4 uHyperbolicParaboloidInvMatrix;
uniform mat4 uCapsuleInvMatrix;


#define N_RECTANGLES 1
#define N_DISKS 1
#define N_BOXES 1
#define N_WEDGES 1
#define N_SPHERES 4
#define N_CYLINDERS 1
#define N_CAPPED_CYLINDERS 1
#define N_CONES 1
#define N_CAPPED_CONES 1
#define N_PARABOLOIDS 1
#define N_CAPPED_PARABOLOIDS 1
#define N_HYPERBOLOIDS 1
#define N_HYPERBOLIC_PARABOLOIDS 1
#define N_CAPSULES 1

vec3 rayOrigin, rayDirection;

struct Material { int type; int isCheckered; vec3 color; vec3 color2; float roughness; float IoR; int textureID; };
struct UnitRectangle { vec2 uvScale; Material material; };
struct UnitDisk { vec2 uvScale; Material material; };
struct UnitBox { vec2 uvScale; Material material; };
struct UnitWedge { vec2 uvScale; Material material; };
struct UnitSphere { vec2 uvScale; Material material; };
struct UnitCylinder { vec2 uvScale; Material material; };
struct UnitCappedCylinder { vec2 uvScale; Material material; };
struct UnitCone { vec2 uvScale; Material material; };
struct UnitCappedCone { vec2 uvScale; Material material; };
struct UnitParaboloid { vec2 uvScale; Material material; };
struct UnitCappedParaboloid { vec2 uvScale; Material material; };
struct UnitHyperboloid { vec2 uvScale; Material material; };
struct UnitHyperbolicParaboloid { vec2 uvScale; Material material; };
struct UnitCapsule { vec2 uvScale; Material material; };

// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;
int intersectionShapeIsClosed;
Material intersectionMaterial;

UnitRectangle rectangles[N_RECTANGLES];
UnitDisk disks[N_DISKS];
UnitBox boxes[N_BOXES];
UnitWedge wedges[N_WEDGES];
UnitSphere spheres[N_SPHERES];
UnitCylinder cylinders[N_CYLINDERS];
UnitCappedCylinder cappedCylinders[N_CAPPED_CYLINDERS];
UnitCone cones[N_CONES];
UnitCappedCone cappedCones[N_CAPPED_CONES];
UnitParaboloid paraboloids[N_PARABOLOIDS];
UnitCappedParaboloid cappedParaboloids[N_CAPPED_PARABOLOIDS];
UnitHyperboloid hyperboloids[N_HYPERBOLOIDS];
UnitHyperbolicParaboloid hyperbolicParaboloids[N_HYPERBOLIC_PARABOLOIDS];
UnitCapsule capsules[N_CAPSULES];


#include <raytracing_core_functions>

#include <raytracing_unit_rectangle_intersect>

#include <raytracing_unit_disk_intersect>

#include <raytracing_unit_box_intersect>

#include <raytracing_unit_triangular_wedge_intersect>

#include <raytracing_unit_sphere_intersect>

#include <raytracing_unit_cylinder_intersect>

#include <raytracing_unit_capped_cylinder_intersect>

#include <raytracing_unit_cone_intersect>

#include <raytracing_unit_capped_cone_intersect>

#include <raytracing_unit_paraboloid_intersect>

#include <raytracing_unit_capped_paraboloid_intersect>

#include <raytracing_unit_hyperboloid_intersect>

#include <raytracing_unit_hyperbolic_paraboloid_intersect>

#include <raytracing_unit_capsule_intersect>



//---------------------------------------------------------------------------------------
float SceneIntersect( int isShadowRay, int sceneUsesDirectionalLight )
//---------------------------------------------------------------------------------------
{
	
	vec3 rObjOrigin, rObjDirection; 
	vec3 intersectionPoint, normal;
        float d;
	float t = INFINITY;
	float u, v;
	//int isRayExiting = FALSE;
/* 
	// When shadow rays are trying to intersect a small point light source, a tiny box makes a better shape to try and hit
	// than a tiny sphere (due to floating-point precision error, some rays will hit while others will miss the small sphere from far away).  
	// Viewers will still see a tiny sphere representing the point light, but shadow rays will instead "see" a tiny box in the same spot.
	if (isShadowRay == TRUE && sceneUsesDirectionalLight == FALSE)
	{
		d = BoxIntersect( boxes[0].minCorner, boxes[0].maxCorner, rayOrigin, rayDirection, normal, isRayExiting );
		if (d < t)
		{
			t = d;
			//intersectionNormal = normal;
			intersectionMaterial = boxes[0].material;
		}
	}
 */
	// transform ray into Unit Rectangle's object space
	rObjOrigin = vec3( uRectangleInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uRectangleInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitRectangleIntersect( rObjOrigin, rObjDirection, u, v );
	if (d < t)
	{
		t = d;
		// for the untransformed unit rectangle, its normal is vec3(0,0,1), which points straight towards our camera  
		normal = vec3(0,0,1);
		intersectionNormal = transpose(mat3(uRectangleInvMatrix)) * normal;
		intersectionMaterial = rectangles[0].material;
		intersectionUV = vec2(u, v) * rectangles[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}

	// transform ray into Unit Disk's object space
	rObjOrigin = vec3( uDiskInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uDiskInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitDiskIntersect( rObjOrigin, rObjDirection, u, v );
	if (d < t)
	{
		t = d;
		// for the untransformed unit disk, its normal is vec3(0,0,1), which points straight towards our camera  
		normal = vec3(0,0,1);
		intersectionNormal = transpose(mat3(uDiskInvMatrix)) * normal;
		intersectionMaterial = disks[0].material;
		intersectionUV = vec2(u, v) * disks[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}


	// transform ray into Diffuse Unit Sphere's object space
	rObjOrigin = vec3( uDiffuseSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uDiffuseSphereInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitSphereIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uDiffuseSphereInvMatrix)) * normal;
		intersectionMaterial = spheres[0].material;
		intersectionUV = calcUnitSphereUV(intersectionPoint) * spheres[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	// transform ray into Metal Unit Sphere's object space
	rObjOrigin = vec3( uMetalSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uMetalSphereInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitSphereIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uMetalSphereInvMatrix)) * normal;
		intersectionMaterial = spheres[1].material;
		intersectionUV = calcUnitSphereUV(intersectionPoint) * spheres[1].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	// transform ray into ClearCoat Unit Sphere's object space
	rObjOrigin = vec3( uCoatSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCoatSphereInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitSphereIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uCoatSphereInvMatrix)) * normal;
		intersectionMaterial = spheres[2].material;
		intersectionUV = calcUnitSphereUV(intersectionPoint) * spheres[2].uvScale;
		intersectionShapeIsClosed = TRUE;
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
		intersectionMaterial = spheres[3].material;
		intersectionUV = calcUnitSphereUV(intersectionPoint) * spheres[3].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	// transform ray into Unit Cylinder's object space
	rObjOrigin = vec3( uCylinderInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCylinderInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitCylinderIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uCylinderInvMatrix)) * normal;
		intersectionMaterial = cylinders[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * cylinders[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}

	// transform ray into Unit Capped Cylinder's object space
	rObjOrigin = vec3( uCappedCylinderInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCappedCylinderInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitCappedCylinderIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uCappedCylinderInvMatrix)) * normal;
		intersectionMaterial = cappedCylinders[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * cappedCylinders[0].uvScale;
		if (abs(normal) == vec3(0,1,0))
		{
			vec3 cappedCylinderScale = vec3(1.5, 3, 1.5);
			intersectionUV.x = intersectionPoint.x * cappedCylinderScale.x;
			intersectionUV.y = intersectionPoint.z * cappedCylinderScale.z;
		}
		intersectionShapeIsClosed = TRUE;
	}

	// transform ray into Unit Cone's object space
	rObjOrigin = vec3( uConeInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uConeInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitConeIntersect(0.0, rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uConeInvMatrix)) * normal;
		intersectionMaterial = cones[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * cones[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}

	// transform ray into Unit Capped Cone's object space
	rObjOrigin = vec3( uCappedConeInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCappedConeInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitCappedConeIntersect(0.5, rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uCappedConeInvMatrix)) * normal;
		intersectionMaterial = cappedCones[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * cappedCones[0].uvScale;
		if (abs(normal) == vec3(0,1,0))
		{
			vec3 cappedConeScale = vec3(2, 2, 2);
			intersectionUV.x = intersectionPoint.x * cappedConeScale.x;
			intersectionUV.y = intersectionPoint.z * cappedConeScale.z;
		}
		intersectionShapeIsClosed = TRUE;
	}

	// transform ray into Unit Paraboloid's object space
	rObjOrigin = vec3( uParaboloidInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uParaboloidInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitParaboloidIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uParaboloidInvMatrix)) * normal;
		intersectionMaterial = paraboloids[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * paraboloids[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}

	// transform ray into Unit Capped Paraboloid's object space
	rObjOrigin = vec3( uCappedParaboloidInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCappedParaboloidInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitCappedParaboloidIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uCappedParaboloidInvMatrix)) * normal;
		intersectionMaterial = cappedParaboloids[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * cappedParaboloids[0].uvScale;
		if (abs(normal) == vec3(0,1,0))
		{
			vec3 cappedParaboloidScale = vec3(2, 2, 2);
			intersectionUV.x = intersectionPoint.x * cappedParaboloidScale.x;
			intersectionUV.y = intersectionPoint.z * cappedParaboloidScale.z;
		}
		intersectionShapeIsClosed = TRUE;
	}

	// transform ray into Unit Hyperboloid's object space
	rObjOrigin = vec3( uHyperboloidInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uHyperboloidInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitHyperboloidIntersect(rObjOrigin, rObjDirection, 0.5, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uHyperboloidInvMatrix)) * normal;
		intersectionMaterial = hyperboloids[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * hyperboloids[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}

	// transform ray into Unit Hyperbolic Paraboloid's object space
	rObjOrigin = vec3( uHyperbolicParaboloidInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uHyperbolicParaboloidInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitHyperbolicParaboloidIntersect(rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uHyperbolicParaboloidInvMatrix)) * normal;
		intersectionMaterial = hyperbolicParaboloids[0].material;
		intersectionUV = vec2(intersectionPoint.x, intersectionPoint.z) * hyperbolicParaboloids[0].uvScale;
		intersectionShapeIsClosed = FALSE;
	}

	// transform ray into Unit Capsule's object space
	rObjOrigin = vec3( uCapsuleInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCapsuleInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitCapsuleIntersect(1.0, rObjOrigin, rObjDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection);
		intersectionNormal = transpose(mat3(uCapsuleInvMatrix)) * normal;
		intersectionMaterial = capsules[0].material;
		intersectionUV = calcUnitCylinderUV(intersectionPoint) * capsules[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}


	// transform ray into Unit Box's object space
	rObjOrigin = vec3( uBoxInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitBoxIntersect( rObjOrigin, rObjDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		vec3 boxScale = vec3(4,4,8);
		// start out with default Z normal of (0,0,-1) or (0,0,+1)
		normal = vec3(0, 0, intersectionPoint.z);
		if (abs(intersectionPoint.x) > abs(intersectionPoint.y) && abs(intersectionPoint.x) >= abs(intersectionPoint.z))
			normal = vec3(intersectionPoint.x, 0, 0);	
		else if (abs(intersectionPoint.y) > abs(intersectionPoint.x) && abs(intersectionPoint.y) >= abs(intersectionPoint.z))
			normal = vec3(0, intersectionPoint.y, 0);
			
		intersectionNormal = transpose(mat3(uBoxInvMatrix)) * normal;
		intersectionMaterial = boxes[0].material;
		intersectionUV = calcUnitBoxUV(intersectionPoint, normal, boxScale) * boxes[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}


	// transform ray into Unit Triangular Wedge's object space
	rObjOrigin = vec3( uWedgeInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uWedgeInvMatrix * vec4(rayDirection, 0.0) );
	d = UnitTriangularWedgeIntersect( rObjOrigin, rObjDirection, normal );
	if (d < t)
	{
		t = d;
		intersectionPoint = rObjOrigin + (t * rObjDirection); // intersection in box's object space, vec3(-1,-1,-1) to vec3(+1,+1,+1)
		vec3 wedgeScale = vec3(4,4,4);	
		intersectionNormal = transpose(mat3(uWedgeInvMatrix)) * normal;
		intersectionMaterial = wedges[0].material;

		     if (normal.x > 0.0) 
			intersectionUV = (vec2(-intersectionPoint.z, -intersectionPoint.y * 1.5) * 0.5 + 0.5) * vec2(wedgeScale.z, wedgeScale.y);
		else if (normal.z > 0.0)
			intersectionUV = (vec2( intersectionPoint.x, -intersectionPoint.y) * 0.5 + 0.5) * vec2(wedgeScale.x, wedgeScale.y);
		else if (normal.z < 0.0) 
			intersectionUV = (vec2(-intersectionPoint.x, -intersectionPoint.y) * 0.5 + 0.5) * vec2(wedgeScale.x, wedgeScale.y);
		else if (normal.y < 0.0) 
			intersectionUV = (vec2( intersectionPoint.x, -intersectionPoint.z) * 0.5 + 0.5) * vec2(wedgeScale.x, wedgeScale.z);
		else // (normal.x < 0.0)
			intersectionUV = (vec2( intersectionPoint.z, -intersectionPoint.y) * 0.5 + 0.5) * vec2(wedgeScale.z, wedgeScale.y);

		intersectionUV *= wedges[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}


	return t;
} // end float SceneIntersect( )


vec3 getSkyColor(vec3 rayDir, vec3 directionToSunlight)
{
	vec3 skyColor = mix(vec3(0.4, 0.7, 1.0) * 2.0, vec3(0.7) * 2.0, clamp(exp(rayDir.y * -8.0), 0.0, 1.0));
	vec3 sunColor = vec3(1.0, 1.0, 1.0) * 8.0;

	return mix( skyColor, sunColor, pow(max(0.0, dot(rayDir, directionToSunlight)), 150.0) );
}


//-------------------------------------------------------------------------------------------
vec3 RayTrace()
//-------------------------------------------------------------------------------------------
{
	// the following 2 variables are just placeholders in this directional light-only scene, so that the 'bounces' code loop below will still work 
	vec3 pointLightPosition; // placeholder in this scene with no pointLights
	Material pointLightMaterial; // placeholder in this scene with no pointLights
	vec3 directionToSunlight = normalize(vec3(-1, 1, 0.5));
	float sunlightPower = 4.0;
	vec3 sunlightColor = vec3(1.0, 1.0, 1.0) * sunlightPower;
	vec3 lightColor = sunlightColor;//pointLightMaterial.color;
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
	// and also for final blending of raytraced objects with fog/atmosphere in the distance.
	vec3 initialSkyColor = getSkyColor(rayDirection, directionToSunlight);
	vec3 skyColor;

	float t = INFINITY;
	float initial_t = INFINITY;
	float ambientIntensity = 0.2;
	float diffuseIntensity;
	float fogStart;
	float reflectance, transmittance;
	float IoR_ratio;
	float transparentThickness;

	int isShadowRay = FALSE;
	int willNeedReflectionRay = FALSE;
	int sceneUsesDirectionalLight = TRUE;
	int previousIntersectionMaterialType;
	intersectionMaterial.type = -100;

	// For the kind of ray tracing we're doing, 7 or 8 bounces is enough to do all the reflections and refractions that are most noticeable.
	// You might be able to get away with 5/6 bounces if on a mobile budget, or crank it up to 9/10 bounces if your scene has a bunch of mirrors or glass objects.

	for (int bounces = 0; bounces < 8; bounces++)
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
				skyColor = getSkyColor(rayDirection, directionToSunlight); // must get a fresh skyColor value, because the reflected ray is pointing in different direction
				accumulatedColor += rayColorMask * skyColor;
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
				accumulatedColor = clamp(pointLightMaterial.color, 0.0, 4.0);
				break;
			}	
				
			if (isShadowRay == TRUE) // the shadow ray was successful, so we know we can see the light from the surface where the shadow ray
			{			//  emerged from - therefore, the direct diffuse lighting and specular lighting can be added to that surface.
				accumulatedColor += diffuseContribution; // diffuse direct lighting
				accumulatedColor += specularContribution; // bright specular highlights
			}
			else
			{
				accumulatedColor += rayColorMask * clamp(pointLightMaterial.color, 0.0, 2.0);
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
		// if the intersection material has a valid texture ID (> -1), go ahead and sample the texture at the hit material's UV coordinates
		if (intersectionMaterial.textureID > -1)
		{
			textureColor = texture(uUVGridTexture, intersectionUV).rgb;
			textureColor *= textureColor; // remove image gamma by raising texture color to the power of 2.2 (but squaring is close enough and cheaper)
			intersectionMaterial.color *= textureColor; // now that the texture color is in linear space, we can do simple math with it, like multiplying and adding
		}

		
                if (intersectionMaterial.type == PHONG)
                {
			// Phong's original lighting model consists of 3 components - Ambient, Diffuse, and Specular contributions.
			// Ambient is an old 'hack' to cheaply simulate the effect of soft, diffuse bounce lighting (Global Illumination)
			ambientContribution = doAmbientLighting(rayColorMask, ambientIntensity, intersectionMaterial);
			accumulatedColor += ambientContribution; // on diffuse surfaces (including Phong materials), ambient is always present no matter what, so go ahead and add it to the final accumColor now
			
			// Diffuse is the typical Lambertian lighting (NdotL) that arrives directly from the light source - this gives non-metallic surfaces their color & gradient shading
			diffuseContribution = doDiffuseDirectLighting(rayColorMask, shadingNormal, directionToLight, lightColor, intersectionMaterial, diffuseIntensity);
			diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(pointLightPosition, intersectionPoint));

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
                }
		
                if (intersectionMaterial.type == METAL)
		{
			// tint ray color with metal color
			rayColorMask *= intersectionMaterial.color;

			// Metals are purely specular with no diffuse component.
			// Therefore, the Ambient (global bounced diffuse) and Diffuse (direct diffuse from light source) contributions are skipped.
			// ambientContribution = NA
			// diffuseContribution = NA
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, rayDirection, shadingNormal, directionToLight, lightColor, intersectionMaterial, 1.0);
			// we could technically do a shadow ray test (to see if the light is visible), but in the interest of speed, we go ahead and add the Specular contribution.
			accumulatedColor += specularContribution;

			// now spawn a reflection ray to see the parts of the scene that are visible in the mirror-like reflection
			rayColorMask *= clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0); // inverse relationship: as roughness increases, reflection brightness decreases
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the new rayOrigin out from the surface to avoid self-intersection
			rayDirection = reflect(rayDirection, shadingNormal);
			continue; // continue ray tracing next with the mirror-reflection ray
		}

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
			diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(pointLightPosition, intersectionPoint));
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
			if (intersectionShapeIsClosed == FALSE)
				rayColorMask *= intersectionMaterial.color;
			// Is ray leaving a solid object from the inside? If so, attenuate ray color with object color by how far ray has travelled through the object's interior
			else if (distance(geometryNormal, shadingNormal) > 0.1) // this happens when trying to exit a glass sphere from the inside - geometryNormal and shadingNormal do not match
			{
				transparentThickness = 0.2;
				// the following uses Beer's Law to attenuate the light energy (brightness and color saturation) by how far the light ray had to travel through the transparent material.
				// If the material is very thin, like thin glass or a shallow puddle of colored water, the transmitted light will still be bright, but will not pick up very much of the transparent material's color.
				// As the material gets thicker, like thick glass or a deep pool of colored water, the transmitted light will lose more energy(darker) and will take on much more of the transparent material's color.
				rayColorMask *= exp( log(clamp(intersectionMaterial.color, 0.01, 0.99)) * transparentThickness * t ); // Use Beer's Law to attenuate light based on how far the ray traveled through the medium
			}
			
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
	
	/*
	// fog/atmospheric blending is not used in this demo
	if (initial_t < INFINITY)
	{
		fogStart = 50.0;
		initial_t -= fogStart; // this makes the fog start a little farther away from the camera
		// the following is the standard blending of objects with fog/atmosphere as they recede into the distance, using Beer's Law
		accumulatedColor = mix(initialSkyColor, accumulatedColor, clamp(exp(-initial_t * 0.005), 0.0, 1.0));
	}
	*/
		

	return max(vec3(0), accumulatedColor);

}  // end vec3 RayTrace()


//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
	// rgb values for common metals
	// Gold: (1.000, 0.766, 0.336) / Aluminum: (0.913, 0.921, 0.925) / Copper: (0.955, 0.637, 0.538) / Silver: (0.972, 0.960, 0.915)
	
	Material uvGridMaterial = Material(CLEARCOAT, FALSE, vec3(1.0, 1.0, 1.0), vec3(0.0, 0.0, 0.0), 0.0, 1.3, 0 );
	Material redMaterial = Material(PHONG, FALSE, vec3(0.7, 0.01, 0.01), vec3(0.0, 0.0, 0.0), 1.0, 0.0, -1 );
	Material metalMaterial = Material(METAL, FALSE, vec3(0.955, 0.637, 0.538), vec3(0.913, 0.921, 0.925), 0.0, 0.0, -1 );
	Material glassMaterial = Material(TRANSPARENT, FALSE, vec3(0.4, 1.0, 0.6), vec3(0.0, 0.0, 0.0), 0.0, 1.5, -1 );
	Material grayBlackCheckerMaterial = Material(CLEARCOAT, TRUE, vec3(0.5), vec3(0.001, 0.001, 0.001), 0.0, 1.4, -1 );
	Material whiteRedCheckerMaterial = Material(CLEARCOAT, TRUE, vec3(0.8), vec3(0.5, 0.01, 0.01), 0.0, 1.4, -1 );
	
	rectangles[0] = UnitRectangle(vec2(300, 300), grayBlackCheckerMaterial);
	disks[0] = UnitDisk(vec2(1, 1), uvGridMaterial);
	boxes[0] = UnitBox(vec2(1, 1), whiteRedCheckerMaterial);
	wedges[0] = UnitWedge(vec2(1, 1), whiteRedCheckerMaterial);

	spheres[0] = UnitSphere(vec2(2, 1), redMaterial);
	spheres[1] = UnitSphere(vec2(2, 1), metalMaterial);
	spheres[2] = UnitSphere(vec2(2, 1), uvGridMaterial);
	spheres[3] = UnitSphere(vec2(2, 1), glassMaterial);

	cylinders[0] = UnitCylinder(vec2(2, 1), uvGridMaterial);
	///cylinders[0].material.IoR = 1.3; // decrease the shininess just a bit
	cappedCylinders[0] = UnitCappedCylinder(vec2(8, 5), whiteRedCheckerMaterial);
	cones[0] = UnitCone(vec2(8, 5), whiteRedCheckerMaterial);
	cappedCones[0] = UnitCappedCone(vec2(8, 5), whiteRedCheckerMaterial);
	paraboloids[0] = UnitParaboloid(vec2(8, 5), whiteRedCheckerMaterial);
	cappedParaboloids[0] = UnitCappedParaboloid(vec2(8, 5), whiteRedCheckerMaterial);
	hyperboloids[0] = UnitHyperboloid(vec2(8, 6), whiteRedCheckerMaterial);
	hyperbolicParaboloids[0] = UnitHyperbolicParaboloid(vec2(4, 4), whiteRedCheckerMaterial);
	capsules[0] = UnitCapsule(vec2(8, 3), whiteRedCheckerMaterial);
}


#include <raytracing_main>
