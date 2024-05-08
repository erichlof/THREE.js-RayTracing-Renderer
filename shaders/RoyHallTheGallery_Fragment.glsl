precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform mat4 uCubeInvMatrix;
uniform mat4 uPlatformInvMatrix;

#define N_BOX_INTERIORS 1
#define N_SPHERES 12
#define N_SPOTLIGHT_SPHERES 6

vec3 rayOrigin, rayDirection;
// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;
int intersectionShapeIsClosed;

struct Material { int type; int isCheckered; vec3 color; vec3 color2; float metalness; float roughness; float IoR; int textureID; };
struct BoxInterior { vec3 minCorner; vec3 maxCorner; vec2 uvScale; Material material; };
struct Sphere { float radius; vec3 position; vec2 uvScale; Material material; };
struct SpotLightSphere { float radius; vec3 position; vec3 direction; vec3 color; };

Material intersectionMaterial;
BoxInterior boxInteriors[N_BOX_INTERIORS];
Sphere spheres[N_SPHERES];
SpotLightSphere spotlightSpheres[N_SPOTLIGHT_SPHERES];


#include <raytracing_core_functions>

#include <raytracing_box_intersect> // for intersecting Point lights

#include <raytracing_box_interior_intersect>

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


	// Room (Box Interior)
	d = BoxInteriorIntersect(boxInteriors[0].minCorner, boxInteriors[0].maxCorner, rayOrigin, rayDirection, normal);
	if (d < t)
	{
		t = d;
		intersectionNormal = normal;
		intersectionMaterial = boxInteriors[0].material;
		if (intersectionNormal == vec3(0,1,0))
			intersectionMaterial.color = vec3(0.001, 0.001, 0.1);
		else if (intersectionNormal == vec3(0,-1,0))
			intersectionMaterial.color *= vec3(1,1.5,2);
		else if (intersectionNormal == vec3(0,0,1) || intersectionNormal == vec3(0,0,-1))
		{
			intersectionMaterial.type = PERFECT_MIRROR;
			intersectionMaterial.color = vec3(0.8);
		}
		intersectionShapeIsClosed = FALSE;
	}

	
	d = SphereIntersect( spheres[0].radius, spheres[0].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[0].position;
		intersectionMaterial = spheres[0].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[1].radius, spheres[1].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[1].position;
		intersectionMaterial = spheres[1].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[2].radius, spheres[2].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[2].position;
		intersectionMaterial = spheres[2].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[3].radius, spheres[3].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[3].position;
		intersectionMaterial = spheres[3].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[4].radius, spheres[4].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[4].position;
		intersectionMaterial = spheres[4].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[5].radius, spheres[5].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[5].position;
		intersectionMaterial = spheres[5].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[6].radius, spheres[6].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[6].position;
		intersectionMaterial = spheres[6].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[7].radius, spheres[7].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[7].position;
		intersectionMaterial = spheres[7].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[8].radius, spheres[8].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[8].position;
		intersectionMaterial = spheres[8].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[9].radius, spheres[9].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[9].position;
		intersectionMaterial = spheres[9].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[10].radius, spheres[10].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[10].position;
		intersectionMaterial = spheres[10].material;
		intersectionShapeIsClosed = TRUE;
	}
	d = SphereIntersect( spheres[11].radius, spheres[11].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[11].position;
		intersectionMaterial = spheres[11].material;
		intersectionShapeIsClosed = TRUE;
	}

	// SPOTLIGHT SPHERES
	d = SphereIntersect( spotlightSpheres[0].radius, spotlightSpheres[0].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionMaterial.type = SPOT_LIGHT;
		intersectionMaterial.color = spotlightSpheres[0].color;
	}
	d = SphereIntersect( spotlightSpheres[1].radius, spotlightSpheres[1].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionMaterial.type = SPOT_LIGHT;
		intersectionMaterial.color = spotlightSpheres[1].color;
	}
	d = SphereIntersect( spotlightSpheres[2].radius, spotlightSpheres[2].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionMaterial.type = SPOT_LIGHT;
		intersectionMaterial.color = spotlightSpheres[2].color;
	}
	d = SphereIntersect( spotlightSpheres[3].radius, spotlightSpheres[3].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionMaterial.type = SPOT_LIGHT;
		intersectionMaterial.color = spotlightSpheres[3].color;
	}
	d = SphereIntersect( spotlightSpheres[4].radius, spotlightSpheres[4].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionMaterial.type = SPOT_LIGHT;
		intersectionMaterial.color = spotlightSpheres[4].color;
	}
	d = SphereIntersect( spotlightSpheres[5].radius, spotlightSpheres[5].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionMaterial.type = SPOT_LIGHT;
		intersectionMaterial.color = spotlightSpheres[5].color;
	}

	// cube sculpture in center of gallery
	rObjOrigin = vec3( uCubeInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCubeInvMatrix * vec4(rayDirection, 0.0) );
	d = BoxIntersect(vec3(-1), vec3(1), rObjOrigin, rObjDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uCubeInvMatrix)) * normal;
		intersectionMaterial.type = METAL;
		intersectionMaterial.color = vec3(1.0, 0.8, 0.5);
		//intersectionMaterial.metalness = 1.0;
		intersectionMaterial.roughness = 0.5;
		intersectionShapeIsClosed = TRUE;
	}

	// platform box underneath the cube sculpture
	rObjOrigin = vec3( uPlatformInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uPlatformInvMatrix * vec4(rayDirection, 0.0) );
	d = BoxIntersect(vec3(-1), vec3(1), rObjOrigin, rObjDirection, normal, isRayExiting);
	if (d < t)
	{
		t = d;
		intersectionNormal = transpose(mat3(uPlatformInvMatrix)) * normal;
		intersectionMaterial.type = METAL;
		intersectionMaterial.color = vec3(1.0, 1.0, 1.0);
		//intersectionMaterial.metalness = 1.0;
		intersectionMaterial.roughness = 1.0;
		intersectionShapeIsClosed = TRUE;
	}
 
	return t;
} // end float SceneIntersect( )



//-------------------------------------------------------------------------------------------
vec3 RayTrace()
//-------------------------------------------------------------------------------------------
{
	//int lightChoice = int(rng() * 2.0);
	
	vec3 accumulatedColor = vec3(0);
        vec3 rayColorMask = vec3(1);
	vec3 reflectionRayOrigin, reflectionRayDirection;
	vec3 reflectionRayColorMask;
        vec3 geometryNormal, shadingNormal;
	vec3 halfwayVector;
	vec3 intersectionPoint;
	vec3 directionToLight;
	vec3 ambientContribution = vec3(0);
	vec3 diffuseContribution = vec3(0);
	vec3 specularContribution = vec3(0);
	vec3 textureColor;
	vec3 lightPosition;
	vec3 lightColor;
	vec3 spotlightAimDirection;
	vec3 diffuseIntersectionColor;

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
	//float lightDistanceAttenuation;
	float diffuseIntersectionRoughness;

	int willNeedShadowRays = FALSE;
	int isShadowRay = FALSE;
	int willNeedReflectionRay = FALSE;
	int sceneUsesDirectionalLight = FALSE;
	int previousIntersectionMaterialType;
	intersectionMaterial.type = -100;

	
	// since this room has opposing mirrors that give 'infinite' reflections, we must use many more bounces than usual
	for (int bounces = 0; bounces < 20; bounces++)
	{
		
		previousIntersectionMaterialType = intersectionMaterial.type;
		
		t = SceneIntersect( isShadowRay );
		
		// shouldn't happen in this closed-room demo, but just in case...
		if (t == INFINITY) // ray has missed all objects and hit the background
		{
			break;
		}
			

		if (intersectionMaterial.type == SPOT_LIGHT)
		{	
			if (bounces == 0 || previousIntersectionMaterialType == PERFECT_MIRROR || 
			    previousIntersectionMaterialType == METAL)
				accumulatedColor += rayColorMask * clamp(intersectionMaterial.color, 0.0, 2.0);

			break;
		}

		
		// useful data 
		geometryNormal = normalize(intersectionNormal);
                shadingNormal = dot(geometryNormal, rayDirection) < 0.0 ? geometryNormal : -geometryNormal;
		intersectionPoint = rayOrigin + (t * rayDirection);
		

		if (intersectionMaterial.type == PERFECT_MIRROR)
		{
			// tint ray color with metal mirror color
			rayColorMask *= intersectionMaterial.color;

			lightPosition = spotlightSpheres[3].position;
			lightColor = spotlightSpheres[3].color;
			directionToLight = normalize(lightPosition - intersectionPoint);
			halfwayVector = normalize(-rayDirection + directionToLight);
			diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));
			// add highlight in mirror (due to fine dust particles on mirror's surface)
			specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, lightColor, 0.2, diffuseIntensity);
			accumulatedColor += (0.2 * specularContribution);
			
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal);
			rayDirection = reflect(rayDirection, shadingNormal);
			continue;
		} // end if (intersectionMaterial.type == PERFECT_MIRROR)


                if (intersectionMaterial.type == DIFFUSE)
                {
			ambientContribution = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			if (intersectionMaterial.color == vec3(1.0, 1.6, 2.0)) // spotlight casing
				ambientContribution *= 0.3;
			accumulatedColor += ambientContribution;
			
			
			// record current intersectionMaterial data for use later with shadow rays
			diffuseIntersectionColor = intersectionMaterial.color;
			diffuseIntersectionRoughness = intersectionMaterial.roughness;

			willNeedShadowRays = TRUE;
			break;
                } // if (intersectionMaterial.type == DIFFUSE)
		

                if (intersectionMaterial.type == METAL)
		{
			// ambientContribution = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			// ambientContribution *= (1.0 - intersectionMaterial.metalness);
			// accumulatedColor += ambientContribution;

			// tint ray color with metal color
			rayColorMask *= intersectionMaterial.color;

			for (int nLight = 0; nLight < N_SPOTLIGHT_SPHERES; nLight++)
			{
				lightPosition = spotlightSpheres[nLight].position;
				directionToLight = normalize(lightPosition - intersectionPoint);
				if (dot(directionToLight, -spotlightSpheres[nLight].direction) < 0.8)
					continue;
				halfwayVector = normalize(-rayDirection + directionToLight);
				diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));

				specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, 4.0 * spotlightSpheres[nLight].color, intersectionMaterial.roughness, diffuseIntensity);
				accumulatedColor += specularContribution;
			} // end for (int nLight = 0; nLight < 6; nLight++)

			// this is a reflection bounce, so simply reflect the ray and continue ray tracing
			rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal); // nudge the reflection rayOrigin out from the surface to avoid self-intersection
			rayDirection = reflect(rayDirection, shadingNormal);
			continue;
		} // end if (intersectionMaterial.type == METAL)
		
	} // end for (int bounces = 0; bounces < 20; bounces++)


	if (willNeedShadowRays == FALSE)
		return max(vec3(0), accumulatedColor);


	// now handle shadow rays from diffuse surfaces.  We must send out 1 shadow ray for every light source,
	// so in this scene lit by 6 spotlights, we technically need 6 shadow rays for every diffuse surface
	
	// first we must nudge shadow ray origin out from the surface (along the surface normal) just a little bit, in order to avoid self-intersection
	rayOrigin = intersectionPoint + (uEPS_intersect * shadingNormal);

	for (int nLight = 0; nLight < N_SPOTLIGHT_SPHERES; nLight++)
	{
		directionToLight = normalize(spotlightSpheres[nLight].position - intersectionPoint);
		float LdotS = dot(directionToLight, -spotlightSpheres[nLight].direction);
		if (LdotS < 0.55)
			continue;
		lightColor = spotlightSpheres[nLight].color;
		halfwayVector = normalize(-rayDirection + directionToLight);
		diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));

		diffuseContribution = doDiffuseDirectLighting(rayColorMask, diffuseIntersectionColor, lightColor, diffuseIntensity);
		//diffuseContribution *= lightDistanceAttenuation;
		diffuseContribution *= pow(max(0.0, LdotS), 15.0);
		
		specularContribution = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, lightColor, diffuseIntersectionRoughness, diffuseIntensity);
		
		isShadowRay = TRUE;
		rayDirection = directionToLight;

		t = SceneIntersect( isShadowRay );

		if (intersectionMaterial.type == SPOT_LIGHT)
		{
			accumulatedColor += diffuseContribution;
			accumulatedColor += specularContribution;
		}
	} // end for (int nLight = 0; nLight < 6; nLight++)
	

	return max(vec3(0), accumulatedColor);

}  // end vec3 RayTrace()


//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
	// rgb values for common metals
	// Gold: (1.000, 0.766, 0.336) / Aluminum: (0.913, 0.921, 0.925) / Copper: (0.955, 0.637, 0.538) / Silver: (0.972, 0.960, 0.915)

		//struct Material { int type; int isCheckered; vec3 color; vec3 color2; float metalness; float roughness; float IoR; int textureID; };
	Material wallMaterial = Material(DIFFUSE, FALSE, vec3(0.3, 0.6, 1.0), vec3(0), 0.0, 1.0, 1.4, -1);
	Material darkGoldMetalMaterial = Material(METAL, FALSE, vec3(1.0, 0.5, 0.3) * 0.1, vec3(0), 1.0, 0.5, 1.4, -1);
	Material medGoldMetalMaterial = Material(METAL, FALSE, vec3(1.0, 0.4, 0.2) * 0.6, vec3(0), 1.0, 0.5, 1.4, -1);
	Material lightMetalMaterial = Material(METAL, FALSE, vec3(1.0, 0.7, 0.5), vec3(0), 1.0, 0.5, 1.4, -1);
	
	Material redMaterial = Material(DIFFUSE, FALSE, vec3(0.2, 0.01, 0.01), vec3(0), 0.0, 1.0, 1.4, -1);
	Material greenMaterial = Material(DIFFUSE, FALSE, vec3(0.01, 0.1, 0.01), vec3(0), 0.0, 1.0, 1.4, -1);
	Material blueMaterial = Material(DIFFUSE, FALSE, vec3(0.01, 0.01, 0.2), vec3(0), 0.0, 1.0, 1.4, -1);
	Material lightCasingMaterial = Material(DIFFUSE, FALSE, vec3(1.0, 1.6, 2.0), vec3(0), 0.0, 1.0, 1.4, -1);

	boxInteriors[0] = BoxInterior(vec3(-25,0,-52), vec3(20,24,40),vec2(1, 1), wallMaterial);

	float spotlightPower = 10.0;
	spotlightSpheres[0] = SpotLightSphere(0.6, vec3(-4, 23, -38), normalize(vec3(-1,-0.7,0.3)), vec3(1.0, 1.0, 1.0) * spotlightPower);
	spheres[0] = Sphere(0.8, spotlightSpheres[0].position + (0.3 * -spotlightSpheres[0].direction), vec2(1, 1), lightCasingMaterial);
	spotlightSpheres[1] = SpotLightSphere(0.6, vec3(-6, 23, -25), normalize(vec3(-1,-0.7,-0.2)), vec3(1.0, 1.0, 1.0) * spotlightPower);
	spheres[1] = Sphere(0.8, spotlightSpheres[1].position + (0.3 * -spotlightSpheres[1].direction), vec2(1, 1), lightCasingMaterial);
	spotlightSpheres[2] = SpotLightSphere(0.6, vec3(2, 23, -45), normalize(vec3(1,-1.4,0)), vec3(1.0, 1.0, 1.0) * spotlightPower);
	spheres[2] = Sphere(0.8, spotlightSpheres[2].position + (0.3 * -spotlightSpheres[2].direction), vec2(1, 1), lightCasingMaterial);
	spotlightSpheres[3] = SpotLightSphere(0.6, vec3(7, 23, -40), normalize(vec3(0.5,-1,-1)), vec3(1.0, 1.0, 1.0) * spotlightPower);
	spheres[3] = Sphere(0.8, spotlightSpheres[3].position + (0.3 * -spotlightSpheres[3].direction), vec2(1, 1), lightCasingMaterial);
	spotlightSpheres[4] = SpotLightSphere(0.6, vec3(-14, 23, -8), normalize(vec3(0.8,-1,0)), vec3(1.0, 1.0, 1.0) * spotlightPower);
	spheres[4] = Sphere(0.8, spotlightSpheres[4].position + (0.3 * -spotlightSpheres[4].direction), vec2(1, 1), lightCasingMaterial);
	spotlightSpheres[5] = SpotLightSphere(0.6, vec3(8, 22, -9), normalize(vec3(-0.8,-1,0)), vec3(1.0, 1.0, 1.0) * spotlightPower);
	spheres[5] = Sphere(0.8, spotlightSpheres[5].position + (0.3 * -spotlightSpheres[5].direction), vec2(1, 1), lightCasingMaterial);

	spheres[6] = Sphere(4.0, vec3(15, 4, -45), vec2(1, 1), medGoldMetalMaterial);
	spheres[7] = Sphere(4.0, vec3(-25.5, 12, -34.5),vec2(1, 1), darkGoldMetalMaterial);
	spheres[8] = Sphere(3.3, vec3(-25, 15, -28), vec2(1, 1), lightMetalMaterial);
	spheres[9] = Sphere(1.7, vec3(-22.5, 18, -24), vec2(1, 1), redMaterial);
	spheres[10] = Sphere(1.4, vec3(-22, 11, -25.5), vec2(1, 1), greenMaterial);
	spheres[11] = Sphere(1.7, vec3(-25.5, 6.5, -22.5), vec2(1, 1), blueMaterial);
}


#include <raytracing_main>