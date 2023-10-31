precision highp float;
precision highp int;
precision highp sampler2D;

#include <raytracing_uniforms_and_defines>

uniform sampler2D uUVGridTexture;
uniform float uRoughness;

#define N_BOXES 1
#define N_SPHERES 5
#define N_RECTANGLES 1

vec3 rayOrigin, rayDirection;
// recorded intersection data:
vec3 intersectionNormal;
vec2 intersectionUV;
int intersectionTextureID;

struct Material { int type; vec3 color; float roughness; float IoR; int textureID; vec2 uvScale; };
struct Rectangle { vec3 position; vec3 normal; vec3 vectorU; vec3 vectorV; float radiusU; float radiusV; Material material; };
struct Box { vec3 minCorner; vec3 maxCorner; Material material; };
struct Sphere { float radius; vec3 position; Material material; };

Material intersectionMaterial;
Rectangle rectangles[N_RECTANGLES];
Box boxes[N_BOXES];
Sphere spheres[N_SPHERES];


#include <raytracing_random_functions>

#include <raytracing_calc_fresnel_reflectance>

#include <raytracing_rectangle_intersect>

#include <raytracing_box_intersect>

#include <raytracing_solve_quadratic>

#include <raytracing_sphere_intersect>


//---------------------------------------------------------------------------------------
float SceneIntersect( int isShadowRay )
//---------------------------------------------------------------------------------------
{
	
	vec3 rObjOrigin, rObjDirection; 
	vec3 normal;
        float d;
	float t = INFINITY;
	float u, v;
	int isRayExiting = FALSE;

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

	for (int i = 0; i < N_RECTANGLES; i++)
        {
		d = RectangleIntersect( rectangles[i].position, rectangles[i].normal, rectangles[i].vectorU, rectangles[i].vectorV, 
			rectangles[i].radiusU, rectangles[i].radiusV, rayOrigin, rayDirection, u, v );
		if (d < t)
		{
			t = d;
			intersectionNormal = rectangles[i].normal;
			intersectionMaterial = rectangles[i].material;
			intersectionUV = vec2(u, v) * intersectionMaterial.uvScale;
		}
	}
	
	for (int i = 0; i < N_SPHERES; i++)
        {
		d = SphereIntersect( spheres[i].radius, spheres[i].position, rayOrigin, rayDirection );
		if (d < t)
		{
			t = d;
			intersectionNormal = (rayOrigin + t * rayDirection) - spheres[i].position;
			intersectionMaterial = spheres[i].material;
		}
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
        Material lightMaterial = spheres[0].material;

	vec3 accumulatedColor = vec3(0);
        vec3 rayColorMask = vec3(1);
	vec3 reflectionRayOrigin, reflectionRayDirection;
	vec3 reflectionRayColorMask;
        vec3 geometryNormal, shadingNormal;
	vec3 intersectionPoint;
	vec3 directionToLight;
	vec3 halfVector;
	vec3 ambientContribution = vec3(0);
	vec3 diffuseContribution = vec3(0);
	vec3 specularContribution = vec3(0);
	vec3 textureColor;
	vec3 initialSkyColor = getSkyColor(rayDirection);
	vec3 skyColor;

	float t = INFINITY;
	float initial_t = INFINITY;
	float ambientIntensity = 0.02;
	float diffuseFalloff = 0.0;
	float specularFalloff = 0.0;
	float shininessExponent = 0.0;
	float fogStart = 20.0;
	float reflectance;
	float IoR_ratio;
	float transparentThickness;

	int isShadowRay = FALSE;
	int willNeedReflectionRay = FALSE;
	int previousIntersectionMaterialType;
	
	intersectionMaterial.type = -100;


	for (int bounces = 0; bounces < 5; bounces++)
	{
		previousIntersectionMaterialType = intersectionMaterial.type;

		t = SceneIntersect( isShadowRay );

		initial_t = bounces == 0 ? t : initial_t;

		if (t == INFINITY)
		{
			if (bounces == 0)
			{
				accumulatedColor = initialSkyColor;
				break;
			}
			
			skyColor = getSkyColor(rayDirection);

			accumulatedColor += rayColorMask * skyColor;
			//accumulatedColor += diffuseContribution;
			accumulatedColor += specularContribution;

			if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;
				willNeedReflectionRay = FALSE;
				isShadowRay = FALSE;
				continue;
			}

			break;
		}

		
		if (intersectionMaterial.type == POINT_LIGHT)
		{	
			if (bounces == 0)
				accumulatedColor = lightMaterial.color;
			else
			{
				accumulatedColor += specularContribution;
			}

			if (isShadowRay == TRUE)
			{
				accumulatedColor += diffuseContribution;
				//accumulatedColor += specularContribution;// already done above
			}
			
			if (willNeedReflectionRay == TRUE)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;
				willNeedReflectionRay = FALSE;
				isShadowRay = FALSE;
				continue;
			}
			
			// reached a light source, so we can exit
			break;
		}

		// if we get here and isShadowRay == TRUE, that means the shadow ray failed to find
		// the light source. This surface will be rendered in shadow (ambient contribution only)
		if (isShadowRay == TRUE && intersectionMaterial.type != TRANSPARENT)
		{
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
		geometryNormal = normalize(intersectionNormal);
                shadingNormal = dot(geometryNormal, rayDirection) < 0.0 ? geometryNormal : -geometryNormal;
		intersectionPoint = rayOrigin + t * rayDirection;
		directionToLight = normalize(spheres[0].position - intersectionPoint);

		
		if (intersectionMaterial.textureID > -1)
		{
			textureColor = texture(uUVGridTexture, intersectionUV).rgb;
			textureColor *= textureColor;
			intersectionMaterial.color *= textureColor;
		}
		
                if (intersectionMaterial.type == PHONG)
                {
			ambientContribution = rayColorMask * intersectionMaterial.color;
			ambientContribution *= ambientIntensity;
			accumulatedColor += ambientContribution;
			
			diffuseContribution = rayColorMask * intersectionMaterial.color;
			diffuseContribution *= lightMaterial.color;
			diffuseFalloff = max(0.0, dot(shadingNormal, directionToLight));
			diffuseContribution *= diffuseFalloff;

			specularContribution = rayColorMask;
			specularContribution *= lightMaterial.color;
			halfVector = normalize(-rayDirection + directionToLight);
			shininessExponent = 8.0 / max(0.001, intersectionMaterial.roughness * intersectionMaterial.roughness);
			specularFalloff = pow(max(0.0, dot(shadingNormal, halfVector)), shininessExponent);
			specularContribution *= specularFalloff;
			specularContribution *= (1.0 - intersectionMaterial.roughness);

			isShadowRay = TRUE;
			rayOrigin = intersectionPoint + uEPS_intersect * shadingNormal;
			rayDirection = directionToLight;
			continue;
                }
		
                if (intersectionMaterial.type == METAL)
		{
			// tint ray color with metal color
			rayColorMask *= intersectionMaterial.color;
			
			specularContribution = rayColorMask;
			specularContribution *= lightMaterial.color;
			halfVector = normalize(-rayDirection + directionToLight);
			shininessExponent = 8.0 / max(0.001, intersectionMaterial.roughness * intersectionMaterial.roughness);
			specularFalloff = pow(max(0.0, dot(shadingNormal, halfVector)), shininessExponent);
			specularContribution *= specularFalloff;
			specularContribution *= (1.0 - intersectionMaterial.roughness);
			accumulatedColor += specularContribution;

			rayColorMask *= clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0);
			rayOrigin = intersectionPoint + uEPS_intersect * shadingNormal;
			rayDirection = reflect(rayDirection, shadingNormal);
			
			continue;
		}

		if (intersectionMaterial.type == CLEARCOAT_DIFFUSE)
		{
			intersectionMaterial.IoR = mix(1.0, 1.5, clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0));
			reflectance = calcFresnelReflectance(rayDirection, shadingNormal, 1.0, intersectionMaterial.IoR, IoR_ratio);

			ambientContribution = rayColorMask * intersectionMaterial.color;
			ambientContribution *= ambientIntensity;
			accumulatedColor += ambientContribution;

			diffuseContribution = rayColorMask * intersectionMaterial.color;
			diffuseContribution *= lightMaterial.color;
			diffuseFalloff = max(0.0, dot(shadingNormal, directionToLight));
			diffuseContribution *= diffuseFalloff;
			diffuseContribution *= (1.0 - reflectance);

			specularContribution = rayColorMask;
			specularContribution *= lightMaterial.color;
			halfVector = normalize(-rayDirection + directionToLight);
			shininessExponent = 8.0 / max(0.001, intersectionMaterial.roughness * intersectionMaterial.roughness);
			specularFalloff = pow(max(0.0, dot(shadingNormal, halfVector)), shininessExponent);
			specularContribution *= specularFalloff;
			specularContribution *= (1.0 - intersectionMaterial.roughness);

			if (bounces == 0)
			{
				willNeedReflectionRay = TRUE;
				reflectionRayColorMask = rayColorMask * reflectance * clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0);
				reflectionRayOrigin = intersectionPoint + uEPS_intersect * shadingNormal;
				reflectionRayDirection = reflect(rayDirection, shadingNormal);
			}
			
			isShadowRay = TRUE;
			rayOrigin = intersectionPoint + uEPS_intersect * shadingNormal;
			rayDirection = directionToLight;

			continue;
		}

		if (intersectionMaterial.type == TRANSPARENT)
		{
			reflectance = calcFresnelReflectance(rayDirection, geometryNormal, 1.0, intersectionMaterial.IoR, IoR_ratio);

			specularContribution = rayColorMask;
			specularContribution *= lightMaterial.color;
			halfVector = normalize(-rayDirection + directionToLight);
			shininessExponent = 8.0 / max(0.001, intersectionMaterial.roughness * intersectionMaterial.roughness);
			specularFalloff = pow(max(0.0, dot(shadingNormal, halfVector)), shininessExponent);
			specularContribution *= specularFalloff;
			specularContribution *= (1.0 - intersectionMaterial.roughness);
			if (isShadowRay == TRUE)
				specularContribution = vec3(0);
			accumulatedColor += specularContribution;

			if (bounces == 0)
			{
				willNeedReflectionRay = TRUE;
				reflectionRayColorMask = rayColorMask * reflectance * clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0);
				reflectionRayOrigin = intersectionPoint + uEPS_intersect * shadingNormal;
				reflectionRayDirection = reflect(rayDirection, shadingNormal);
			}
			if (reflectance == 1.0)
			{
				rayColorMask = reflectionRayColorMask;
				rayOrigin = reflectionRayOrigin;
				rayDirection = reflectionRayDirection;

				willNeedReflectionRay = FALSE;
				isShadowRay = FALSE;
				continue;
			}

			// is ray leaving a solid object from the inside? 
			// If so, attenuate ray color with object color by how far ray has travelled through the medium
			if (distance(geometryNormal, shadingNormal) > 0.1)
			{
				transparentThickness = 0.2;
				rayColorMask *= exp( log(clamp(intersectionMaterial.color, 0.01, 0.99)) * transparentThickness * t ); 
			}
			
			rayColorMask *= (1.0 - reflectance);
			rayColorMask *= clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0);

			if (isShadowRay == FALSE) // do usual refraction
			{
				rayOrigin = intersectionPoint - uEPS_intersect * shadingNormal;
				rayDirection = refract(rayDirection, shadingNormal, IoR_ratio);
			}
			else // special case: shadow rays are allowed to penetrate un-refracted, in order to generate 'shadow' caustics
			{
				diffuseContribution *= intersectionMaterial.color;
				diffuseContribution *= (1.0 - reflectance);
				diffuseContribution *= clamp(1.0 - (intersectionMaterial.roughness * 1.2), 0.001, 1.0);
				rayOrigin = intersectionPoint + uEPS_intersect * rayDirection; // nudge through surface to avoid self-intersection
				rayDirection = rayDirection; // ray direction is unchanged and is allowed to pass through (un-refracted)
			}
			
			continue;
		}
		
	} // end for (int bounces = 0; bounces < 5; bounces++)
	

	if (initial_t < INFINITY)
	{
		initial_t -= fogStart;
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
	float lightPower = 2.0;
	Material lightMaterial = Material(POINT_LIGHT, vec3(1.0, 1.0, 1.0) * lightPower, 0.0, 0.0, -1, vec2(1, 1));
	Material blueMaterial = Material(CLEARCOAT_DIFFUSE, vec3(0.01, 0.01, 1.0), uRoughness, 0.0, -1, vec2(1, 1));
	Material redMaterial = Material(PHONG, vec3(1.0, 0.01, 0.01), uRoughness, 0.0, -1, vec2(1, 1));
	Material groundMaterial = Material(CLEARCOAT_DIFFUSE, vec3(1.0), 0.0, 0.0, 0, vec2(100, 100));
	Material metalMaterial = Material(METAL, vec3(1.000, 0.766, 0.336), uRoughness, 0.0, -1, vec2(1, 1));
	Material glassMaterial = Material(TRANSPARENT, vec3(0.4, 1.0, 0.6), uRoughness, 1.5, -1, vec2(1, 1));

	vec3 lightPosition = vec3(4, 10, 5);
	boxes[0] = Box(lightPosition - vec3(0.5), lightPosition + vec3(0.5), lightMaterial);

	rectangles[0] = Rectangle(vec3(0, 0, 0), normalize(vec3(0,1,0)), vec3(0), vec3(0), 1000.0, 1000.0, groundMaterial);
	rectangles[0].vectorU = normalize(cross(abs(rectangles[0].normal.y) < 0.9 ? vec3(0,1,0) : vec3(0,0,-1), rectangles[0].normal));
	rectangles[0].vectorV = cross(rectangles[0].vectorU, rectangles[0].normal);

	spheres[0] = Sphere(0.2, lightPosition, lightMaterial);
	spheres[1] = Sphere(4.0, vec3(0, 4, 0), blueMaterial);
	spheres[2] = Sphere(3.0, vec3(-10, 3, 0), metalMaterial);
	spheres[3] = Sphere(4.0, vec3(10, 4, 0), redMaterial);
	spheres[4] = Sphere(4.0, vec3(-15, 4, 10), glassMaterial);
}


#include <raytracing_main>