precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform sampler2D uUVGridTexture;
uniform float uRoughness;
uniform float uMetalness;

#define N_BOXES 1
#define N_SPHERES 5
#define N_RECTANGLES 1

vec3 rayOrigin, rayDirection;
// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;
int intersectionShapeIsClosed;

struct Material { int type; int isCheckered; vec3 color; vec3 color2; float metalness; float roughness; float IoR; int textureID; };
struct Rectangle { vec3 position; vec3 normal; vec3 vectorU; vec3 vectorV; float radiusU; float radiusV; vec2 uvScale; Material material; };
struct Box { vec3 minCorner; vec3 maxCorner; vec2 uvScale; Material material; };
struct Sphere { float radius; vec3 position; vec2 uvScale; Material material; };

Material intersectionMaterial;
Rectangle rectangles[N_RECTANGLES];
Box boxes[N_BOXES];
Sphere spheres[N_SPHERES];


#include <raytracing_core_functions>

#include <raytracing_rectangle_intersect>

#include <raytracing_box_intersect>

#include <raytracing_sphere_intersect>


//---------------------------------------------------------------------------------------
float SceneIntersect( int isShadowRay )
//---------------------------------------------------------------------------------------
{
	
	vec3 rObjOrigin, rObjDirection; 
	vec3 intersectionPoint, normal;
        float d;
	float t = INFINITY;
	float u, v;
	int isRayExiting = FALSE;

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
	}

	// Ground checkered Rectangle
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

	
	d = SphereIntersect( spheres[0].radius, spheres[0].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[0].position;
		intersectionMaterial = spheres[0].material;
		intersectionUV = calcSphereUV(intersectionPoint, spheres[0].radius, spheres[0].position) * spheres[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	d = SphereIntersect( spheres[1].radius, spheres[1].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[1].position;
		intersectionMaterial = spheres[1].material;
		intersectionUV = calcSphereUV(intersectionPoint, spheres[1].radius, spheres[1].position) * spheres[1].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	d = SphereIntersect( spheres[2].radius, spheres[2].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[2].position;
		intersectionMaterial = spheres[2].material;
		intersectionUV = calcSphereUV(intersectionPoint, spheres[2].radius, spheres[2].position) * spheres[2].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	d = SphereIntersect( spheres[3].radius, spheres[3].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[3].position;
		intersectionMaterial = spheres[3].material;
		intersectionUV = calcSphereUV(intersectionPoint, spheres[3].radius, spheres[3].position) * spheres[3].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	d = SphereIntersect( spheres[4].radius, spheres[4].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[4].position;
		intersectionMaterial = spheres[4].material;
		intersectionUV = calcSphereUV(intersectionPoint, spheres[4].radius, spheres[4].position) * spheres[4].uvScale;
		intersectionShapeIsClosed = TRUE;
	}
 
	return t;
} // end float SceneIntersect( )


vec3 getSkyColor(vec3 rayDir)
{
	return mix(vec3(0), vec3(0.02, 0.0, 0.1), clamp(exp(rayDir.y * -15.0), 0.0, 1.0));
}


//-------------------------------------------------------------------------------------------
vec3 RayTrace()
//-------------------------------------------------------------------------------------------
{
	vec3 pointLightPosition = spheres[0].position;
        Material pointLightMaterial = spheres[0].material;
	vec3 lightColor = pointLightMaterial.color; // or sunlightColor
	vec3 accumulatedColor = vec3(0); // this will hold the final raytraced color for this pixel
        vec3 rayColorMask = vec3(1); // all rays start out un-tinted pure white (vec3(1)) - no color tinting, yet
	vec3 perfectReflectedDirection;
	vec3 perfectRefractedDirection;
	vec3 reflectionRayOrigin, reflectionRayDirection; // these rays will be used to capture surface reflections from the surrounding environment
	vec3 reflectionRayColorMask;
        vec3 geometryNormal, shadingNormal;
	vec3 halfwayVector;
	vec3 intersectionPoint;
	vec3 directionToLight;
	vec3 ambientContribution = vec3(0);
	vec3 diffuseContribution = vec3(0);
	vec3 specularContribution = vec3(0);
	vec3 textureColor;
	// go ahead and get the skyColor for our camera ray - we'll use it if the ray misses everything, and also for final blending of objects with fog/atmosphere in the distance
	vec3 initialSkyColor = getSkyColor(rayDirection);
	vec3 skyColor;

	float t = INFINITY;
	float initial_t = INFINITY;
	float ambientIntensity = 0.02;
	float diffuseIntensity;
	float fogStart;
	float reflectance, transmittance;
	//float ni, nt;
	float IoR_ratio;
	float transparentThickness;
	float previousMaterialIoR = 1.0;
	float currentMaterialIoR = 1.0;

	int isShadowRay = FALSE;
	int willNeedReflectionRay = FALSE;
	int sceneUsesDirectionalLight = FALSE;
	int previousIntersectionMaterialType;
	intersectionMaterial.type = -100;

	// For the kind of ray tracing we're doing, 7 or 8 bounces is enough to do all the reflections and refractions that are most clearly noticeable.
	// You might be able to get away with 5/6 bounces if on a mobile budget, or crank it up to 9/10 bounces if your scene has a bunch of mirrors or glass objects.

	for (int bounces = 0; bounces < 7; bounces++)
	{
		// before we intersect the entire scene, record the intersection material type (save as 'previous' for later use)
		previousIntersectionMaterialType = intersectionMaterial.type;
		
		// the following function tests for intersections with the entire scene, then reports back the closest object (min t value)
		t = SceneIntersect( isShadowRay );
		// on the 1st bounce only, record the initial t value - it will be used later when applying fog/atmosphere blending
		initial_t = bounces == 0 ? t : initial_t;

		if (t == INFINITY) // ray has missed all objects and hit the background sky
		{
			if (bounces == 0) // if this is the initial camera ray, just draw the sky and exit early
			{
				accumulatedColor = initialSkyColor;
				break;
			}
			// else this is a reflection/refraction ray that has hit the background sky
			skyColor = getSkyColor(rayDirection); // must get a fresh skyColor value, because the reflected ray is pointing in different direction

			accumulatedColor += rayColorMask * skyColor;

			// now that the initial camera ray has completed its journey, we can spawn the saved reflectionRay (if one was needed) to gather reflections from shiny surfaces.
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
			if (bounces == 0) // if this is the initial camera ray, set it to the light's color and exit early 
			{
				accumulatedColor = clamp(lightColor, 0.0, 4.0);
				break;
			}	
				
			if (isShadowRay == TRUE) // the shadow ray was successful, so we know that we can see the light from the surface where the shadow ray came
			{			//  from - therefore, the direct diffuse lighting and specular lighting can be added to that surface.
				accumulatedColor += diffuseContribution; // add diffuse direct lighting
				accumulatedColor += specularContribution; // add bright specular highlights
			}
			else // else this is a reflected/refracted ray that has hit the small point light
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
		// the directionToLight vector will point from the intersected surface either towards the Sun, or towards the point light position
		directionToLight = (sceneUsesDirectionalLight == TRUE) ? directionToLight : normalize(pointLightPosition - intersectionPoint);
		halfwayVector = normalize(-rayDirection + directionToLight); // this is Blinn's modification to Phong's model
		diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight)); // this is used for typical Lambert diffuse (or 'NdotL') lighting on most surfaces, so go ahead and pre-calculate it now

		// if the intersection material has a valid texture ID (> -1), go ahead and sample the texture at the hit material's UV coordinates
		if (intersectionMaterial.textureID > -1)
		{
			textureColor = texture(uUVGridTexture, intersectionUV).rgb;
			textureColor *= textureColor; // remove image gamma by raising texture color to the power of 2.2 (but squaring is close enough and cheaper)
			intersectionMaterial.color *= textureColor; // now that the texture color is in linear color space, we can do simple math with it, like multiplying and adding
		}

		if (intersectionMaterial.isCheckered == TRUE)
		{
			intersectionMaterial.color = mod(floor(intersectionUV.x) + floor(intersectionUV.y), 2.0) == 0.0 ? intersectionMaterial.color : intersectionMaterial.color2;
		}
		
                if (intersectionMaterial.type == DIFFUSE)
                {
			// Phong's original lighting model consists of 3 components - Ambient, Diffuse, and Specular contributions.
			// Ambient is an old 'hack' to cheaply simulate the effect of soft, diffuse bounce lighting (Global Illumination)
			ambientContribution = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			accumulatedColor += ambientContribution; // on diffuse surfaces (including Phong materials), ambient is always present no matter what, so go ahead and add it to the final accumColor now

			// Diffuse is the typical Lambertian lighting (NdotL) that arrives directly from the light source - this gives non-metallic surfaces their color & gradient shading
			diffuseContribution = doDiffuseDirectLighting(rayColorMask, intersectionMaterial.color, lightColor, diffuseIntensity);
			diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(spheres[0].position, intersectionPoint));
			
			// Specular is the bright highlight on shiny surfaces, resulting from a direct reflection of the light source itself
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, clamp(lightColor, 0.0, 4.0), intersectionMaterial.roughness, diffuseIntensity);
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
			ambientContribution = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			ambientContribution *= (1.0 - intersectionMaterial.metalness);
			accumulatedColor += ambientContribution;
			
			diffuseContribution = doDiffuseDirectLighting(rayColorMask, intersectionMaterial.color, lightColor, diffuseIntensity);
			diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(spheres[0].position, intersectionPoint));
			diffuseContribution *= (1.0 - intersectionMaterial.metalness);
			
			// tint ray color with metal color, based on how metallic this surface is (its 'metalness')
			rayColorMask *= mix(vec3(1), intersectionMaterial.color, intersectionMaterial.metalness);
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, clamp(lightColor, 0.0, 4.0), min(intersectionMaterial.roughness, 0.95), diffuseIntensity);
			//specularContribution = doWardAnisotropicSpecularLighting(rayDirection, rayColorMask, shadingNormal, halfwayVector, lightColor, 0.1, 0.5, diffuseIntensity);

			reflectance = calcFresnelReflectance(rayDirection, shadingNormal, 1.0, 1.5, IoR_ratio); // the fraction of light that is reflected
			reflectance = mix(reflectance, 1.0, intersectionMaterial.metalness * intersectionMaterial.metalness);
			// If this Metal material is either the first thing that the camera ray encounters (bounces == 0), or the 2nd thing the ray encounters after reflecting from METAL (bounces == 1),
			// then setup and save a reflection ray for later use. After we've done that, first we'll send out the usual shadow ray to see if the Diffuse and Specular contributions can be added. Then once the shadow ray 
			// is done testing for light visibility, we'll rewind back to this surface and send out the saved reflection ray on its own trajectory, in order to capture mirror reflections of the environment. 
			if (bounces == 0 || (bounces == 1 && previousIntersectionMaterialType == METAL))
			{
				willNeedReflectionRay = TRUE; // this flag will let the future code know that it needs to rewind time and trace the saved reflection ray
				reflectionRayColorMask = rayColorMask * reflectance * (1.0 - intersectionMaterial.roughness); // weight reflected ray with (1 - roughness)
				reflectionRayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				perfectReflectedDirection = reflect(rayDirection, shadingNormal);
				reflectionRayDirection = randomDirectionInSpecularLobe(perfectReflectedDirection, intersectionMaterial.roughness);
				reflectionRayColorMask *= max(0.0, dot(perfectReflectedDirection, reflectionRayDirection));
			}
			// First, send out the usual shadow ray for the diffuse (or rough) part of this surface. When that's done with its job, the saved reflection ray above will take over.  
			// The reflection ray above will start right back at this same spot on the surface, but will go off on its own mirror reflection trajectory.
			isShadowRay = TRUE;
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the shadow rayOrigin out from the surface to avoid self-intersection
			rayDirection = directionToLight; // all shadow rays go directly toward the light
			continue; // continue next with shadow ray towards the light source
		}

		if (intersectionMaterial.type == CLEARCOAT)
		{
			// the following will decrease the IndexOfRefracton, or IoR(shininess) of the clear coating as the roughness increases 
			intersectionMaterial.IoR = mix(1.0, intersectionMaterial.IoR, 1.0 - intersectionMaterial.roughness); // as roughness increases, the IndexOfRefraction(shininess/brightness) decreases
			// reflectance (range: 0-1), given by the Fresnel equations, will tell us what fraction of the light is reflected(reflectance), vs. what fraction is refracted(transmittance)
			reflectance = calcFresnelReflectance(rayDirection, shadingNormal, 1.0, intersectionMaterial.IoR, IoR_ratio); // the fraction of light that is reflected,
			transmittance = 1.0 - reflectance; // and the fraction of light that is transmitted

			ambientContribution = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			accumulatedColor += ambientContribution; // on diffuse surfaces (underneath the clearcoat), ambient is always present no matter what, so go ahead and add it to the final accumColor now

			diffuseContribution = doDiffuseDirectLighting(rayColorMask, intersectionMaterial.color, lightColor, diffuseIntensity);
			diffuseContribution /= sceneUsesDirectionalLight == TRUE ? 1.0 : max(1.0, 0.5 * distance(spheres[0].position, intersectionPoint));
			diffuseContribution *= max(0.1, transmittance); // the diffuse reflections from the surface are transmitted through the ClearCoat material, so we must weight them accordingly
			
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, clamp(lightColor, 0.0, 4.0), intersectionMaterial.roughness, diffuseIntensity);

			// If this ClearCoat type of material is either the first thing that the camera ray encounters (bounces == 0), or the 2nd thing the ray encounters after reflecting from METAL (bounces == 1),
			// then setup and save a reflection ray for later use. After we've done that, first we'll send out the usual shadow ray to see if the Diffuse and Specular contributions can be added. Then once the shadow ray 
			// is done testing for light visibility, we'll rewind back to this surface and send out the saved reflection ray on its own trajectory, in order to capture reflections of the environment. 
			if (bounces == 0 || (bounces == 1 && previousIntersectionMaterialType == METAL))
			{
				willNeedReflectionRay = TRUE; // this flag will let the future code know that it needs to rewind time and trace the saved reflection ray
				reflectionRayColorMask = rayColorMask * reflectance * (1.0 - intersectionMaterial.roughness); // weight reflected ray with reflectance value we got
				reflectionRayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				perfectReflectedDirection = reflect(rayDirection, shadingNormal);
				reflectionRayDirection = randomDirectionInSpecularLobe(perfectReflectedDirection, intersectionMaterial.roughness);
				reflectionRayColorMask *= max(0.0, dot(perfectReflectedDirection, reflectionRayDirection));
			}
			// First, send out the usual shadow ray for the diffuse part of this surface. When that's done with its job, the saved reflection ray above will take over.  
			// The reflection ray above will start right back at this same spot on the surface, but will go off on its own mirror reflection trajectory.
			isShadowRay = TRUE;
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the shadow rayOrigin out from the surface to avoid self-intersection
			rayDirection = directionToLight; // all shadow rays go directly toward the light
			continue; // continue next with shadow ray towards the light source
		}

		if (intersectionMaterial.type == TRANSPARENT)
		{
			
			reflectance = calcFresnelReflectance(rayDirection, geometryNormal, currentMaterialIoR, intersectionMaterial.IoR, IoR_ratio);
			transmittance = 1.0 - reflectance;
			
			// Ideal Transparent materials (like glass, water, clear plastic, etc.) are purely specular with no diffuse component.
			// Therefore, the Ambient (global bounced diffuse) and Diffuse (direct diffuse from light source) contributions are skipped.
			// ambientContribution = NA
			// diffuseContribution = NA

			float TdotL = dot(-rayDirection, directionToLight);

			// check if light source is behind the surface
			//if (TdotL < 0.0)
			{
				// the following is from the Hall shading model
				
				float divisor = intersectionMaterial.IoR - 1.0;
				// if (geometryNormal == shadingNormal)
				// {
				// 	//if (TdotL < (ni / nt)) halfwayVector = vec3(0); // check for total internal reflection
				// 	halfwayVector = -(((directionToLight - rayDirection) / divisor) - rayDirection);
				// }	
				// else 
				///if (geometryNormal != shadingNormal)
				{
					//if (TdotL < (nt / ni)) halfwayVector = vec3(0); // check for total internal reflection
					if (TdotL < (IoR_ratio)) halfwayVector = vec3(0); // check for total internal reflection
					halfwayVector = (((directionToLight - rayDirection) / divisor) + directionToLight);
				}
				halfwayVector = normalize(halfwayVector);	
			}
			

			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, clamp(lightColor, 0.0, 4.0), min(intersectionMaterial.roughness, 0.95), diffuseIntensity);
				
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
				reflectionRayColorMask = rayColorMask * reflectance * (1.0 - intersectionMaterial.roughness);
				reflectionRayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				perfectReflectedDirection = reflect(rayDirection, shadingNormal);
				reflectionRayDirection = randomDirectionInSpecularLobe(perfectReflectedDirection, intersectionMaterial.roughness);
				reflectionRayColorMask *= max(0.0, dot(perfectReflectedDirection, reflectionRayDirection));
			}
			if (reflectance == 1.0 && isShadowRay == FALSE) // total internal reflection occured - all light is mirror reflection only, because refraction/transmittance is physically impossible for this viewing angle
			{
				willNeedReflectionRay = FALSE;
				rayColorMask = rayColorMask * reflectance * (1.0 - intersectionMaterial.roughness); // weight reflected ray with reflectance value we got
				rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
				perfectReflectedDirection = reflect(rayDirection, shadingNormal);
				rayDirection = randomDirectionInSpecularLobe(perfectReflectedDirection, intersectionMaterial.roughness);
				rayColorMask *= max(0.0, dot(perfectReflectedDirection, rayDirection));
				continue; // abandon transmitted ray(below) and go ahead and trace reflection ray now
			}

			// This part of the code handles the transmitted(refracted) portion of the Transparent surface
			if (intersectionShapeIsClosed == FALSE)
				rayColorMask *= intersectionMaterial.color;
			// Is ray leaving a solid object from the inside? If so, attenuate ray color with object color by how far ray has travelled through the object's interior
			else if (geometryNormal != shadingNormal) // this happens when trying to exit a glass sphere from the inside - geometryNormal and shadingNormal do not match
			{
				transparentThickness = 0.2;
				// the following uses Beer's Law to attenuate the light energy (brightness and color saturation) by how far the light ray had to travel through the transparent material.
				// If the material is very thin, like thin glass or a shallow puddle of colored water, the transmitted light will still be bright, but will not pick up very much of the transparent material's color.
				// As the material gets thicker, like thick glass or a deep pool of colored water, the transmitted light will lose more energy(darker) and will take on more and more of the transparent material's color.
				rayColorMask *= exp( log(intersectionMaterial.color) * transparentThickness * t ); // Use Beer's Law to attenuate light based on how far the ray traveled through the medium (the ray 't' value)
			}
			// the refraction through the surface only accounts for the portion of light that is transmitted, so we must weight it accordingly (Reflectance vs. Transmittance)
			rayColorMask *= transmittance;

			if (isShadowRay == FALSE) // do usual refraction - this is the case most often
			{
				// note the minus(-) sign below, which nudges the rayOrigin below the surface along the normal, instead of above it (like for the usual bounced reflections) 
				rayOrigin = intersectionPoint - (uEPS_intersect * shadingNormal); // nudge transmitted rayOrigin below the surface to avoid self-intersection
				perfectRefractedDirection = refract(rayDirection, shadingNormal, IoR_ratio); // ray is now refracted through the material, according to Snell's Law
				rayDirection = randomDirectionInSpecularLobe(perfectRefractedDirection, intersectionMaterial.roughness * intersectionMaterial.roughness * intersectionMaterial.roughness);
				rayColorMask *= max(0.0, dot(perfectRefractedDirection, rayDirection));
			}
			else // special case: shadow rays are allowed to penetrate transparent surfaces un-refracted, in order to generate 'shadow' caustics (a clever technique found in the Hall Lighting Model)
			{
				diffuseContribution *= intersectionMaterial.color; // color future-generated caustics with the transparent material color
				diffuseContribution *= max(0.2, transmittance); // the light that generates the caustics only accounts for the transmitted portion, so weight it accordingly
				diffuseContribution *= (1.0 - intersectionMaterial.roughness); // inverse relationship: as roughness increases, caustics brightness decreases
				rayOrigin = intersectionPoint + (uEPS_intersect * rayDirection); // nudge the caustics rayOrigin through the surface along the same rayDirection to avoid self-intersection
				rayDirection = rayDirection; // ray direction is unchanged - the caustics ray is allowed to pass through (un-refracted)
			}
			
			continue; // continue ray tracing next with the refracted(or transmitted) ray
		}
		
	} // end for (int bounces = 0; bounces < 7; bounces++)
	

	if (initial_t < INFINITY)
	{
		fogStart = 20.0;
		initial_t -= fogStart; // this makes the fog start a little farther away from the camera
		// the following is the standard blending of objects with fog/atmosphere as they recede into the distance, using Beer's Law
		accumulatedColor = mix(initialSkyColor, accumulatedColor, clamp(exp(-initial_t * 0.001), 0.0, 1.0));
	}
		

	return max(vec3(0), accumulatedColor);

}  // end vec3 RayTrace()


//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
	// rgb values for common metals
	// Gold: (1.000, 0.766, 0.336) / Aluminum: (0.913, 0.921, 0.925) / Copper: (0.955, 0.637, 0.538) / Silver: (0.972, 0.960, 0.915)
	float pointLightPower = 10.0;
	Material pointLightMaterial = Material(POINT_LIGHT, FALSE, vec3(1.0, 1.0, 1.0) * pointLightPower, vec3(0.0, 0.0, 0.0), 0.0, 0.0, 0.0, -1 );
	Material blueMaterial = Material(CLEARCOAT, FALSE, vec3(0.01, 0.01, 1.0), vec3(0.0, 0.0, 0.0), 0.0, uRoughness, 1.4, -1);
	Material redMaterial = Material(DIFFUSE, FALSE, vec3(1.0, 0.01, 0.01), vec3(0.0, 0.0, 0.0), 0.0, uRoughness, 0.0, -1);
	Material groundUVGridMaterial = Material(CLEARCOAT, FALSE, vec3(1.0, 1.0, 1.0), vec3(0.0, 0.0, 0.0), 0.0, 0.0, 1.3, 0);
	Material metalMaterial = Material(METAL, FALSE, vec3(1.000, 0.766, 0.336), vec3(0.0, 0.0, 0.0), uMetalness, uRoughness, 0.0, -1);
	Material glassMaterial = Material(TRANSPARENT, FALSE, vec3(0.4, 1.0, 0.6), vec3(0.0, 0.0, 0.0), 0.0, uRoughness, 1.5, -1);
	Material grayBlackCheckerMaterial = Material(CLEARCOAT, TRUE, vec3(0.8, 0.8, 0.8), vec3(0.002, 0.002, 0.002), 0.0, 0.0, 1.4, -1);

	vec3 lightPosition = vec3(4, 10, 5);
	boxes[0] = Box(lightPosition - vec3(0.5), lightPosition + vec3(0.5), vec2(1, 1), pointLightMaterial);

	rectangles[0] = Rectangle(vec3(0, 0, 0), normalize(vec3(0,1,0)), vec3(0), vec3(0), 1000.0, 1000.0, vec2(300, 300), grayBlackCheckerMaterial);
	//rectangles[0] = Rectangle(vec3(0, 0, 0), normalize(vec3(-uMetalness,uMetalness,-(1.0-uMetalness))), vec3(0), vec3(0), 1000.0, 1000.0, vec2(300, 300), grayBlackCheckerMaterial);
	rectangles[0].vectorU = normalize(cross(normalize(rectangles[0].normal.yzx + vec3(0,0.1,0)), rectangles[0].normal));
	rectangles[0].vectorV = cross(rectangles[0].normal, rectangles[0].vectorU);

	spheres[0] = Sphere(0.2, lightPosition, vec2(1, 1), pointLightMaterial);
	spheres[1] = Sphere(4.0, vec3(0, 4, 0), vec2(1, 1), blueMaterial);
	spheres[2] = Sphere(4.0, vec3(-10, 4, 0),vec2(1, 1), metalMaterial);
	spheres[3] = Sphere(3.0, vec3(10, 3, 0), vec2(1, 1), redMaterial);
	spheres[4] = Sphere(4.0, vec3(-15, 4, 10), vec2(1, 1), glassMaterial);
}


#include <raytracing_main>
