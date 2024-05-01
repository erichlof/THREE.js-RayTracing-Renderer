precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform sampler2D uTileNormalMapTexture;

#define N_SPHERES 3
#define N_RECTANGLES 1


//-----------------------------------------------------------------------

vec3 rayOrigin, rayDirection;
// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;
int intersectionShapeIsClosed;


struct Material { int type; int isCheckered; vec3 color; vec3 color2; float metalness; float roughness; float IoR; int textureID; };
struct Rectangle { vec3 position; vec3 normal; vec3 vectorU; vec3 vectorV; float radiusU; float radiusV; vec2 uvScale; Material material; };
struct Sphere { float radius; vec3 position; vec2 uvScale; Material material; };

Material intersectionMaterial;
Sphere spheres[N_SPHERES];
Rectangle rectangles[N_RECTANGLES];


#include <raytracing_core_functions>

#include <raytracing_rectangle_intersect>

#include <raytracing_sphere_intersect>


vec3 perturbNormal(vec3 normal, vec2 bumpScale, vec2 uv)
{
	// note: incoming vec3 normal is assumed to be normalized
        vec3 S = normalize(cross(vec3(0, 0.9938837346736189, 0.11043152607484655), normal));
        vec3 T = cross(normal, S);
        vec3 N = normal;
	// invert S, T when the UV direction is backwards (from mirrored faces),
	// otherwise it will do the normal mapping backwards.
	// vec3 NfromST = cross( S, T );
	// if( dot( NfromST, N ) < 0.0 )
	// {
	// 	S *= -1.0;
	// 	T *= -1.0;
	// }
        mat3 tsn = mat3( S, T, N );

	vec3 mapN = texture(uTileNormalMapTexture, uv).xyz * 2.0 - 1.0;
	//mapN = normalize(mapN);
        mapN.xy *= bumpScale;
        
        return normalize( tsn * mapN );
}



//-----------------------------------------------------------------------
float SceneIntersect()
//-----------------------------------------------------------------------
{
	vec3 intersectionPoint, normal;
	float d;
	float t = INFINITY;
	float u, v;


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
		//intersectionUV = calcSphereUV(intersectionPoint, spheres[0].radius, spheres[0].position) * spheres[0].uvScale;
		intersectionShapeIsClosed = TRUE;
	}

	d = SphereIntersect( spheres[1].radius, spheres[1].position, rayOrigin, rayDirection );
	if (d < t)
	{
		t = d;
		intersectionPoint = rayOrigin + (t * rayDirection);
		intersectionNormal = intersectionPoint - spheres[1].position;
		intersectionMaterial = spheres[1].material;
		//intersectionUV = calcSphereUV(intersectionPoint, spheres[1].radius, spheres[1].position) * spheres[1].uvScale;
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


	return t;
	
} // end float SceneIntersect()



//-----------------------------------------------------------------------
vec3 RayTrace()
//-----------------------------------------------------------------------
{
	vec3 accumulatedColor = vec3(0);
	vec3 rayColorMask = vec3(1);
	vec3 reflectionRayColorMask = vec3(1);
	vec3 reflectionRayOrigin = vec3(0);
	vec3 reflectionRayDirection = vec3(0);
	vec3 reflectionRayColorMask2 = vec3(1);
	vec3 reflectionRayOrigin2 = vec3(0);
	vec3 reflectionRayDirection2 = vec3(0);
	vec3 reflectionRayColorMask3 = vec3(1);
	vec3 reflectionRayOrigin3 = vec3(0);
	vec3 reflectionRayDirection3 = vec3(0);
	vec3 skyColor = vec3(0.01, 0.15, 0.7);
	vec3 sunlightColor = vec3(1);
	vec3 ambientColor = vec3(0);
	vec3 diffuseColor = vec3(0);
	vec3 specularColor = vec3(0);
	vec3 tdir;
	vec3 directionToLight = normalize(vec3(-0.2, 1.0, 0.7));
	vec3 geometryNormal, shadingNormal; 
	vec3 intersectionPoint;
	vec3 halfwayVector;

        vec2 sphereUV;

	float t;
	float ni, nt, ratioIoR, Re, Tr;
	float ambientIntensity = 0.2;
	float diffuseIntensity;
	float specularIntensity;

        int previousIntersectionMaterialType;
	int bounceIsSpecular = FALSE;
        int sampleLight = FALSE;
	int willNeedReflectionRay = FALSE;
	int willNeedReflectionRay2 = FALSE;
	int willNeedReflectionRay3 = FALSE;
	int reflectionIsFromMetal = FALSE;

	intersectionMaterial.type = -100;
	

        for (int bounces = 0; bounces < 12; bounces++)
	{
		previousIntersectionMaterialType = intersectionMaterial.type;

		t = SceneIntersect();
		
		if (t == INFINITY)
		{
			if (bounces == 0)
                        {
                                accumulatedColor += rayColorMask * skyColor;
                                break;
                        }
			else if (sampleLight == TRUE)
			{
				accumulatedColor += diffuseColor + specularColor;
			}
			else if (bounceIsSpecular == TRUE && reflectionIsFromMetal == FALSE)
			{
				accumulatedColor += rayColorMask * skyColor;
			}
			

			if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;
				intersectionMaterial.type = -100;
				willNeedReflectionRay = FALSE;
				sampleLight = FALSE;
				bounceIsSpecular = TRUE;
				continue;
			}

			if (willNeedReflectionRay2 == TRUE)
			{
				rayColorMask = reflectionRayColorMask2;
				rayOrigin = reflectionRayOrigin2;
				rayDirection = reflectionRayDirection2;
				intersectionMaterial.type = -100;
				willNeedReflectionRay2 = FALSE;
				sampleLight = FALSE;
				bounceIsSpecular = TRUE;
				continue;
			}

			if (willNeedReflectionRay3 == TRUE)
			{
				rayColorMask = reflectionRayColorMask3;
				rayOrigin = reflectionRayOrigin3;
				rayDirection = reflectionRayDirection3;
				intersectionMaterial.type = -100;
				willNeedReflectionRay3 = FALSE;
				sampleLight = FALSE;
				bounceIsSpecular = TRUE;
				continue;
			}

                        break;
		}

                
                // if we get here and sampleLight is still TRUE, shadow ray failed to find the light source 
		// the ray hit an occluding object along its way to the light
                if (sampleLight == TRUE)
                {
			if (bounces == 1 && intersectionMaterial.type == TRANSPARENT && previousIntersectionMaterialType == DIFFUSE)
			{
				accumulatedColor *= 3.5; // make shadow underneath glass sphere a little lighter
				break;
			}

                        if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;
				intersectionMaterial.type = -100;
				willNeedReflectionRay = FALSE;
				sampleLight = FALSE;
				bounceIsSpecular = TRUE;
				continue;
			}

			if (willNeedReflectionRay2 == TRUE)
			{
				rayColorMask = reflectionRayColorMask2;
				rayOrigin = reflectionRayOrigin2;
				rayDirection = reflectionRayDirection2;
				intersectionMaterial.type = -100;
				willNeedReflectionRay2 = FALSE;
				sampleLight = FALSE;
				bounceIsSpecular = TRUE;
				continue;
			}

			if (willNeedReflectionRay3 == TRUE)
			{
				rayColorMask = reflectionRayColorMask3;
				rayOrigin = reflectionRayOrigin3;
				rayDirection = reflectionRayDirection3;
				intersectionMaterial.type = -100;
				willNeedReflectionRay3 = FALSE;
				sampleLight = FALSE;
				bounceIsSpecular = TRUE;
				continue;
			}

                        break;
                }


		// useful data 
		geometryNormal = normalize(intersectionNormal); // geometry normals are the unaltered normals from the intersected shape definition / or from the triangle mesh data
                shadingNormal = dot(geometryNormal, rayDirection) < 0.0 ? geometryNormal : -geometryNormal; // if geometry normal is pointing in the same manner as ray, must flip the shading normal (negate it) 
		intersectionPoint = rayOrigin + (t * rayDirection); // use the ray equation to find intersection point (P = O + tD)
		halfwayVector = normalize(-rayDirection + directionToLight); // this is Blinn's modification to Phong's model
		//diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));


		if (intersectionMaterial.isCheckered == TRUE)
		{
			intersectionMaterial.color = mod(floor(intersectionUV.x) + floor(intersectionUV.y), 2.0) == 0.0 ? intersectionMaterial.color : intersectionMaterial.color2;
		}

		    
                if (intersectionMaterial.type == DIFFUSE)
		{
			bounceIsSpecular = FALSE;

			ambientColor = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			accumulatedColor += ambientColor;

			diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));
			diffuseColor = doDiffuseDirectLighting(rayColorMask, intersectionMaterial.color, sunlightColor, diffuseIntensity);

			specularColor = vec3(0);

                        rayDirection = directionToLight; // shadow ray
			rayOrigin = intersectionPoint + shadingNormal * uEPS_intersect;
                        sampleLight = TRUE;
                        continue;
		}

                if (intersectionMaterial.type == CLEARCOAT)
		{
			bounceIsSpecular = FALSE;

			shadingNormal = perturbNormal(shadingNormal, vec2(0.5, 0.5), intersectionUV);

                        ambientColor = doAmbientLighting(rayColorMask, intersectionMaterial.color, ambientIntensity);
			accumulatedColor += ambientColor * 0.6;

			diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));
			diffuseColor = doDiffuseDirectLighting(rayColorMask, intersectionMaterial.color, sunlightColor, diffuseIntensity);

			specularColor = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, sunlightColor * 2.0, 0.6, diffuseIntensity);

			if (bounces == 0)
			{
				reflectionRayColorMask = rayColorMask * 0.15;
				reflectionRayDirection = reflect(rayDirection, shadingNormal); // reflect ray from surface
				reflectionRayOrigin = intersectionPoint + shadingNormal * uEPS_intersect;
				willNeedReflectionRay = TRUE;
				reflectionIsFromMetal = TRUE;
			}

			rayDirection = directionToLight; // shadow ray
			rayOrigin = intersectionPoint + shadingNormal * uEPS_intersect;
			sampleLight = TRUE;
                        continue;
		}
		
		if (intersectionMaterial.type == TRANSPARENT)
		{
			ni = 1.0; // IOR of Air
			nt = intersectionMaterial.IoR; // IOR of this classic demo's Glass
			//Re = calcFresnelReflectance(rayDirection, geometryNormal, ni, nt, ratioIoR);
			ratioIoR = ni / nt;

			if (bounces == 0)
			{
				reflectionRayColorMask = rayColorMask * 0.04;// * Re;
				reflectionRayDirection = reflect(rayDirection, shadingNormal); // reflect ray from surface
				reflectionRayOrigin = intersectionPoint + shadingNormal * uEPS_intersect;
				willNeedReflectionRay = TRUE;
			}

			if (bounces == 1 && previousIntersectionMaterialType == TRANSPARENT)
			{
				reflectionRayColorMask2 = rayColorMask * 0.04;// * Re;
				reflectionRayDirection2 = reflect(rayDirection, shadingNormal); // reflect ray from surface
				reflectionRayOrigin2 = intersectionPoint + shadingNormal * uEPS_intersect;
				willNeedReflectionRay2 = TRUE;
			}

			if (bounces == 2 && previousIntersectionMaterialType == TRANSPARENT)
			{
				reflectionRayColorMask3 = rayColorMask * 0.04;// * Re;
				reflectionRayDirection3 = reflect(rayDirection, shadingNormal); // reflect ray from surface
				reflectionRayOrigin3 = intersectionPoint + shadingNormal * uEPS_intersect;
				willNeedReflectionRay3 = TRUE;
			}

			ambientColor = vec3(0);
			diffuseColor = vec3(0);

			diffuseIntensity = max(0.0, dot(shadingNormal, directionToLight));
			specularColor = doBlinnPhongSpecularLighting(rayColorMask, shadingNormal, halfwayVector, sunlightColor * 1.5, 0.5, diffuseIntensity);
			if (bounces == 0)
				accumulatedColor += specularColor;
			else accumulatedColor += specularColor * 0.2;
			specularColor = vec3(0);

			// transmit ray through surface
			//rayColorMask *= intersectionMaterial.color;
			//rayColorMask *= Tr;
			rayColorMask *= 0.95;
			
			tdir = refract(rayDirection, shadingNormal, ratioIoR);
			rayDirection = tdir;
			rayOrigin = intersectionPoint - shadingNormal * uEPS_intersect;
			bounceIsSpecular = TRUE;
			
			continue;
			
		} // end if (intersectionMaterial.type == TRANSPARENT)
		
	} // end for (int bounces = 0; bounces < 12; bounces++)
	
	
	return max(vec3(0), accumulatedColor);

} // end vec3 RayTrace()


//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
	Material yellowRedCheckerMaterial = Material(DIFFUSE, TRUE, vec3(1,1,0) * 0.8, vec3(1,0,0) * 0.8, 0.0, 0.0, 0.0, -1);
	Material yellowClearCoatMaterial = Material(CLEARCOAT, FALSE, vec3(1.0, 0.85, 0.0), vec3(0), 0.0, 0.0, 1.4, -1);
	Material glassMaterial0 = Material(TRANSPARENT, FALSE, vec3(1), vec3(0), 0.0, 0.0, 1.01, -1);
	Material glassMaterial1 = Material(TRANSPARENT, FALSE, vec3(1), vec3(0), 0.0, 0.0, 1.04, -1);

	vec3 glassSpherePos = vec3(-10, 78, 70);
        vec3 yellowSpherePos = glassSpherePos + vec3(0,-19, 5);
	//vec3 yellowSpherePos = glassSpherePos + vec3(50,-25, 70);
        float orbitRadius = 70.0;
	float testTime = 2.0;
        spheres[0] = Sphere( 28.0, glassSpherePos, vec2(1, 1), glassMaterial0);//glass sphere, radius=28.0
	spheres[1] = Sphere( 26.5, glassSpherePos, vec2(1, 1), glassMaterial1);//glass sphere, radius=26.5
	spheres[2] = Sphere( 27.0, yellowSpherePos + vec3(-cos(mod(uTime * 1.1, TWO_PI)) * orbitRadius, 0, sin(mod(uTime * 1.1, TWO_PI)) * orbitRadius), 
				vec2(2, 2), yellowClearCoatMaterial);//yellow reflective sphere
	
	rectangles[0] = Rectangle(vec3(100, 0, -100), vec3(0,1,0), vec3(1,0,0), vec3(0,0,-1), 200.0, 400.0, vec2(16, 32), yellowRedCheckerMaterial); // Checkerboard Ground plane 
}


#include <raytracing_main>