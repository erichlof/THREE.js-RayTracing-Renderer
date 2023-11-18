THREE.ShaderChunk[ 'raytracing_uniforms_and_defines' ] = `
uniform sampler2D uPreviousTexture;
uniform sampler2D uBlueNoiseTexture;
uniform mat4 uCameraMatrix;
uniform vec2 uResolution;
uniform vec2 uRandomVec2;
uniform float uEPS_intersect;
uniform float uTime;
uniform float uSampleCounter;
uniform float uFrameCounter;
uniform float uULen;
uniform float uVLen;
uniform float uApertureSize;
uniform float uFocusDistance;
uniform float uPreviousSampleCount;
uniform bool uCameraIsMoving;
uniform bool uUseOrthographicCamera;

in vec2 vUv;

#define PI               3.14159265358979323
#define TWO_PI           6.28318530717958648
#define FOUR_PI          12.5663706143591729
#define ONE_OVER_PI      0.31830988618379067
#define ONE_OVER_TWO_PI  0.15915494309
#define ONE_OVER_FOUR_PI 0.07957747154594767
#define PI_OVER_TWO      1.57079632679489662
#define ONE_OVER_THREE   0.33333333333333333
#define E                2.71828182845904524
#define INFINITY         1000000.0
#define QUADRIC_EPSILON  0.00001
#define SPOT_LIGHT -2
#define POINT_LIGHT -1
#define DIRECTIONAL_LIGHT 0
#define PHONG 1
#define METAL 2
#define CLEARCOAT 3
#define TRANSPARENT 4
#define TRUE 1
#define FALSE 0
`;


THREE.ShaderChunk[ 'raytracing_core_functions' ] = `
// globals used in rand() function
vec4 randVec4; // samples and holds the RGBA blueNoise texture value for this pixel
float randNumber; // the final randomly generated number (range: 0.0 to 1.0)
float counter; // will get incremented by 1 on each call to rand()
int channel; // the final selected color channel to use for rand() calc (range: 0 to 3, corresponds to R,G,B, or A)
float rand()
{
	counter++; // increment counter by 1 on every call to rand()
	// cycles through channels, if modulus is 1.0, channel will always be 0 (the R color channel)
	channel = int(mod(counter, 2.0)); 
	// but if modulus was 4.0, channel will cycle through all available channels: 0,1,2,3,0,1,2,3, and so on...
	randNumber = randVec4[channel]; // get value stored in channel 0:R, 1:G, 2:B, or 3:A
	return fract(randNumber); // we're only interested in randNumber's fractional value between 0.0 (inclusive) and 1.0 (non-inclusive)
	//return clamp(randNumber,0.0,0.999999999); // we're only interested in randNumber's fractional value between 0.0 (inclusive) and 1.0 (non-inclusive)
}
// from iq https://www.shadertoy.com/view/4tXyWN
// global seed used in rng() function
uvec2 seed;
float rng()
{
	seed += uvec2(1);
    	uvec2 q = 1103515245U * ( (seed >> 1U) ^ (seed.yx) );
    	uint  n = 1103515245U * ( (q.x) ^ (q.y >> 3U) );
	return float(n) * (1.0 / float(0xffffffffU));
}

// tentFilter from Peter Shirley's 'Realistic Ray Tracing (2nd Edition)' book, pg. 60
float tentFilter(float x) // input: x: a random float(0.0 to 1.0), output: a filtered float (-1.0 to +1.0)
{
	return (x < 0.5) ? sqrt(2.0 * x) - 1.0 : 1.0 - sqrt(2.0 - (2.0 * x));
}

vec3 doAmbientLighting(vec3 rayColorMask, float ambientIntensity, Material surfaceMaterial)
{
	vec3 ambientLighting = rayColorMask * surfaceMaterial.color;
	ambientLighting *= ambientIntensity;
	return ambientLighting;
}

vec3 doDiffuseDirectLighting(vec3 rayColorMask, vec3 surfaceNormal, vec3 directionToLight, vec3 lightColor, Material surfaceMaterial, out float diffuseFalloff)
{
	vec3 diffuseLighting = rayColorMask * surfaceMaterial.color;
	diffuseLighting *= lightColor;
	// next, do typical Lambertian diffuse lighting (NdotL)
	diffuseFalloff = max(0.0, dot(surfaceNormal, directionToLight));
	diffuseLighting *= diffuseFalloff;
	return diffuseLighting;
}

vec3 doBlinnPhongSpecularLighting(vec3 rayColorMask, vec3 rayDirection, vec3 surfaceNormal, vec3 directionToLight, vec3 lightColor, Material surfaceMaterial)
{
	// for dielectric materials (non-conductors), specular color is unaffected by surface color
	// for metal materials (conductors) however, specular color gets tinted by the metal surface color
	// therefore, in the metal case, 'rayColorMask' will get pre-tinted before it is passed into this function
	vec3 specularLighting = rayColorMask; // will either be white for dielectrics (usually vec3(1,1,1)), or tinted by metal color for metallics
	specularLighting *= clamp(lightColor, 0.0, 4.0);
	vec3 halfwayVector = normalize(-rayDirection + directionToLight); // this is Blinn's modification to Phong's model
	float shininessExponent = 8.0 / max(0.001, surfaceMaterial.roughness * surfaceMaterial.roughness); // roughness squared produces smoother transition
	float specularFalloff = pow(max(0.0, dot(surfaceNormal, halfwayVector)), shininessExponent); // this is a powered cosine with shininess as the exponent
	specularLighting *= specularFalloff;
	specularLighting *= (1.0 - surfaceMaterial.roughness); // makes specular highlights fade away as surface roughness increases
	return mix(vec3(0), specularLighting, max(0.0, dot(surfaceNormal, directionToLight)));
}

float calcFresnelReflectance(vec3 rayDirection, vec3 n, float etai, float etat, out float IoR_ratio)
{
	float temp = etai;
	float cosi = clamp(dot(rayDirection, n), -1.0, 1.0);
	if (cosi > 0.0)
	{
		etai = etat;
		etat = temp;
	}
	
	IoR_ratio = etai / etat;
	float sint2 = IoR_ratio * IoR_ratio * (1.0 - (cosi * cosi));
	if (sint2 >= 1.0) 
		return 1.0; // total internal reflection
	float cost = sqrt(1.0 - sint2);
	cosi = abs(cosi);
	float Rs = ((etat * cosi) - (etai * cost)) / ((etat * cosi) + (etai * cost));
	float Rp = ((etai * cosi) - (etat * cost)) / ((etai * cosi) + (etat * cost));
	return clamp( ((Rs * Rs) + (Rp * Rp)) * 0.5, 0.0, 1.0 );
}

vec2 calcSphereUV(vec3 pointOnSphere, float sphereRadius, vec3 spherePosition)
{
	vec3 normalizedPoint = pointOnSphere - spherePosition;
	normalizedPoint *= (1.0 / sphereRadius);
	float phi = atan(-normalizedPoint.z, normalizedPoint.x);
	float theta = acos(normalizedPoint.y);
	float u = phi * ONE_OVER_TWO_PI + 0.5;
	float v = theta * ONE_OVER_PI;
	return vec2(u, v);
}

vec2 calcUnitSphereUV(vec3 pointOnUnitSphere)
{
	float phi = atan(-pointOnUnitSphere.z, pointOnUnitSphere.x);
	float theta = acos(pointOnUnitSphere.y);
	float u = phi * ONE_OVER_TWO_PI + 0.5;
	float v = theta * ONE_OVER_PI;
	return vec2(u, v);
}

vec2 calcCylinderUV(vec3 pointOnCylinder, float cylinderHeightRadius, vec3 cylinderPosition)
{
	vec3 normalizedPoint = pointOnCylinder - cylinderPosition;
	// must compute theta before normalizing the intersection point
	float theta = normalizedPoint.y / (cylinderHeightRadius * 2.0);
	normalizedPoint = normalize(normalizedPoint);
	float phi = atan(-normalizedPoint.z, normalizedPoint.x);
	float u = phi * ONE_OVER_TWO_PI + 0.5;
	float v = -theta + 0.5; // -theta flips upside-down texture images
	return vec2(u, v);
}

vec2 calcUnitCylinderUV(vec3 pointOnUnitCylinder)
{
	float phi = atan(-pointOnUnitCylinder.z, pointOnUnitCylinder.x);
	float theta = pointOnUnitCylinder.y * 0.5;
	float u = phi * ONE_OVER_TWO_PI + 0.5;
	float v = -theta + 0.5; // -theta flips upside-down texture images
	return vec2(u, v);
}

vec2 calcUnitBoxUV(vec3 pointOnUnitBox, vec3 normal, vec3 boxScale)
{ // this is a simple tri-planar mapping: if the box normal points to the right or left, use z and x as uv coordinates.
// If normal points up or down, use x and z as uv coordinates. If normal points forward and backward, use x and y as uv coordinates.
	     if (normal.z > 0.0)
		return (vec2( pointOnUnitBox.x, -pointOnUnitBox.y) * 0.5 + 0.5) * vec2(boxScale.x, boxScale.y);
	else if (normal.z < 0.0) 
		return (vec2(-pointOnUnitBox.x, -pointOnUnitBox.y) * 0.5 + 0.5) * vec2(boxScale.x, boxScale.y);
	else if (normal.y > 0.0) 
		return (vec2( pointOnUnitBox.x,  pointOnUnitBox.z) * 0.5 + 0.5) * vec2(boxScale.x, boxScale.z);
	else if (normal.y < 0.0) 
		return (vec2( pointOnUnitBox.x, -pointOnUnitBox.z) * 0.5 + 0.5) * vec2(boxScale.x, boxScale.z);
	else if (normal.x > 0.0) 
		return (vec2(-pointOnUnitBox.z, -pointOnUnitBox.y) * 0.5 + 0.5) * vec2(boxScale.z, boxScale.y);
	else // (normal.x < 0.0)
		return (vec2( pointOnUnitBox.z, -pointOnUnitBox.y) * 0.5 + 0.5) * vec2(boxScale.z, boxScale.y);
}

// optimized algorithm for solving quadratic equations developed by Dr. Po-Shen Loh -> https://youtu.be/XKBX0r3J-9Y
// Adapted to root finding (ray t0/t1) for all quadric shapes (sphere, ellipsoid, cylinder, cone, etc.) by Erich Loftis
void solveQuadratic(float A, float B, float C, out float t0, out float t1)
{
	float invA = 1.0 / A;
	B *= invA;
	C *= invA;
	float neg_halfB = -B * 0.5;
	float u2 = neg_halfB * neg_halfB - C;
	float u = u2 < 0.0 ? neg_halfB = 0.0 : sqrt(u2);
	t0 = neg_halfB - u;
	t1 = neg_halfB + u;
}
`;

THREE.ShaderChunk[ 'raytracing_main' ] = `

void main( void )
{
	vec3 camRight   = vec3( uCameraMatrix[0][0],  uCameraMatrix[0][1],  uCameraMatrix[0][2]);
	vec3 camUp      = vec3( uCameraMatrix[1][0],  uCameraMatrix[1][1],  uCameraMatrix[1][2]);
	vec3 camForward = vec3(-uCameraMatrix[2][0], -uCameraMatrix[2][1], -uCameraMatrix[2][2]);
	// the following is not needed - three.js has a built-in uniform named cameraPosition
	//vec3 camPos   = vec3( uCameraMatrix[3][0],  uCameraMatrix[3][1],  uCameraMatrix[3][2]);

	// calculate unique seed for rng() function
	seed = uvec2(uFrameCounter, uFrameCounter + 1.0) * uvec2(gl_FragCoord.xy);
	// initialize rand() variables
	counter = -1.0; // will get incremented by 1 on each call to rand()
	channel = 0; // the final selected color channel to use for rand() calc (range: 0 to 3, corresponds to R,G,B, or A)
	randNumber = 0.0; // the final randomly-generated number (range: 0.0 to 1.0)
	randVec4 = vec4(0); // samples and holds the RGBA blueNoise texture value for this pixel
	randVec4 = texelFetch(uBlueNoiseTexture, ivec2(mod(floor(gl_FragCoord.xy) + floor(uRandomVec2 * 256.0), 256.0)), 0);
	
	vec2 pixelOffset;
	
	// pixelOffset = vec2( tentFilter(uRandomVec2.x), tentFilter(uRandomVec2.y) );
	// pixelOffset *= uCameraIsMoving ? 0.5 : 1.0;
	if (uSampleCounter < 100.0)
	{
		pixelOffset = vec2( tentFilter(rand()), tentFilter(rand()) );
		pixelOffset *= uCameraIsMoving ? 0.5 : 1.0;
	}	
	else pixelOffset = vec2( tentFilter(uRandomVec2.x), tentFilter(uRandomVec2.y) );
	
	// we must map pixelPos into the range -1.0 to +1.0: (-1.0,-1.0) is bottom-left screen corner, (1.0,1.0) is top-right
	vec2 pixelPos = ((gl_FragCoord.xy + vec2(0.5) + pixelOffset) / uResolution) * 2.0 - 1.0;

	vec3 rayDir = uUseOrthographicCamera ? camForward :
		      normalize( pixelPos.x * camRight * uULen + pixelPos.y * camUp * uVLen + camForward ); 
					       
	// depth of field
	vec3 focalPoint = uFocusDistance * rayDir;
	float randomAngle = rng() * TWO_PI; // pick random point on aperture
	float randomRadius = rng() * uApertureSize;
	vec3  randomAperturePos = ( cos(randomAngle) * camRight + sin(randomAngle) * camUp ) * sqrt(randomRadius);
	// point on aperture to focal point
	vec3 finalRayDir = normalize(focalPoint - randomAperturePos);

	rayOrigin = cameraPosition + randomAperturePos;
	rayOrigin += !uUseOrthographicCamera ? vec3(0) : 
		     (camRight * pixelPos.x * uULen * 100.0) + (camUp * pixelPos.y * uVLen * 100.0);
					     
	rayDirection = finalRayDir;
	

	SetupScene();

	// perform ray tracing and get resulting color for this pixel
	vec4 currentPixel = vec4(RayTrace(), 1.0);
	// get the previous color for this pixel, which was saved in the PreviousTexture (accumulation buffer)
	vec4 previousPixel = texelFetch(uPreviousTexture, ivec2(gl_FragCoord.xy), 0);

	if (uFrameCounter == 1.0) // camera just moved after being still
	{
		previousPixel.rgb *= (1.0 / uPreviousSampleCount) * 0.5; // essentially previousPixel *= 0.5, like below
		currentPixel.rgb *= 0.5;
	}
	else if (uCameraIsMoving) // camera is currently moving
	{
		previousPixel.rgb *= 0.5; // motion-blur trail amount (old image)
		currentPixel.rgb *= 0.5; // brightness of new image (noisy)
	}

	pc_fragColor = vec4(previousPixel.rgb + currentPixel.rgb, currentPixel.a);
}
`;

THREE.ShaderChunk[ 'raytracing_plane_intersect' ] = `
//-----------------------------------------------------------------------
float PlaneIntersect( vec4 pla, vec3 rayOrigin, vec3 rayDirection )
//-----------------------------------------------------------------------
{
	vec3 n = pla.xyz;
	float denom = dot(n, rayDirection);
	
        vec3 pOrO = (pla.w * n) - rayOrigin; 
        float result = dot(pOrO, n) / denom;
	return (result > 0.0) ? result : INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_single_sided_plane_intersect' ] = `
//----------------------------------------------------------------------------
float SingleSidedPlaneIntersect( vec4 pla, vec3 rayOrigin, vec3 rayDirection )
//----------------------------------------------------------------------------
{
	vec3 n = pla.xyz;
	float denom = dot(n, rayDirection);
	if (denom > 0.0) return INFINITY;
	
        vec3 pOrO = (pla.w * n) - rayOrigin; 
        float result = dot(pOrO, n) / denom;
	return (result > 0.0) ? result : INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_disk_intersect' ] = `
//-------------------------------------------------------------------------------------------
float DiskIntersect( float radius, vec3 pos, vec3 normal, vec3 rayOrigin, vec3 rayDirection )
//-------------------------------------------------------------------------------------------
{
	vec3 pOrO = pos - rayOrigin;
	float denom = dot(-normal, rayDirection);
	// use the following for one-sided disk
	//if (denom <= 0.0) return INFINITY;
	
        float result = dot(pOrO, -normal) / denom;
	if (result < 0.0) return INFINITY;
        vec3 intersectPos = rayOrigin + rayDirection * result;
	vec3 v = intersectPos - pos;
	float d2 = dot(v,v);
	float radiusSq = radius * radius;
	if (d2 > radiusSq)
		return INFINITY;
		
	return result;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_disk_intersect' ] = `

//----------------------------------------------------------------------------------------------------------------
float UnitDiskIntersect( vec3 rayOrigin, vec3 rayDirection, out float u, out float v )
//----------------------------------------------------------------------------------------------------------------
{
	// for the unit disk that is located at the origin(vec3(0,0,0)), it's normal is vec3(0,0,1), which points directly towards our camera
	float denom = dot(vec3(0,0,1), rayDirection);
	// use the following for one-sided disk
	//if (denom > 0.0) return INFINITY;

	// normally it would be pOrO = diskPos - rayOrigin, and then t = dot(pOrO, normal) / denom
	// but since this is a unit disk located at the world origin, pOrO = vec3(0,0,0) - rayOrigin, or just -rayOrigin
        float t = dot(-rayOrigin, vec3(0,0,1)) / denom;
	vec3 hit = rayOrigin + t * rayDirection;

	if (t > 0.0) 
	{
		u = hit.x; // u will be in the range: -1 to +1
		v = -hit.y; // v will be in the range: -1 to +1 (-hit.y flips the vertical so textures don't appear upside down)
		if (u * u + v * v <= 1.0)
		{
			u = u * 0.5 + 0.5; // finally, bring u into the 0.0-1.0 range, for texture lookups
			v = v * 0.5 + 0.5; // finally, bring v into the 0.0-1.0 range, for texture lookups
			return t;
		}	
	} 
	
	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_rectangle_intersect' ] = `

/* //----------------------------------------------------------------------------------------------------------------
float RectangleIntersect( vec3 pos, vec3 normal, float radiusU, float radiusV, vec3 rayOrigin, vec3 rayDirection )
//----------------------------------------------------------------------------------------------------------------
{
	float dt = dot(-normal, rayDirection);
	// use the following for one-sided rectangle
	if (dt < 0.0) return INFINITY;

	float t = dot(-normal, pos - rayOrigin) / dt;
	if (t < 0.0) return INFINITY;
	
	vec3 hit = rayOrigin + rayDirection * t;
	vec3 vi = hit - pos;
	vec3 U = normalize( cross( abs(normal.y) < 0.9 ? vec3(0, 1, 0) : vec3(0, 0, 1), normal ) );
	vec3 V = cross(normal, U);
	return (abs(dot(U, vi)) > radiusU || abs(dot(V, vi)) > radiusV) ? INFINITY : t;
} */

//----------------------------------------------------------------------------------------------------------------
float RectangleIntersect( vec3 pos, vec3 normal, vec3 vectorU, vec3 vectorV, float radiusU, float radiusV, vec3 rayOrigin, vec3 rayDirection, out float u, out float v )
//----------------------------------------------------------------------------------------------------------------
{
	float denom = dot(normal, rayDirection);
	// use the following for one-sided rectangle
	//if (denom > 0.0) return INFINITY;
	
        vec3 pOrO = pos - rayOrigin; 
        float t = dot(pOrO, normal) / denom;
	vec3 hit = (rayOrigin + t * rayDirection) - pos;

	if (t > 0.0) 
	{
		u = dot(hit, vectorU) / radiusU; // bring u into the range: -1 to +1
		v = dot(hit, vectorV) / radiusV; // bring v into the range: -1 to +1
		if (abs(u) <= 1.0 && abs(v) <= 1.0)
		{
			u = u * 0.5 + 0.5; // finally, bring u into the 0.0-1.0 range, for texture lookups
			v = v * 0.5 + 0.5; // finally, bring v into the 0.0-1.0 range, for texture lookups
			return t;
		}	
	} 
	
	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_rectangle_intersect' ] = `

//----------------------------------------------------------------------------------------------------------------
float UnitRectangleIntersect( vec3 rayOrigin, vec3 rayDirection, out float u, out float v )
//----------------------------------------------------------------------------------------------------------------
{
	// for the unit rectangle that is located at the origin(vec3(0,0,0)), it's normal is vec3(0,0,1), which points directly towards our camera
	float denom = dot(vec3(0,0,1), rayDirection);
	// use the following for one-sided rectangle
	//if (denom > 0.0) return INFINITY;

	// normally it would be pOrO = rectanglePos - rayOrigin, and then t = dot(pOrO, normal) / denom
	// but since this is a unit rectangle located at the world origin, pOrO = vec3(0,0,0) - rayOrigin, or just -rayOrigin
        float t = dot(-rayOrigin, vec3(0,0,1)) / denom;
	vec3 hit = rayOrigin + t * rayDirection;

	if (t > 0.0) 
	{
		u = hit.x; // u will be in the range: -1 to +1
		v = -hit.y; // v will be in the range: -1 to +1 (-hit.y flips the vertical so textures don't appear upside down)
		if (abs(u) <= 1.0 && abs(v) <= 1.0)
		{
			u = u * 0.5 + 0.5; // finally, bring u into the 0.0-1.0 range, for texture lookups
			v = v * 0.5 + 0.5; // finally, bring v into the 0.0-1.0 range, for texture lookups
			return t;
		}	
	} 
	
	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_slab_intersect' ] = `
//---------------------------------------------------------------------------------------------
float SlabIntersect( float radius, vec3 normal, vec3 rayOrigin, vec3 rayDirection, out vec3 n )
//---------------------------------------------------------------------------------------------
{
	n = dot(normal, rayDirection) < 0.0 ? normal : -normal;
	float rad = dot(rayOrigin, n) > radius ? radius : -radius; 
	float denom = dot(n, rayDirection);
	vec3 pOrO = (rad * n) - rayOrigin; 
	float t = dot(pOrO, n) / denom;
	return t > 0.0 ? t : INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_sphere_intersect' ] = `

//-----------------------------------------------------------------------------
float SphereIntersect( float rad, vec3 pos, vec3 rayOrigin, vec3 rayDirection )
//-----------------------------------------------------------------------------
{
	float t0, t1;
	vec3 L = rayOrigin - pos;
	float a = dot(rayDirection, rayDirection);
	float b = 2.0 * dot(rayDirection, L);
	float c = dot(L, L) - (rad * rad);
	solveQuadratic(a, b, c, t0, t1);
	return t0 > 0.0 ? t0 : t1 > 0.0 ? t1 : INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_bounding_sphere_intersect' ] = `

float UnitBoundingSphereIntersect( vec3 ro, vec3 rd, out int insideSphere )
{
	float t0, t1;
	float a = dot(rd, rd);
	float b = 2.0 * dot(rd, ro);
	float c = dot(ro, ro) - (1.01 * 1.01); // - (rad * rad) = - (1.0 * 1.0) = - 1.0 
	solveQuadratic(a, b, c, t0, t1);
	if (t0 > 0.0)
	{
		insideSphere = FALSE;
		return t0;
	}
	if (t1 > 0.0)
	{
		insideSphere = TRUE;
		return t1;
	}

	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_sphere_intersect' ] = `

float UnitSphereIntersect( vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float a = dot(rd, rd);
	float b = 2.0 * dot(rd, ro);
	float c = dot(ro, ro) - 1.0;// radius * radius = 1.0 * 1.0 = 1.0 
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	if (t0 > 0.0)
	{
		hitPoint = ro + rd * t0;
		n = hitPoint;
		//n = dot(rd, n) < 0.0 ? n : -n;
		return t0;
	}
	// if t0 was invalid, try t1
	if (t1 > 0.0)
	{
		hitPoint = ro + rd * t1;
		n = hitPoint;
		//n = dot(rd, n) < 0.0 ? n : -n;
		return t1;
	}

	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_cylinder_intersect' ] = `

float CylinderIntersect( float widthRadius, float heightRadius, vec3 position, vec3 rayO, vec3 rayD, out vec3 normal )
{
	vec3 hitPoint;
	vec3 L = rayO - position;
	float t0, t1;
	// Cylinder implicit equation
	// X^2 + Z^2 - r^2 = 0
	float a = (rayD.x * rayD.x) + (rayD.z * rayD.z);
	float b = 2.0 * ((rayD.x * L.x) + (rayD.z * L.z));
	float c = (L.x * L.x) + (L.z * L.z) - (widthRadius * widthRadius);

	solveQuadratic(a, b, c, t0, t1);

	hitPoint = rayO + t0 * rayD;
	if (t0 > 0.0 && hitPoint.y > (position.y - heightRadius) && hitPoint.y < (position.y + heightRadius))
	{
		normal = hitPoint - position;
		normal.y = 0.0;
		normal *= dot(normal, rayD) > 0.0 ? -1.0 : 1.0;
		return t0;
	}

	hitPoint = rayO + t1 * rayD;
	if (t1 > 0.0 && hitPoint.y > (position.y - heightRadius) && hitPoint.y < (position.y + heightRadius))
	{
		normal = hitPoint - position;
		normal.y = 0.0;
		normal *= dot(normal, rayD) > 0.0 ? -1.0 : 1.0;
		return t1;
	}

	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_cylinder_intersect' ] = `

float UnitCylinderIntersect( vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float a = rd.x * rd.x + rd.z * rd.z;
	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z);
	float c = (ro.x * ro.x + ro.z * ro.z) - 0.99;// 0.99 prevents clipping at cylinder walls 
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(hitPoint.x, 0.0, hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t0;
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(hitPoint.x, 0.0, hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t1;
	}

	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_capped_cylinder_intersect' ] = `

float UnitCappedCylinderIntersect( vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float t = INFINITY;
	float tmp;

	float a = rd.x * rd.x + rd.z * rd.z;
	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z);
	float c = (ro.x * ro.x + ro.z * ro.z) - 0.99;// 0.99 prevents clipping at cylinder walls 
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && t0 < t && abs(hitPoint.y) <= 1.0)
	{
		t = t0;
		n = vec3(hitPoint.x, 0.0, hitPoint.z);
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && t1 < t && abs(hitPoint.y) <= 1.0)
	{
		t = t1;
		n = vec3(hitPoint.x, 0.0, hitPoint.z);
	}
	// now intersect top and bottom disk caps
	// start by assuming ray is pointing downward
	t0 = (ro.y - 1.0) / -rd.y;
	t1 = (ro.y + 1.0) / -rd.y;
	if (rd.y > 0.0) // but if ray is pointing upward, then swap t0/t1
	{
		tmp = t0;
		t0 = t1;
		t1 = tmp;
	}

	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && t0 < t && hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z <= 1.0) // unit radius disk
	{
		t = t0;
		n = vec3(0, 1, 0);
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && t1 < t && hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z <= 1.0) // unit radius disk
	{
		t = t1;
		n = vec3(0, 1, 0);
	}

	n = dot(rd, n) < 0.0 ? n : -n;
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_cone_intersect' ] = `

float UnitConeIntersect( float apexRadius, vec3 ro, vec3 rd, out vec3 n )
{
	
	vec3 hitPoint;
	float t0, t1;
	float k = 1.0 - apexRadius; // k is the inverse of the cone's opening width (apex radius)
	// valid range for k: 0.01 to 1.0 (a value of 1.0 makes a cone with a sharp, pointed apex)
	k = clamp(k, 0.01, 1.0);
	
	float j = 1.0 / k;
	// the '(ro.y - h)' parts below truncate the top half of the double-cone, leaving a single cone with apex at top
	float h = j * 2.0 - 1.0;		   // (k * 0.25) makes the normal cone's bottom circular base have a unit radius of 1.0
	float a = j * rd.x * rd.x + j * rd.z * rd.z - (k * 0.25) * rd.y * rd.y;
    	float b = 2.0 * (j * rd.x * ro.x + j * rd.z * ro.z - (k * 0.25) * rd.y * (ro.y - h));
    	float c = j * ro.x * ro.x + j * ro.z * ro.z - (k * 0.25) * (ro.y - h) * (ro.y - h);
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(j * hitPoint.x, (k * 0.25) * (h - hitPoint.y), j * hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t0;
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(j * hitPoint.x, (k * 0.25) * (h - hitPoint.y), j * hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t1;
	}

	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_capped_cone_intersect' ] = `

float UnitCappedConeIntersect( float apexRadius, vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float t = INFINITY;
	float rad0, rad1;
	float tmp;

	float k = 1.0 - apexRadius; // k is the inverse of the cone's opening width (apex radius)
	// valid range for k: 0.01 to 1.0 (a value of 1.0 makes a cone with a sharp, pointed apex)
	k = clamp(k, 0.01, 1.0);
	
	float j = 1.0 / k;
	// the '(ro.y - h)' parts below truncate the top half of the double-cone, leaving a single cone with apex at top
	float h = j * 2.0 - 1.0;		   // (k * 0.25) makes the normal cone's bottom circular base have a unit radius of 1.0
	float a = j * rd.x * rd.x + j * rd.z * rd.z - (k * 0.25) * rd.y * rd.y;
    	float b = 2.0 * (j * rd.x * ro.x + j * rd.z * ro.z - (k * 0.25) * rd.y * (ro.y - h));
    	float c = j * ro.x * ro.x + j * ro.z * ro.z - (k * 0.25) * (ro.y - h) * (ro.y - h);
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && t0 < t && abs(hitPoint.y) <= 1.0)
	{
		t = t0;
		n = vec3(j * hitPoint.x, (k * 0.25) * (h - hitPoint.y), j * hitPoint.z);
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && t1 < t && abs(hitPoint.y) <= 1.0)
	{
		t = t1;
		n = vec3(j * hitPoint.x, (k * 0.25) * (h - hitPoint.y), j * hitPoint.z);
	}
	// now intersect top and bottom disk caps
	// start by assuming ray is pointing downward
	t0 = (ro.y - 1.0) / -rd.y;
	t1 = (ro.y + 1.0) / -rd.y;
	rad0 = (1.0 - k) * (1.0 - k); // top cap's size is relative to k
	rad1 = 1.0; // bottom cap is unit radius
	if (rd.y > 0.0) // but if ray is pointing upward, then swap t0/t1 and swap rad0/rad1
	{
		tmp = t0;
		t0 = t1;
		t1 = tmp;
		tmp = rad0;
		rad0 = rad1;
		rad1 = tmp;
	}

	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && t0 < t && hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z <= rad0)
	{
		t = t0;
		n = vec3(0, 1, 0);
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && t1 < t && hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z <= rad1)
	{
		t = t1;
		n = vec3(0, 1, 0);
	}

	n = dot(rd, n) < 0.0 ? n : -n;
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_paraboloid_intersect' ] = `

float UnitParaboloidIntersect( vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float k = 0.5;
	float a = rd.x * rd.x + rd.z * rd.z;
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z) + k * rd.y;
    	float c = ro.x * ro.x + (k * (ro.y - 1.0)) + ro.z * ro.z; 
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(2.0 * hitPoint.x, k, 2.0 * hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t0;
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(2.0 * hitPoint.x, k, 2.0 * hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t1;
	}

	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_capped_paraboloid_intersect' ] = `

float UnitCappedParaboloidIntersect( vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float t = INFINITY;
	
	float k = 0.5;

	float a = rd.x * rd.x + rd.z * rd.z;
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z) + k * rd.y;
    	float c = ro.x * ro.x + (k * (ro.y - 1.0)) + ro.z * ro.z; 
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && t0 < t && abs(hitPoint.y) <= 1.0)
	{
		t = t0;
		n = vec3(2.0 * hitPoint.x, k, 2.0 * hitPoint.z);
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && t1 < t && abs(hitPoint.y) <= 1.0)
	{
		t = t1;
		n = vec3(2.0 * hitPoint.x, k, 2.0 * hitPoint.z);
	}
	// now intersect unit-radius disk located at bottom base opening of unit paraboloid shape
	t0 = (ro.y + 1.0) / -rd.y;
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && t0 < t && hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z <= 1.0) // disk with unit radius
	{
		t = t0;
		n = vec3(0,1,0);
	}

	n = dot(rd, n) < 0.0 ? n : -n;
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_hyperboloid_intersect' ] = `

float UnitHyperboloidIntersect( vec3 ro, vec3 rd, float innerRadius, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float a = (rd.x * rd.x) - (rd.y * rd.y) + (rd.z * rd.z);
    	float b = 2.0 * ((rd.x * ro.x) - (rd.y * ro.y) + (rd.z * ro.z));
    	float c = (ro.x * ro.x) - (ro.y * ro.y) + (ro.z * ro.z) - (innerRadius * innerRadius); // 1 sheet:  - (innerRadius * innerRadius)
	    //c = (ro.x * ro.x) - (ro.y * ro.y) + (ro.z * ro.z) + (innerRadius * innerRadius); // 2 sheets: + (innerRadius * innerRadius)
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(hitPoint.x, -hitPoint.y, hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t0;
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && abs(hitPoint.y) <= 1.0)
	{
		n = vec3(hitPoint.x, -hitPoint.y, hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t1;
	}

	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_hyperbolic_paraboloid_intersect' ] = `

float UnitHyperbolicParaboloidIntersect( vec3 ro, vec3 rd, out vec3 n )
{
	vec3 hitPoint;
	float t0, t1;
	float a = rd.x * rd.x - rd.z * rd.z;
	float b = 2.0 * (rd.x * ro.x - rd.z * ro.z) - rd.y;
	float c = ro.x * ro.x - ro.z * ro.z - ro.y;
	solveQuadratic(a, b, c, t0, t1);
	
	// first, try t0
	hitPoint = ro + rd * t0;
	if (t0 > 0.0 && abs(hitPoint.x) <= 1.0 && abs(hitPoint.z) <= 1.0)
	{
		n = vec3(2.0 * hitPoint.x, -1.0, -2.0 * hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t0;
	}
	// if t0 was invalid, try t1
	hitPoint = ro + rd * t1;
	if (t1 > 0.0 && abs(hitPoint.x) <= 1.0 && abs(hitPoint.z) <= 1.0)
	{
		n = vec3(2.0 * hitPoint.x, -1.0, -2.0 * hitPoint.z);
		n = dot(rd, n) < 0.0 ? n : -n;
		return t1;
	}

	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_capsule_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float UnitCapsuleIntersect( float heightRadius, vec3 ro, vec3 rd, out vec3 normal )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hitPoint;
	float t0, t1;
	float t = INFINITY;

	// intersect unit-radius sphere located at top opening of cylinder -> or vec3(0,heightRadius,0)
	vec3 L = ro - vec3(0, heightRadius, 0);
	float a = dot(rd, rd);
	float b = 2.0 * dot(rd, L);
	float c = dot(L, L) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	// first, try t0
	if (t0 > 0.0 && t0 < t)
	{
		hitPoint = ro + rd * t0;
		if (hitPoint.y >= heightRadius)
		{
			t = t0;
			normal = vec3(hitPoint.x, hitPoint.y - heightRadius, hitPoint.z);
		}	
	}
	// if t0 was invalid, try t1
	if (t1 > 0.0 && t1 < t)
	{
		hitPoint = ro + rd * t1;
		if (hitPoint.y >= heightRadius)
		{
			t = t1;
			normal = vec3(hitPoint.x, hitPoint.y - heightRadius, hitPoint.z);
		}	
	}
	
	// now intersect unit-radius sphere located at bottom opening of cylinder -> or vec3(0,-heightRadius,0)
	L = ro - vec3(0, -heightRadius, 0);
	a = dot(rd, rd);
	b = 2.0 * dot(rd, L);
	c = dot(L, L) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	// first, try t0
	if (t0 > 0.0 && t0 < t)
	{
		hitPoint = ro + rd * t0;
		if (hitPoint.y <= -heightRadius)
		{
			t = t0;
			normal = vec3(hitPoint.x, hitPoint.y + heightRadius, hitPoint.z);
		}	
	}
	// if t0 was invalid, try t1
	if (t1 > 0.0 && t1 < t)
	{
		hitPoint = ro + rd * t1;
		if (hitPoint.y <= -heightRadius)
		{
			t = t1;
			normal = vec3(hitPoint.x, hitPoint.y + heightRadius, hitPoint.z);
		}	
	}
	
	// implicit equation of a unit (radius of 1) cylinder, extending infinitely in the +Y and -Y directions:
	// x^2 + z^2 - 1 = 0
	a = rd.x * rd.x + rd.z * rd.z;
    	b = 2.0 * (rd.x * ro.x + rd.z * ro.z);
    	c = ro.x * ro.x + ro.z * ro.z - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	// first, try t0
	if (t0 > 0.0 && t0 < t)
	{
		hitPoint = ro + rd * t0;
		if (abs(hitPoint.y) < heightRadius)
		{
			t = t0;
			normal = vec3(hitPoint.x, 0.0, hitPoint.z);
		}	
	}
	// if t0 was invalid, try t1
	if (t1 > 0.0 && t1 < t)
	{
		hitPoint = ro + rd * t1;
		if (abs(hitPoint.y) < heightRadius)
		{
			t = t1;
			normal = vec3(hitPoint.x, 0.0, hitPoint.z);
		}	
	}
	
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_box_intersect' ] = `

float UnitBoxIntersect( vec3 ro, vec3 rd )
{
	vec3 invDir = 1.0 / rd;
	vec3 near = (vec3(-1) - ro) * invDir; // unit radius box: vec3(-1,-1,-1) min corner
	vec3 far  = (vec3( 1) - ro) * invDir;  // unit radius box: vec3(+1,+1,+1) max corner
	
	vec3 tmin = min(near, far);
	vec3 tmax = max(near, far);
	float t0 = max( max(tmin.x, tmin.y), tmin.z);
	float t1 = min( min(tmax.x, tmax.y), tmax.z);

	if (t0 > t1) // test for invalid intersection
		return 0.0;

	if (t0 > 0.0)
	{
		//n = -sign(rd) * step(tmin.yzx, tmin) * step(tmin.zxy, tmin);
		return t0;
	}
	if (t1 > 0.0)
	{
		//n = -sign(rd) * step(tmax, tmax.yzx) * step(tmax, tmax.zxy);
		return t1;
	}
	
	return 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_unit_triangular_wedge_intersect' ] = `

//------------------------------------------------------------------------------------------------------------
float UnitTriangularWedgeIntersect( vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 n0, n1;
	float t;
	float t0 = -INFINITY;
	float t1 = INFINITY;
	float plane_dot_rayDir;

	// a triangular wedge(prism) looks like:
	//    __
	//   |\ \
	//   | \ \
	//   |  \ \
	//   |   \ \
	//   -------

	// left square side of wedge
	plane_dot_rayDir = dot(vec3(-1,0,0), rd);
	t = (-dot(vec3(-1,0,0), ro) + 1.0) / plane_dot_rayDir;
	if (plane_dot_rayDir < 0.0 && t > t0)
	{
		t0 = t;
		n0 = vec3(-1,0,0);
	}	
	if (plane_dot_rayDir > 0.0 && t < t1)
	{
		t1 = t;
		n1 = vec3(-1,0,0);
	}

	// front triangular face of wedge
	plane_dot_rayDir = dot(vec3(0,0,1), rd);
	t = (-dot(vec3(0,0,1), ro) + 1.0) / plane_dot_rayDir;
	if (plane_dot_rayDir < 0.0 && t > t0)
	{
		t0 = t;
		n0 = vec3(0,0,1);
	}	
	if (plane_dot_rayDir > 0.0 && t < t1)
	{
		t1 = t;
		n1 = vec3(0,0,1);
	}

	// back triangular face of wedge
	plane_dot_rayDir = dot(vec3(0,0,-1), rd);
	t = (-dot(vec3(0,0,-1), ro) + 1.0) / plane_dot_rayDir;
	if (plane_dot_rayDir < 0.0 && t > t0)
	{
		t0 = t;
		n0 = vec3(0,0,-1);
	}	
	if (plane_dot_rayDir > 0.0 && t < t1)
	{
		t1 = t;
		n1 = vec3(0,0,-1);
	}

	// bottom square base of wedge
	plane_dot_rayDir = dot(vec3(0,-1,0), rd);
	t = (-dot(vec3(0,-1,0), ro) + 1.0) / plane_dot_rayDir;
	if (plane_dot_rayDir < 0.0 && t > t0)
	{
		t0 = t;
		n0 = vec3(0,-1,0);
	}	
	if (plane_dot_rayDir > 0.0 && t < t1)
	{
		t1 = t;
		n1 = vec3(0,-1,0);
	}

	// angled square right side of wedge
	vec3 angledFaceNormal = vec3(0.7071067811865475, 0.7071067811865475, 0);
	plane_dot_rayDir = dot(angledFaceNormal, rd);
	t = (-dot(angledFaceNormal, ro) + 0.0) / plane_dot_rayDir;
	if (plane_dot_rayDir < 0.0 && t > t0)
	{
		t0 = t;
		n0 = angledFaceNormal;
	}	
	if (plane_dot_rayDir > 0.0 && t < t1)
	{
		t1 = t;
		n1 = angledFaceNormal;
	}

	if (t0 > t1) // check for invalid t0/t1 intersection pair
		return INFINITY;
	if (t0 > 0.0)
	{
		n = n0;
		return t0;
	}
	if (t1 > 0.0)
	{
		n = n1;
		return t1;
	}

	return INFINITY;
}

/*
//----------------------------------------------------------------------------------------------------------------------------------
void TriangularWedge_CSG_Intersect( vec3 ro, vec3 rd, int numPlanes, vec4 planes[20], out float t0, out float t1, out vec3 n0, out vec3 n1 )
//----------------------------------------------------------------------------------------------------------------------------------
{
	
}
*/

`; 

THREE.ShaderChunk[ 'raytracing_quadric_intersect' ] = `

/*
The Quadric shape Parameters (A-J) are stored in a 4x4 matrix (a 'mat4' in GLSL).
Following the technique found in the 2004 paper, "Ray Tracing Arbitrary Objects on the GPU" by Wood, et al.,
the parameter layout is:
mat4 shape = mat4(A, B, C, D,
		  B, E, F, G,
		  C, F, H, I,
		  D, G, I, J);
*/

float QuadricIntersect(mat4 shape, vec4 ro, vec4 rd) 
{
	vec4 rda = shape * rd;
    	vec4 roa = shape * ro;
	vec3 hitPoint;
    
    	// quadratic coefficients
    	float a = dot(rd, rda);
    	float b = dot(ro, rda) + dot(rd, roa);
    	float c = dot(ro, roa);
	
	float t0, t1;
	solveQuadratic(a, b, c, t0, t1);

	// restrict valid intersections to be inside unit bounding box vec3(-1,-1,-1) to vec3(+1,+1,+1)
	hitPoint = ro.xyz + rd.xyz * t0;
	if ( t0 > 0.0 && all(greaterThanEqual(hitPoint, vec3(-1.0 - QUADRIC_EPSILON))) && all(lessThanEqual(hitPoint, vec3(1.0 + QUADRIC_EPSILON))) )
		return t0;
		
	hitPoint = ro.xyz + rd.xyz * t1;
	if ( t1 > 0.0 && all(greaterThanEqual(hitPoint, vec3(-1.0 - QUADRIC_EPSILON))) && all(lessThanEqual(hitPoint, vec3(1.0 + QUADRIC_EPSILON))) )
		return t1;
	
	return INFINITY;
}

`;

THREE.ShaderChunk[ 'raytracing_sphere_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Sphere_CSG_Intersect( vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	// implicit equation of a unit (radius of 1) sphere:
	// x^2 + y^2 + z^2 - 1 = 0
	float a = dot(rd, rd);
	float b = 2.0 * dot(rd, ro);
	float c = dot(ro, ro) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	n0 = vec3(2.0 * hit.x, 2.0 * hit.y, 2.0 * hit.z);
	hit = ro + rd * t1;
	n1 = vec3(2.0 * hit.x, 2.0 * hit.y, 2.0 * hit.z);
}
`;

THREE.ShaderChunk[ 'raytracing_cylinder_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Cylinder_CSG_Intersect( vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d0, d1;
	d0 = d1 = 0.0;
	vec3 dn0, dn1;
	// implicit equation of a unit (radius of 1) cylinder, extending infinitely in the +Y and -Y directions:
	// x^2 + z^2 - 1 = 0
	float a = (rd.x * rd.x + rd.z * rd.z);
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z);
    	float c = (ro.x * ro.x + ro.z * ro.z) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (abs(hit.y) > 1.0) ? 0.0 : t0;
	n0 = vec3(2.0 * hit.x, 0.0, 2.0 * hit.z);
	hit = ro + rd * t1;
	t1 = (abs(hit.y) > 1.0) ? 0.0 : t1;
	n1 = vec3(2.0 * hit.x, 0.0, 2.0 * hit.z);
	// intersect top and bottom unit-radius disk caps
	if (rd.y < 0.0)
	{
		d0 = (ro.y - 1.0) / -rd.y;
		dn0 = vec3(0,1,0);
		d1 = (ro.y + 1.0) / -rd.y;
		dn1 = vec3(0,-1,0);
	}
	else
	{
		d1 = (ro.y - 1.0) / -rd.y;
		dn1 = vec3(0,1,0);
		d0 = (ro.y + 1.0) / -rd.y;
		dn0 = vec3(0,-1,0);
	}
	
	hit = ro + rd * d0;
	if (hit.x * hit.x + hit.z * hit.z <= 1.0) // unit radius disk
	{
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (hit.x * hit.x + hit.z * hit.z <= 1.0) // unit radius disk
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_cone_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Cone_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d0, d1, dr0, dr1;
	d0 = d1 = dr0 = dr1 = 0.0;
	vec3 dn0, dn1;
	// implicit equation of a double-cone extending infinitely in +Y and -Y directions
	// x^2 + z^2 - y^2 = 0
	// code below cuts off top cone, leaving bottom cone with apex at the top (+1.0), and circular base (radius of 1) at the bottom (-1.0)
	
	// valid range for k: 0.01 to 1.0 (1.0 being the default for cone with a sharp, pointed apex)
	k = clamp(k, 0.01, 1.0);
	
	float j = 1.0 / k;
	float h = j * 2.0 - 1.0;		   // (k * 0.25) makes the normal cone's bottom circular base have a unit radius of 1.0
	float a = j * rd.x * rd.x + j * rd.z * rd.z - (k * 0.25) * rd.y * rd.y;
    	float b = 2.0 * (j * rd.x * ro.x + j * rd.z * ro.z - (k * 0.25) * rd.y * (ro.y - h));
    	float c = j * ro.x * ro.x + j * ro.z * ro.z - (k * 0.25) * (ro.y - h) * (ro.y - h);
	solveQuadratic(a, b, c, t0, t1);
	
	hit = ro + rd * t0;
	t0 = (abs(hit.y) > 1.0) ? 0.0 : t0; // invalidate t0 if it's outside truncated cone's height bounds
	n0 = vec3(2.0 * hit.x * j, 2.0 * (h - hit.y) * (k * 0.25), 2.0 * hit.z * j);
	
	hit = ro + rd * t1;
	t1 = (abs(hit.y) > 1.0) ? 0.0 : t1; // invalidate t1 if it's outside truncated cone's height bounds
	n1 = vec3(2.0 * hit.x * j, 2.0 * (h - hit.y) * (k * 0.25), 2.0 * hit.z * j);
	// since the infinite double-cone is artificially cut off, if t0 intersection was invalidated, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	// intersect top and bottom disk caps
	if (rd.y < 0.0)
	{
		d0 = (ro.y - 1.0) / -rd.y;
		dn0 = vec3(0,1,0);
		d1 = (ro.y + 1.0) / -rd.y;
		dn1 = vec3(0,-1,0);
		dr0 = (1.0 - k) * (1.0 - k); // top cap's size is relative to k
		dr1 = 1.0; // bottom cap is unit radius
	}
	else
	{
		d1 = (ro.y - 1.0) / -rd.y;
		dn1 = vec3(0,1,0);
		d0 = (ro.y + 1.0) / -rd.y;
		dn0 = vec3(0,-1,0);
		dr0 = 1.0; // bottom cap is unit radius
		dr1 = (1.0 - k) * (1.0 - k);// top cap's size is relative to k
	}
	hit = ro + rd * d0;
	if (hit.x * hit.x + hit.z * hit.z <= dr0)
	{
		t1 = t0;
		n1 = n0;
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (hit.x * hit.x + hit.z * hit.z <= dr1)
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_conicalprism_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void ConicalPrism_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d0, d1, dr0, dr1;
	d0 = d1 = dr0 = dr1 = 0.0;
	vec3 dn0, dn1;
	// start with implicit equation of a double-cone extending infinitely in +Y and -Y directions
	// x^2 + z^2 - y^2 = 0
	// To obtain a conical prism along the Z axis, the Z component is simply removed, leaving:
	// x^2 - y^2 = 0
	// code below cuts off top cone of the double-cone, leaving bottom cone with apex at the top (+1.0), and base (radius of 1) at the bottom (-1.0)
	
	// valid range for k: 0.01 to 1.0 (1.0 being the default for cone with a sharp, pointed apex)
	k = clamp(k, 0.01, 1.0);
	
	float j = 1.0 / k;
	float h = j * 2.0 - 1.0;		   // (k * 0.25) makes the normal cone's bottom circular base have a unit radius of 1.0
	float a = j * rd.x * rd.x - (k * 0.25) * rd.y * rd.y;
    	float b = 2.0 * (j * rd.x * ro.x - (k * 0.25) * rd.y * (ro.y - h));
    	float c = j * ro.x * ro.x - (k * 0.25) * (ro.y - h) * (ro.y - h);
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (abs(hit.y) > 1.0 || abs(hit.z) > 1.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds
	n0 = vec3(2.0 * hit.x * j, 2.0 * (hit.y - h) * -(k * 0.25), 0.0);
	
	hit = ro + rd * t1;
	t1 = (abs(hit.y) > 1.0 || abs(hit.z) > 1.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds
	n1 = vec3(2.0 * hit.x * j, 2.0 * (hit.y - h) * -(k * 0.25), 0.0);
	
	// since the infinite double-cone shape is artificially cut off at the top and bottom,
	// if t0 intersection was invalidated above, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	// intersect top and bottom base rectangles
	if (rd.y < 0.0)
	{
		d0 = (ro.y - 1.0) / -rd.y;
		dn0 = vec3(0,1,0);
		d1 = (ro.y + 1.0) / -rd.y;
		dn1 = vec3(0,-1,0);
		dr0 = 1.0 - (k); // top cap's size is relative to k
		dr1 = 1.0; // bottom cap is unit radius
	}
	else
	{
		d1 = (ro.y - 1.0) / -rd.y;
		dn1 = vec3(0,1,0);
		d0 = (ro.y + 1.0) / -rd.y;
		dn0 = vec3(0,-1,0);
		dr0 = 1.0; // bottom cap is unit radius
		dr1 = 1.0 - (k);// top cap's size is relative to k
	}
	hit = ro + rd * d0;
	if (abs(hit.x) <= dr0 && abs(hit.z) <= 1.0)
	{
		t1 = t0;
		n1 = n0;
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (abs(hit.x) <= dr1 && abs(hit.z) <= 1.0)
	{
		t1 = d1;
		n1 = dn1;
	}
	// intersect conical-shaped front and back wall pieces
	if (rd.z < 0.0)
	{
		d0 = (ro.z - 1.0) / -rd.z;
		dn0 = vec3(0,0,1);
		d1 = (ro.z + 1.0) / -rd.z;
		dn1 = vec3(0,0,-1);
	}
	else
	{
		d1 = (ro.z - 1.0) / -rd.z;
		dn1 = vec3(0,0,1);
		d0 = (ro.z + 1.0) / -rd.z;
		dn0 = vec3(0,0,-1);
	}
	
	hit = ro + rd * d0;
	if (abs(hit.x) <= 1.0 && abs(hit.y) <= 1.0 && (j * hit.x * hit.x - k * 0.25 * (hit.y - h) * (hit.y - h)) <= 0.0) // y is a quadratic (conical) function of x
	{
		if (t0 != 0.0)
		{
			t1 = t0;
			n1 = n0;
		}
		
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (abs(hit.x) <= 1.0 && abs(hit.y) <= 1.0 && (j * hit.x * hit.x - k * 0.25 * (hit.y - h) * (hit.y - h)) <= 0.0) // y is a quadratic (conical) function of x
	{
		t1 = d1;
		n1 = dn1;
	}
	
}
`;

THREE.ShaderChunk[ 'raytracing_paraboloid_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Paraboloid_CSG_Intersect( vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d = 0.0;
	vec3 dn;
	// implicit equation of a paraboloid (upside down rounded-v shape extending infinitely downward in the -Y direction):
	// x^2 + z^2 + y = 0
	// code below centers the paraboloid so that its rounded apex is at the top (+1.0) and 
	//   its circular base is of unit radius (1) and is located at the bottom (-1.0) where the shape is truncated 
	
	float k = 0.5;
	float a = rd.x * rd.x + rd.z * rd.z;
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z) + k * rd.y;
    	float c = ro.x * ro.x + ro.z * ro.z + k * (ro.y - 1.0);
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (abs(hit.y) > 1.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds
	n0 = vec3(2.0 * hit.x, 1.0 * k, 2.0 * hit.z);
	hit = ro + rd * t1;
	t1 = (abs(hit.y) > 1.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds
	n1 = vec3(2.0 * hit.x, 1.0 * k, 2.0 * hit.z);
	// since the infinite paraboloid is artificially cut off at the bottom,
	// if t0 intersection was invalidated, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	
	// now intersect unit-radius disk located at bottom base opening of unit paraboloid shape
	d = (ro.y + 1.0) / -rd.y;
	hit = ro + rd * d;
	if (hit.x * hit.x + hit.z * hit.z <= 1.0) // disk with unit radius
	{
		if (rd.y < 0.0)
		{
			t1 = d;
			n1 = vec3(0,-1,0);
		}
		else
		{
			t1 = t0;
			n1 = n0;
			t0 = d;
			n0 = vec3(0,-1,0);
		}
	}
}
`;

THREE.ShaderChunk[ 'raytracing_parabolicprism_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void ParabolicPrism_CSG_Intersect( vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d, d0, d1;
	d = d0 = d1 = 0.0;
	vec3 dn, dn0, dn1;
	// start with implicit equation of a paraboloid (upside down rounded-v shape extending infinitely downward in the -Y direction):
	// x^2 + z^2 + y = 0
	// To obtain a parabolic prism along the Z axis, the Z component is simply removed, leaving:
	// x^2 + y = 0
	// code below centers the parabolic prism so that its rounded apex is at the top (+1.0) and 
	//   its square base is of unit radius (1) and is located at the bottom (-1.0) where the infinite parabola shape is truncated also
	
	float k = 0.5; // k:0.5 narrows the parabola to ensure that when the lower portion of the parabola reaches the cut-off at the base, it is 1 unit wide
	float a = rd.x * rd.x;
    	float b = 2.0 * (rd.x * ro.x) + k * rd.y;
    	float c = ro.x * ro.x + k * (ro.y - 1.0);
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (hit.y < -1.0 || abs(hit.z) > 1.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds
	n0 = vec3(2.0 * hit.x, 1.0 * k, 0.0);
	
	hit = ro + rd * t1;
	t1 = (hit.y < -1.0 || abs(hit.z) > 1.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds
	n1 = vec3(2.0 * hit.x, 1.0 * k, 0.0);
	
	// since the infinite parabolic shape is artificially cut off at the bottom,
	// if t0 intersection was invalidated above, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	
	// intersect unit-radius square located at bottom opening of unit paraboloid shape
	d = (ro.y + 1.0) / -rd.y;
	hit = ro + rd * d;
	if (abs(hit.x) <= 1.0 && abs(hit.z) <= 1.0) // square with unit radius
	{
		if (rd.y < 0.0)
		{
			t1 = d;
			n1 = vec3(0,-1,0);
		}
		else
		{
			t1 = t0;
			n1 = n0;
			t0 = d;
			n0 = vec3(0,-1,0);
		}
	}
	// intersect parabola-shaped front and back wall pieces
	if (rd.z < 0.0)
	{
		d0 = (ro.z - 1.0) / -rd.z;
		dn0 = vec3(0,0,1);
		d1 = (ro.z + 1.0) / -rd.z;
		dn1 = vec3(0,0,-1);
	}
	else
	{
		d1 = (ro.z - 1.0) / -rd.z;
		dn1 = vec3(0,0,1);
		d0 = (ro.z + 1.0) / -rd.z;
		dn0 = vec3(0,0,-1);
	}
	
	hit = ro + rd * d0;
	if (hit.y >= -1.0 && (hit.x * hit.x + k * (hit.y - 1.0)) <= 0.0) // y is a parabolic function of x
	{
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (hit.y >= -1.0 && (hit.x * hit.x + k * (hit.y - 1.0)) <= 0.0) // y is a parabolic function of x
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_hyperboloid1sheet_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Hyperboloid1Sheet_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d0, d1, dr0, dr1;
	d0 = d1 = dr0 = dr1 = 0.0;
	vec3 dn0, dn1;
	// implicit equation of a hyperboloid of 1 sheet (hourglass shape extending infinitely in the +Y and -Y directions):
	// x^2 + z^2 - y^2 - 1 = 0
	// for CSG purposes, we artificially truncate the hyperboloid at the middle, so that only the top half of the hourglass remains with added top/bottom caps...
	// This way, the total number of possible intersections will be 2 max (t0/t1), rather than possibly 4 (if we left it as a full hourglass with added top/bottom caps)
	
	ro.y += 0.5; // this places the top-to-middle portion of the shape closer to its own origin, so that it rotates smoothly around its own middle. 
	
	// conservative range of k: 1 to 100
	float j = k - 1.0;
	float a = k * rd.x * rd.x + k * rd.z * rd.z - j * rd.y * rd.y;
	float b = 2.0 * (k * rd.x * ro.x + k * rd.z * ro.z - j * rd.y * ro.y);
	float c = (k * ro.x * ro.x + k * ro.z * ro.z - j * ro.y * ro.y) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (hit.y > 1.0 || hit.y < 0.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds of top half
	n0 = vec3(2.0 * hit.x * k, 2.0 * -hit.y * j, 2.0 * hit.z * k);
	hit = ro + rd * t1;
	t1 = (hit.y > 1.0 || hit.y < 0.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds of top half
	n1 = vec3(2.0 * hit.x * k, 2.0 * -hit.y * j, 2.0 * hit.z * k);
	// since the infinite hyperboloid is artificially cut off at the top and bottom so that it has a unit radius top cap,
	// if t0 intersection was invalidated, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	if (rd.y < 0.0)
	{
		d0 = (ro.y - 1.0) / -rd.y;
		dn0 = vec3(0,1,0);
		d1 = (ro.y + 0.0) / -rd.y;
		dn1 = vec3(0,-1,0);
		dr0 = 1.0; // top cap is unit radius
		dr1 = 1.0 / k; // bottom cap is inverse size of k (smaller than 1)
	}
	else
	{
		d1 = (ro.y - 1.0) / -rd.y;
		dn1 = vec3(0,1,0);
		d0 = (ro.y + 0.0) / -rd.y;
		dn0 = vec3(0,-1,0);
		dr0 = 1.0 / k; // bottom cap is inverse size of k (smaller than 1)
		dr1 = 1.0; // top cap is unit radius
	}
	
	hit = ro + rd * d0;
	if (hit.x * hit.x + hit.z * hit.z <= dr0)
	{
		t1 = t0;
		n1 = n0;
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (hit.x * hit.x + hit.z * hit.z <= dr1)
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_hyperboloid2sheets_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Hyperboloid2Sheets_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d = 0.0;
	vec3 dn;
	// implicit equation of a hyperboloid of 2 sheets (2 rounded v shapes that are mirrored and pointing at each other)
	// -x^2 - z^2 + y^2 - 1 = 0
	// for CSG purposes, we artificially truncate the hyperboloid at the middle, so that only 1 sheet (the top sheet) of the 2 mirrored sheets remains...
	// This way, the total number of possible intersections will be 2 max (t0/t1), rather than possibly 4 (if we left it as 2 full sheets with added top/bottom caps)
	
	ro.y += 0.5; // this places the top-to-middle portion of the shape closer to its own origin, so that it rotates smoothly around its own middle. 
	
	// conservative range of k: 1 to 100
	float j = k + 1.0;
	float a = -k * rd.x * rd.x - k * rd.z * rd.z + j * rd.y * rd.y;
	float b = 2.0 * (-k * rd.x * ro.x - k * rd.z * ro.z + j * rd.y * ro.y);
	float c = (-k * ro.x * ro.x - k * ro.z * ro.z + j * ro.y * ro.y) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (hit.y > 1.0 || hit.y < 0.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds of top half
	n0 = vec3(2.0 * -hit.x * k, 2.0 * hit.y * j, 2.0 * -hit.z * k);
	hit = ro + rd * t1;
	t1 = (hit.y > 1.0 || hit.y < 0.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds of top half
	n1 = vec3(2.0 * -hit.x * k, 2.0 * hit.y * j, 2.0 * -hit.z * k);
	// since the infinite hyperboloid is artificially cut off at the top and bottom so that it has a unit radius top cap,
	// if t0 intersection was invalidated, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	// intersect unit-radius disk located at top opening of unit hyperboloid shape
	d = (ro.y - 1.0) / -rd.y;
	hit = ro + rd * d;
	if (hit.x * hit.x + hit.z * hit.z <= 1.0) // disk with unit radius
	{
		if (rd.y > 0.0)
		{
			t1 = d;
			n1 = vec3(0,1,0);
		}
		else
		{
			t1 = t0;
			n1 = n0;
			t0 = d;
			n0 = vec3(0,1,0);
		}
	}
	
}
`;

THREE.ShaderChunk[ 'raytracing_hyperbolicprism1sheet_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void HyperbolicPrism1Sheet_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d0, d1, dr0, dr1;
	d0 = d1 = dr0 = dr1 = 0.0;
	vec3 dn0, dn1;
	// start with the implicit equation of a hyperboloid of 1 sheet (hourglass shape extending infinitely in the +Y and -Y directions):
	// x^2 + z^2 - y^2 - 1 = 0
	// To obtain a hyperbolic prism along the Z axis, the Z component is simply removed, leaving:
	// x^2 - y^2 - 1 = 0
	// for CSG purposes, we artificially truncate the hyperbolic prism at the middle, so that only the top half of the hourglass remains with added top/bottom caps...
	// This way, the total number of possible intersections will be 2 max (t0/t1), rather than possibly 4 (if we left it as a full hourglass with added top/bottom caps)
	
	ro.y += 0.5; // this places the top-to-middle portion of the shape closer to its own origin, so that it rotates smoothly around its own middle. 
	
	// conservative range of k: 1 to 100
	float j = k - 1.0;
	float a = k * rd.x * rd.x - j * rd.y * rd.y;
	float b = 2.0 * (k * rd.x * ro.x - j * rd.y * ro.y);
	float c = (k * ro.x * ro.x - j * ro.y * ro.y) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (hit.y > 1.0 || hit.y < 0.0 || abs(hit.z) > 1.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds of top half
	n0 = vec3(2.0 * hit.x * k, 2.0 * -hit.y * j, 0.0);
	hit = ro + rd * t1;
	t1 = (hit.y > 1.0 || hit.y < 0.0 || abs(hit.z) > 1.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds of top half
	n1 = vec3(2.0 * hit.x * k, 2.0 * -hit.y * j, 0.0);
	// since the infinite hyperbolic shape is artificially cut off at the top and bottom so that it has a unit radius top cap,
	// if t0 intersection was invalidated, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	// intersect top and bottom base rectangles
	if (rd.y < 0.0)
	{
		d0 = (ro.y - 1.0) / -rd.y;
		dn0 = vec3(0,1,0);
		d1 = (ro.y + 0.0) / -rd.y;
		dn1 = vec3(0,-1,0);
		dr0 = 1.0; // top cap is unit radius
		dr1 = 1.0 / sqrt(abs(k)); // bottom cap is related to k (smaller than 1)
	}
	else
	{
		d1 = (ro.y - 1.0) / -rd.y;
		dn1 = vec3(0,1,0);
		d0 = (ro.y + 0.0) / -rd.y;
		dn0 = vec3(0,-1,0);
		dr0 = 1.0 / sqrt(abs(k)); // bottom cap is related to k (smaller than 1)
		dr1 = 1.0; // top cap is unit radius
	}
	
	hit = ro + rd * d0;
	if (abs(hit.x) <= dr0 && abs(hit.z) <= 1.0)
	{
		if (t0 != 0.0)
		{
			t1 = t0;
			n1 = n0;
		}
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (abs(hit.x) <= dr1 && abs(hit.z) <= 1.0)
	{
		t1 = d1;
		n1 = dn1;
	}
	// intersect hyperbolic-shaped front and back wall pieces
	if (rd.z < 0.0)
	{
		d0 = (ro.z - 1.0) / -rd.z;
		dn0 = vec3(0,0,1);
		d1 = (ro.z + 1.0) / -rd.z;
		dn1 = vec3(0,0,-1);
	}
	else
	{
		d1 = (ro.z - 1.0) / -rd.z;
		dn1 = vec3(0,0,1);
		d0 = (ro.z + 1.0) / -rd.z;
		dn0 = vec3(0,0,-1);
	}
	
	hit = ro + rd * d0;
	if (abs(hit.x) <= 1.0 && hit.y >= 0.0 && hit.y <= 1.0 && (k * hit.x * hit.x - j * hit.y * hit.y - 1.0) <= 0.0) // y is a quadratic (hyperbolic) function of x
	{
		if (t0 != 0.0)
		{
			t1 = t0;
			n1 = n0;
		}
		
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (abs(hit.x) <= 1.0 && hit.y >= 0.0 && hit.y <= 1.0 && (k * hit.x * hit.x - j * hit.y * hit.y - 1.0) <= 0.0) // y is a quadratic (hyperbolic) function of x
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;


THREE.ShaderChunk[ 'raytracing_hyperbolicprism2sheets_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void HyperbolicPrism2Sheets_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit;
	float d, d0, d1, dr0, dr1;
	d = d0 = d1 = dr0 = dr1 = 0.0;
	vec3 dn0, dn1;
	// start with the implicit equation of a hyperboloid of 2 sheets (2 rounded v shapes that are mirrored and pointing at each other)
	// -x^2 - z^2 + y^2 - 1 = 0
	// To obtain a hyperbolic prism along the Z axis, the Z component is simply removed, leaving:
	// -x^2 + y^2 - 1 = 0
	// for CSG purposes, we artificially truncate the hyperbolic prism at the middle, so that only 1 sheet (the top sheet) of the 2 mirrored sheets remains...
	// This way, the total number of possible intersections will be 2 max (t0/t1), rather than possibly 4 (if we left it as 2 full sheets with added top/bottom caps)
	
	ro.y += 0.5; // this places the top-to-middle portion of the shape closer to its own origin, so that it rotates smoothly around its own middle. 
	
	// conservative range of k: 1 to 100
	float j = k + 1.0;
	float a = -k * rd.x * rd.x + j * rd.y * rd.y;
	float b = 2.0 * (-k * rd.x * ro.x + j * rd.y * ro.y);
	float c = (-k * ro.x * ro.x + j * ro.y * ro.y) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (hit.y > 1.0 || hit.y < 0.0 || abs(hit.z) > 1.0) ? 0.0 : t0; // invalidate t0 if it's outside unit radius bounds of top half
	n0 = vec3(2.0 * -hit.x * k, 2.0 * hit.y * j, 0.0);
	hit = ro + rd * t1;
	t1 = (hit.y > 1.0 || hit.y < 0.0 || abs(hit.z) > 1.0) ? 0.0 : t1; // invalidate t1 if it's outside unit radius bounds of top half
	n1 = vec3(2.0 * -hit.x * k, 2.0 * hit.y * j, 0.0);
	// since the infinite hyperbolic shape is artificially cut off at the top and bottom so that it has a unit radius top cap,
	// if t0 intersection was invalidated, try t1
	if (t0 == 0.0)
	{
		t0 = t1;
		n0 = n1;
	}
	// intersect unit-radius square located at top opening of hyperbolic prism shape
	d = (ro.y - 1.0) / -rd.y;
	hit = ro + rd * d;
	if (abs(hit.x) <= 1.0 && abs(hit.z) <= 1.0) // square with unit radius
	{
		if (rd.y > 0.0)
		{
			t1 = d;
			n1 = vec3(0,1,0);
		}
		else
		{
			t1 = t0;
			n1 = n0;
			t0 = d;
			n0 = vec3(0,1,0);
		}
	}
	// intersect hyperbolic v-shaped front and back wall pieces
	if (rd.z < 0.0)
	{
		d0 = (ro.z - 1.0) / -rd.z;
		dn0 = vec3(0,0,1);
		d1 = (ro.z + 1.0) / -rd.z;
		dn1 = vec3(0,0,-1);
	}
	else
	{
		d1 = (ro.z - 1.0) / -rd.z;
		dn1 = vec3(0,0,1);
		d0 = (ro.z + 1.0) / -rd.z;
		dn0 = vec3(0,0,-1);
	}
	
	hit = ro + rd * d0;
	if (abs(hit.x) <= 1.0 && hit.y >= 0.0 && hit.y <= 1.0 && (-k * hit.x * hit.x + j * hit.y * hit.y - 1.0) >= 0.0) // y is a quadratic (hyperbolic) function of x
	{
		if (t0 != 0.0)
		{
			t1 = t0;
			n1 = n0;
		}
		
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (abs(hit.x) <= 1.0 && hit.y >= 0.0 && hit.y <= 1.0 && (-k * hit.x * hit.x + j * hit.y * hit.y - 1.0) >= 0.0) // y is a quadratic (hyperbolic) function of x
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_capsule_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Capsule_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit, s0n0, s0n1, s1n0, s1n1;
	float s0t0, s0t1, s1t0, s1t1;
	s0t0 = s0t1 = s1t0 = s1t1 = 0.0;
	// implicit equation of a unit (radius of 1) cylinder, extending infinitely in the +Y and -Y directions:
	// x^2 + z^2 - 1 = 0
	float a = (rd.x * rd.x + rd.z * rd.z);
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z);
    	float c = (ro.x * ro.x + ro.z * ro.z) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	hit = ro + rd * t0;
	t0 = (abs(hit.y) > k) ? 0.0 : t0;
	n0 = vec3(2.0 * hit.x, 0.0, 2.0 * hit.z);
	hit = ro + rd * t1;
	t1 = (abs(hit.y) > k) ? 0.0 : t1;
	n1 = vec3(2.0 * hit.x, 0.0, 2.0 * hit.z);
	// intersect unit-radius sphere located at top opening of cylinder
	vec3 s0pos = vec3(0, k, 0);
	vec3 L = ro - s0pos;
	a = dot(rd, rd);
	b = 2.0 * dot(rd, L);
	c = dot(L, L) - 1.0;
	solveQuadratic(a, b, c, s0t0, s0t1);
	hit = ro + rd * s0t0;
	s0n0 = vec3(2.0 * hit.x, 2.0 * (hit.y - s0pos.y), 2.0 * hit.z);
	s0t0 = (hit.y < k) ? 0.0 : s0t0;
	hit = ro + rd * s0t1;
	s0n1 = vec3(2.0 * hit.x, 2.0 * (hit.y - s0pos.y), 2.0 * hit.z);
	s0t1 = (hit.y < k) ? 0.0 : s0t1;
	// now intersect unit-radius sphere located at bottom opening of cylinder
	vec3 s1pos = vec3(0, -k, 0);
	L = ro - s1pos;
	a = dot(rd, rd);
	b = 2.0 * dot(rd, L);
	c = dot(L, L) - 1.0;
	solveQuadratic(a, b, c, s1t0, s1t1);
	hit = ro + rd * s1t0;
	s1n0 = vec3(2.0 * hit.x, 2.0 * (hit.y - s1pos.y), 2.0 * hit.z);
	s1t0 = (hit.y > -k) ? 0.0 : s1t0;
	hit = ro + rd * s1t1;
	s1n1 = vec3(2.0 * hit.x, 2.0 * (hit.y - s1pos.y), 2.0 * hit.z);
	s1t1 = (hit.y > -k) ? 0.0 : s1t1;
	if (s0t0 != 0.0)
	{
		t0 = s0t0;
		n0 = s0n0;
	}
	else if (s1t0 != 0.0)
	{
		t0 = s1t0;
		n0 = s1n0;
	}
	
	if (s0t1 != 0.0)
	{
		t1 = s0t1;
		n1 = s0n1;
	}
	else if (s1t1 != 0.0)
	{
		t1 = s1t1;
		n1 = s1n1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_box_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void Box_CSG_Intersect( vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 invDir = 1.0 / rd;
	vec3 near = (vec3(-1) - ro) * invDir; // unit radius box: vec3(-1,-1,-1) min corner
	vec3 far  = (vec3(1) - ro) * invDir;  // unit radius box: vec3(+1,+1,+1) max corner
	
	vec3 tmin = min(near, far);
	vec3 tmax = max(near, far);
	t0 = max( max(tmin.x, tmin.y), tmin.z);
	t1 = min( min(tmax.x, tmax.y), tmax.z);
	n0 = -sign(rd) * step(tmin.yzx, tmin) * step(tmin.zxy, tmin);
	n1 = -sign(rd) * step(tmax, tmax.yzx) * step(tmax, tmax.zxy);
	if (t0 > t1) // invalid intersection
		t0 = t1 = 0.0;
}
`;

THREE.ShaderChunk[ 'raytracing_convexpolyhedron_intersect' ] = `
// This convexPolyhedron routine works with any number of user-defined cutting planes - a plane is defined by its unit normal (vec3) and an offset distance (float) 
//  from the plane origin to the shape's origin.  Examples of shapes that can be made from a list of pure convex cutting planes: cube, frustum, 
//  triangular pyramid (tetrahedron), rectangular pyramid, triangular bipyramid (hexahedron), rectangular bipyramid (octahedron), and other polyhedra.

//------------------------------------------------------------------------------------------------------------
float ConvexPolyhedronIntersect( vec3 ro, vec3 rd, out vec3 n, int numPlanes, vec4 planes[20] )
//------------------------------------------------------------------------------------------------------------
{
	vec3 n0, n1;
	float t;
	float t0 = -INFINITY;
	float t1 = INFINITY;
	float plane_dot_rayDir;
	
	for (int i = 0; i < numPlanes; i++)
	{
		plane_dot_rayDir = dot(planes[i].xyz, rd);
		
		t = (-dot(planes[i].xyz, ro) + planes[i].w) / plane_dot_rayDir;

		if (plane_dot_rayDir < 0.0 && t > t0)
		{
			t0 = t;
			n0 = planes[i].xyz;
		}	
		if (plane_dot_rayDir > 0.0 && t < t1)
		{
			t1 = t;
			n1 = planes[i].xyz;
		}	
	}

	if (t0 > t1) // check for invalid t0/t1 intersection pair
		return INFINITY;
	if (t0 > 0.0)
	{
		n = n0;
		return t0;
	}
	if (t1 > 0.0)
	{
		n = n1;
		return t1;
	}

	return INFINITY;
}

/*
//----------------------------------------------------------------------------------------------------------------------------------
void ConvexPolyhedron_CSG_Intersect( vec3 ro, vec3 rd, int numPlanes, vec4 planes[20], out float t0, out float t1, out vec3 n0, out vec3 n1 )
//----------------------------------------------------------------------------------------------------------------------------------
{
	
}
*/

`; 

THREE.ShaderChunk[ 'raytracing_pyramidfrustum_csg_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
void PyramidFrustum_CSG_Intersect( float k, vec3 ro, vec3 rd, out float t0, out float t1, out vec3 n0, out vec3 n1 )
//------------------------------------------------------------------------------------------------------------
{
	vec3 hit, dn0, dn1, xn0, xn1, zn0, zn1;
	float d0, d1, dr0, dr1;
	float xt0, xt1, zt0, zt1;
	d0 = d1 = dr0 = dr1 = xt0 = xt1 = zt0 = zt1 = 0.0;
	// first, intersect left and right sides of pyramid/frustum
	// start with implicit equation of a double-cone extending infinitely in +Y and -Y directions
	// x^2 + z^2 - y^2 = 0
	// To obtain a conical prism along the Z axis, the Z component is simply removed, leaving:
	// x^2 - y^2 = 0
	// code below cuts off top cone of the double-cone, leaving bottom cone with apex at the top (+1.0), and base (radius of 1) at the bottom (-1.0)
	
	// valid range for k: 0.01 to 1.0 (1.0 being the default for cone with a sharp, pointed apex)
	k = clamp(k, 0.01, 1.0);
	
	float j = 1.0 / k;
	float h = j * 2.0 - 1.0; // (k * 0.25) makes the normal cone's bottom circular base have a unit radius of 1.0
	float a = j * rd.x * rd.x - (k * 0.25) * rd.y * rd.y;
    	float b = 2.0 * (j * rd.x * ro.x - (k * 0.25) * rd.y * (ro.y - h));
    	float c = j * ro.x * ro.x - (k * 0.25) * (ro.y - h) * (ro.y - h);
	solveQuadratic(a, b, c, xt0, xt1);
	hit = ro + rd * xt0;
	xt0 = (abs(hit.x) > 1.0 || abs(hit.z) > 1.0 || hit.y > 1.0 || (j * hit.z * hit.z - k * 0.25 * (hit.y - h) * (hit.y - h)) > 0.0) ? 0.0 : xt0;
	xn0 = vec3(2.0 * hit.x * j, 2.0 * (hit.y - h) * -(k * 0.25), 0.0);
	
	hit = ro + rd * xt1;
	xt1 = (abs(hit.x) > 1.0 || abs(hit.z) > 1.0 || hit.y > 1.0 || (j * hit.z * hit.z - k * 0.25 * (hit.y - h) * (hit.y - h)) > 0.0) ? 0.0 : xt1;
	xn1 = vec3(2.0 * hit.x * j, 2.0 * (hit.y - h) * -(k * 0.25), 0.0);
	
	// since the infinite double-cone shape is artificially cut off at the top and bottom,
	// if xt0 intersection was invalidated above, try xt1
	if (xt0 == 0.0)
	{
		xt0 = xt1;
		xn0 = xn1;
		xt1 = 0.0; // invalidate xt1 (see sorting algo below)
	}
	// now intersect front and back sides of pyramid/frustum
	// start with implicit equation of a double-cone extending infinitely in +Y and -Y directions
	// x^2 + z^2 - y^2 = 0
	// To obtain a conical prism along the X axis, the X component is simply removed, leaving:
	// z^2 - y^2 = 0
	a = j * rd.z * rd.z - (k * 0.25) * rd.y * rd.y;
    	b = 2.0 * (j * rd.z * ro.z - (k * 0.25) * rd.y * (ro.y - h));
    	c = j * ro.z * ro.z - (k * 0.25) * (ro.y - h) * (ro.y - h);
	solveQuadratic(a, b, c, zt0, zt1);
	hit = ro + rd * zt0;
	zt0 = (abs(hit.x) > 1.0 || abs(hit.z) > 1.0 || hit.y > 1.0 || (j * hit.x * hit.x - k * 0.25 * (hit.y - h) * (hit.y - h)) > 0.0) ? 0.0 : zt0;
	zn0 = vec3(0.0, 2.0 * (hit.y - h) * -(k * 0.25), 2.0 * hit.z * j);
	
	hit = ro + rd * zt1;
	zt1 = (abs(hit.x) > 1.0 || abs(hit.z) > 1.0 || hit.y > 1.0 || (j * hit.x * hit.x - k * 0.25 * (hit.y - h) * (hit.y - h)) > 0.0) ? 0.0 : zt1;
	zn1 = vec3(0.0, 2.0 * (hit.y - h) * -(k * 0.25), 2.0 * hit.z * j);
	// since the infinite double-cone shape is artificially cut off at the top and bottom,
	// if zt0 intersection was invalidated above, try zt1
	if (zt0 == 0.0)
	{
		zt0 = zt1;
		zn0 = zn1;
		zt1 = 0.0; // invalidate zt1 (see sorting algo below)
	}
	// sort valid intersections of 4 sides of pyramid/frustum thus far
	if (xt1 != 0.0) // the only way xt1 can be valid (not 0), is if xt0 was also valid (not 0) (see above)
	{
		t0 = xt0;
		n0 = xn0;
		t1 = xt1;
		n1 = xn1;
	}
	else if (zt1 != 0.0) // the only way zt1 can be valid (not 0), is if zt0 was also valid (not 0) (see above)
	{
		t0 = zt0;
		n0 = zn0;
		t1 = zt1;
		n1 = zn1;
	}
	else if (xt0 != 0.0)
	{
		if (zt0 == 0.0)
		{
			t0 = xt0;
			n0 = xn0;	
		}
		else if (zt0 < xt0)
		{
			t0 = zt0;
			n0 = zn0;
			t1 = xt0;
			n1 = xn0;
		}
		else
		{
			t0 = xt0;
			n0 = xn0;
			t1 = zt0;
			n1 = zn0;
		}
	}
	else if (xt0 == 0.0)
	{
		t0 = zt0;
		n0 = zn0;
	}
	
	// lastly, intersect top and bottom base squares (both are perfect squares)
	if (rd.y < 0.0)
	{
		d0 = (ro.y - 1.0) / -rd.y;
		dn0 = vec3(0,1,0);
		d1 = (ro.y + 1.0) / -rd.y;
		dn1 = vec3(0,-1,0);
		dr0 = 1.0 - k; // top square's size is relative to k
		dr1 = 1.0; // bottom square is unit radius
	}
	else
	{
		d1 = (ro.y - 1.0) / -rd.y;
		dn1 = vec3(0,1,0);
		d0 = (ro.y + 1.0) / -rd.y;
		dn0 = vec3(0,-1,0);
		dr0 = 1.0; // bottom square is unit radius
		dr1 = 1.0 - k;// top square's size is relative to k
	}
	hit = ro + rd * d0;
	if (abs(hit.x) <= dr0 && abs(hit.z) <= dr0)
	{
		t1 = t0;
		n1 = n0;
		t0 = d0;
		n0 = dn0;
	}
	hit = ro + rd * d1;
	if (abs(hit.x) <= dr1 && abs(hit.z) <= dr1)
	{
		t1 = d1;
		n1 = dn1;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_csg_operations' ] = `
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
void CSG_Union_Operation( float A_t0, vec3 A_n0, int A_type0, vec3 A_color0, int A_objectID0, float A_t1, vec3 A_n1, int A_type1, vec3 A_color1, int A_objectID1, 
			  float B_t0, vec3 B_n0, int B_type0, vec3 B_color0, int B_objectID0, float B_t1, vec3 B_n1, int B_type1, vec3 B_color1, int B_objectID1, 
			  out float t0, out vec3 n0, out int type0, out vec3 color0, out int objectID0, out float t1, out vec3 n1, out int type1, out vec3 color1, out int objectID1 )
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
{
	// CSG UNION OPERATION [A + B] (outside of shape A and outside of shape B are fused together into a single, new shape)
	// (hypothetically, the interior volume of the newly created union could be completely filled with water in one pass)
	
	vec3 temp_n0, temp_n1, temp_col0, temp_col1;
	float temp_t0, temp_t1;
	int temp_type0, temp_type1, temp_objectID0, temp_objectID1;
	// if shape B is closer than A, swap shapes
	if (B_t0 < A_t0)
	{
		temp_t0 = A_t0;
		temp_n0 = A_n0;
		temp_col0 = A_color0;
		temp_type0 = A_type0;
		temp_objectID0 = A_objectID0;
		
		temp_t1 = A_t1;
		temp_n1 = A_n1;
		temp_col1 = A_color1;
		temp_type1 = A_type1;
		temp_objectID1 = A_objectID1;


		A_t0 = B_t0;
		A_n0 = B_n0;
		A_color0 = B_color0;
		A_type0 = B_type0;
		A_objectID0 = B_objectID0;

		A_t1 = B_t1;
		A_n1 = B_n1;
		A_color1 = B_color1;
		A_type1 = B_type1;
		A_objectID1 = B_objectID1;


		B_t0 = temp_t0;
		B_n0 = temp_n0;
		B_color0 = temp_col0;
		B_type0 = temp_type0;
		B_objectID0 = temp_objectID0;

		B_t1 = temp_t1;
		B_n1 = temp_n1;
		B_color1 = temp_col1;
		B_type1 = temp_type1;
		B_objectID1 = temp_objectID1;
	}
	// shape A is always considered to be first
	t0 = A_t0;
	n0 = A_n0;
	type0 = A_type0;
	color0 = A_color0;
	objectID0 = A_objectID0;

	t1 = A_t1;
	n1 = A_n1;
	type1 = A_type1;
	color1 = A_color1;
	objectID1 = A_objectID1;
	
	// except for when the outside of shape B matches the outside of shape A
	if (B_t0 == A_t0)
	{
		t0 = B_t0;
		n0 = B_n0;
		type0 = B_type0;
		color0 = B_color0;
		objectID0 = B_objectID0;
	}
	// A is behind us and completely in front of B
	if (A_t1 <= 0.0 && A_t1 < B_t0)
	{
		t0 = B_t0;
		n0 = B_n0;
		type0 = B_type0;
		color0 = B_color0;
		objectID0 = B_objectID0;

		t1 = B_t1;
		n1 = B_n1;
		type1 = B_type1;
		color1 = B_color1;
		objectID1 = B_objectID1;
	}
	else if (B_t0 <= A_t1 && B_t1 > A_t1)
	{
		t1 = B_t1;
		n1 = B_n1;
		type1 = B_type1;
		color1 = B_color1;
		objectID1 = B_objectID1;
	}
	else if (B_t0 <= A_t1 && B_t1 <= A_t1)
	{
		t1 = A_t1;
		n1 = A_n1;
		type1 = A_type1;
		color1 = A_color1;
		objectID1 = A_objectID1;
	}
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
void CSG_Difference_Operation( float A_t0, vec3 A_n0, int A_type0, vec3 A_color0, int A_objectID0, float A_t1, vec3 A_n1, int A_type1, vec3 A_color1, int A_objectID1, 
			       float B_t0, vec3 B_n0, int B_type0, vec3 B_color0, int B_objectID0, float B_t1, vec3 B_n1, int B_type1, vec3 B_color1, int B_objectID1, 
			       out float t0, out vec3 n0, out int type0, out vec3 color0, out int objectID0, out float t1, out vec3 n1, out int type1, out vec3 color1, out int objectID1 )
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
{
	// CSG DIFFERENCE OPERATION [A - B] (shape A is carved out with shape B where the two shapes overlap)
	
	if ((B_t0 < A_t0 && B_t1 < A_t0) || (B_t0 > A_t1 && B_t1 > A_t1))
	{
		t0 = A_t0;
		n0 = A_n0;
		type0 = A_type0;
		color0 = A_color0;
		objectID0 = A_objectID0;

		t1 = A_t1;
		n1 = A_n1;
		type1 = A_type1;
		color1 = A_color1;
		objectID1 = A_objectID1;
	}
	else if (B_t0 > 0.0 && B_t0 < A_t1 && B_t0 > A_t0)
	{
		t0 = A_t0;
		n0 = A_n0;
		type0 = A_type0;
		color0 = A_color0;
		objectID0 = A_objectID0;

		t1 = B_t0;
		n1 = B_n0;
		type1 = B_type0;
		color1 = B_color0;
		objectID1 = B_objectID0;
	}
	else if (B_t1 > A_t0 && B_t1 < A_t1)
	{
		t0 = B_t1;
		n0 = B_n1;
		type0 = B_type1;
		color0 = B_color1;
		objectID0 = B_objectID1;

		t1 = A_t1;
		n1 = A_n1;
		type1 = A_type1;
		color1 = A_color1;
		objectID1 = A_objectID1;
	}
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
void CSG_Intersection_Operation( float A_t0, vec3 A_n0, int A_type0, vec3 A_color0, int A_objectID0, float A_t1, vec3 A_n1, int A_type1, vec3 A_color1, int A_objectID1, 
			  	 float B_t0, vec3 B_n0, int B_type0, vec3 B_color0, int B_objectID0, float B_t1, vec3 B_n1, int B_type1, vec3 B_color1, int B_objectID1, 
			  	 out float t0, out vec3 n0, out int type0, out vec3 color0, out int objectID0, out float t1, out vec3 n1, out int type1, out vec3 color1, out int objectID1 )
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
{
	// CSG INTERSECTION OPERATION [A ^ B] (Only valid where shape A overlaps shape B)
	// (ray must intersect both shape A and shape B)
	vec3 temp_n0, temp_n1, temp_col0, temp_col1;
	float temp_t0, temp_t1;
	int temp_type0, temp_type1, temp_objectID0, temp_objectID1;
	// if shape B is closer than A, swap shapes
	if (B_t0 < A_t0)
	{
		temp_t0 = A_t0;
		temp_n0 = A_n0;
		temp_col0 = A_color0;
		temp_type0 = A_type0;
		temp_objectID0 = A_objectID0;
		
		temp_t1 = A_t1;
		temp_n1 = A_n1;
		temp_col1 = A_color1;
		temp_type1 = A_type1;
		temp_objectID1 = A_objectID1;


		A_t0 = B_t0;
		A_n0 = B_n0;
		A_color0 = B_color0;
		A_type0 = B_type0;
		A_objectID0 = B_objectID0;

		A_t1 = B_t1;
		A_n1 = B_n1;
		A_color1 = B_color1;
		A_type1 = B_type1;
		A_objectID1 = B_objectID1;


		B_t0 = temp_t0;
		B_n0 = temp_n0;
		B_color0 = temp_col0;
		B_type0 = temp_type0;
		B_objectID0 = temp_objectID0;

		B_t1 = temp_t1;
		B_n1 = temp_n1;
		B_color1 = temp_col1;
		B_type1 = temp_type1;
		B_objectID1 = temp_objectID1;
	}
	if (B_t0 < A_t1)
	{
		t0 = B_t0;
		n0 = B_n0;
		// in surfaceA's space, so must use surfaceA's material
		type0 = A_type0; 
		color0 = A_color0;
		objectID0 = A_objectID0;
	}
	if (A_t1 > B_t0 && A_t1 < B_t1)
	{
		t1 = A_t1;
		n1 = A_n1;
		// in surfaceB's space, so must use surfaceB's material
		type1 = B_type0;
		color1 = B_color0;
		objectID1 = B_objectID0;
	}
	else if (B_t1 > A_t0 && B_t1 <= A_t1)
	{
		t1 = B_t1;
		n1 = B_n1;
		// in surfaceA's space, so must use surfaceA's material
		type1 = A_type0;
		color1 = A_color0;
		objectID1 = A_objectID0;
	}
}
`;

THREE.ShaderChunk[ 'raytracing_ellipsoid_param_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float EllipsoidParamIntersect( float yMinPercent, float yMaxPercent, float phiMaxRadians, vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 pHit;
	float t, t0, t1, phi;
	// implicit equation of a unit (radius of 1) sphere:
	// x^2 + y^2 + z^2 - 1 = 0
	float a = dot(rd, rd);
	float b = 2.0 * dot(rd, ro);
	float c = dot(ro, ro) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	if (t1 <= 0.0) return INFINITY;
	t = t0 > 0.0 ? t0 : INFINITY;
	pHit = ro + rd * t;
	phi = mod(atan(pHit.z, pHit.x), TWO_PI);
	if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
	{
		t = t1;
		pHit = ro + rd * t;
		phi = mod(atan(pHit.z, pHit.x), TWO_PI);
		if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
			t = INFINITY;
	}
	
	n = vec3(2.0 * pHit.x, 2.0 * pHit.y, 2.0 * pHit.z);
	n = dot(rd, n) < 0.0 ? n : -n; // flip normal if it is facing away from us
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_cylinder_param_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float CylinderParamIntersect( float yMinPercent, float yMaxPercent, float phiMaxRadians, vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 pHit;
	float t, t0, t1, phi;
	// implicit equation of a unit (radius of 1) cylinder, extending infinitely in the +Y and -Y directions:
	// x^2 + z^2 - 1 = 0
	float a = (rd.x * rd.x + rd.z * rd.z);
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z);
    	float c = (ro.x * ro.x + ro.z * ro.z) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	if (t1 <= 0.0) return INFINITY;
		
	t = t0 > 0.0 ? t0 : INFINITY;
	pHit = ro + rd * t;
	phi = mod(atan(pHit.z, pHit.x), TWO_PI);
	if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
	{
		t = t1;
		pHit = ro + rd * t;
		phi = mod(atan(pHit.z, pHit.x), TWO_PI);
		if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
			t = INFINITY;
	}
	
	n = vec3(2.0 * pHit.x, 0.0, 2.0 * pHit.z);
	n = dot(rd, n) < 0.0 ? n : -n; // flip normal if it is facing away from us
		
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_cone_param_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float ConeParamIntersect( float yMinPercent, float yMaxPercent, float phiMaxRadians, vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 pHit;
	float t, t0, t1, phi;
	// implicit equation of a double-cone extending infinitely in +Y and -Y directions
	// x^2 + z^2 - y^2 = 0
	// code below cuts off top cone, leaving bottom cone with apex at the top (+1.0), and circular base (radius of 1) at the bottom (-1.0)
	float k = 0.25;
	float a = rd.x * rd.x + rd.z * rd.z - k * rd.y * rd.y;
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z - k * rd.y * (ro.y - 1.0));
    	float c = ro.x * ro.x + ro.z * ro.z - k * (ro.y - 1.0) * (ro.y - 1.0);
	
	solveQuadratic(a, b, c, t0, t1);
	if (t1 <= 0.0) return INFINITY;
		
	t = t0 > 0.0 ? t0 : INFINITY;
	pHit = ro + rd * t;
	phi = mod(atan(pHit.z, pHit.x), TWO_PI);
	if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
	{
		t = t1;
		pHit = ro + rd * t;
		phi = mod(atan(pHit.z, pHit.x), TWO_PI);
		if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
			t = INFINITY;
	}
	n = vec3(2.0 * pHit.x, 2.0 * (1.0 - pHit.y) * k, 2.0 * pHit.z);
	n = dot(rd, n) < 0.0 ? n : -n; // flip normal if it is facing away from us
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_paraboloid_param_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float ParaboloidParamIntersect( float yMinPercent, float yMaxPercent, float phiMaxRadians, vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 pHit;
	float t, t0, t1, phi;
	// implicit equation of a paraboloid (bowl or vase-shape extending infinitely in the +Y direction):
	// x^2 + z^2 - y = 0
	ro.y += 1.0; // this essentially centers the paraboloid so that the bottom is at -1.0 and 
		     // the open circular top (radius of 1) is at +1.0
	float k = 0.5;
	float a = (rd.x * rd.x + rd.z * rd.z);
    	float b = 2.0 * (rd.x * ro.x + rd.z * ro.z) - k * rd.y;
    	float c = (ro.x * ro.x + ro.z * ro.z) - k * ro.y;
	solveQuadratic(a, b, c, t0, t1);
	if (t1 <= 0.0) return INFINITY;
	
	// this takes into account that we shifted the ray origin by +1.0
	yMaxPercent += 1.0;
	yMinPercent += 1.0;
	t = t0 > 0.0 ? t0 : INFINITY;
	pHit = ro + rd * t;
	phi = mod(atan(pHit.z, pHit.x), TWO_PI);
	if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
	{
		t = t1;
		pHit = ro + rd * t;
		phi = mod(atan(pHit.z, pHit.x), TWO_PI);
		if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
			t = INFINITY;
	}
	
	n = vec3(2.0 * pHit.x, -1.0 * k, 2.0 * pHit.z);
	n = dot(rd, n) < 0.0 ? n : -n; // flip normal if it is facing away from us
			
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_hyperboloid_param_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float HyperboloidParamIntersect( float k, float yMinPercent, float yMaxPercent, float phiMaxRadians, vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 pHit;
	float t, t0, t1, phi;
	// implicit equation of a hyperboloid of 1 sheet (hourglass shape extending infinitely in the +Y and -Y directions):
	// x^2 + z^2 - y^2 - 1 = 0
	// implicit equation of a hyperboloid of 2 sheets (2 mirrored opposing paraboloids, non-connecting, top extends infinitely in +Y, bottom in -Y):
	// x^2 + z^2 - y^2 + 1 = 0
	
	// if the k argument is negative, a 2-sheet hyperboloid is created
	float j = k - 1.0;
	
	float a = k * rd.x * rd.x + k * rd.z * rd.z - j * rd.y * rd.y;
	float b = 2.0 * (k * rd.x * ro.x + k * rd.z * ro.z - j * rd.y * ro.y);
	float c = (k * ro.x * ro.x + k * ro.z * ro.z - j * ro.y * ro.y) - 1.0;
	solveQuadratic(a, b, c, t0, t1);
	if (t1 <= 0.0) return INFINITY;
	
	t = t0 > 0.0 ? t0 : INFINITY;
	pHit = ro + rd * t;
	phi = mod(atan(pHit.z, pHit.x), TWO_PI);
	if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
	{
		t = t1;
		pHit = ro + rd * t;
		phi = mod(atan(pHit.z, pHit.x), TWO_PI);
		if (pHit.y > yMaxPercent || pHit.y < yMinPercent || phi > phiMaxRadians)
			t = INFINITY;
	}
	
	n = vec3(2.0 * pHit.x * k, 2.0 * -pHit.y * j, 2.0 * pHit.z * k);
	n = dot(rd, n) < 0.0 ? n : -n; // flip normal if it is facing away from us
		
	return t;
}
`;

THREE.ShaderChunk[ 'raytracing_hyperbolic_paraboloid_param_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float HyperbolicParaboloidParamIntersect( float yMinPercent, float yMaxPercent, float phiMaxRadians, vec3 ro, vec3 rd, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 pHit;
	float t, t0, t1, phi;
	// implicit equation of an infinite hyperbolic paraboloid (saddle shape):
	// x^2 - z^2 - y = 0
	float a = rd.x * rd.x - rd.z * rd.z;
	float b = 2.0 * (rd.x * ro.x - rd.z * ro.z) - rd.y;
	float c = (ro.x * ro.x - ro.z * ro.z) - ro.y;
	solveQuadratic(a, b, c, t0, t1);
	if (t1 <= 0.0) return INFINITY;
	t = t0 > 0.0 ? t0 : INFINITY;
	pHit = ro + rd * t;
	phi = mod(atan(pHit.z, pHit.x), TWO_PI);
	if (abs(pHit.x) > yMaxPercent || abs(pHit.y) > yMaxPercent || abs(pHit.z) > yMaxPercent || phi > phiMaxRadians)
	{
		t = t1;
		pHit = ro + rd * t;
		phi = mod(atan(pHit.z, pHit.x), TWO_PI);
		if (abs(pHit.x) > yMaxPercent || abs(pHit.y) > yMaxPercent || abs(pHit.z) > yMaxPercent || phi > phiMaxRadians)
			t = INFINITY;
	}
	
	n = vec3(2.0 * pHit.x, -1.0, -2.0 * pHit.z);
	n = dot(rd, n) < 0.0 ? n : -n; // flip normal if it is facing away from us
		
	return t;
}
`;



THREE.ShaderChunk[ 'raytracing_paraboloid_intersect' ] = `
//-----------------------------------------------------------------------------------------------------------
float ParaboloidIntersect( float rad, float height, vec3 pos, vec3 rayOrigin, vec3 rayDirection, out vec3 n )
//-----------------------------------------------------------------------------------------------------------
{
	vec3 rd = rayDirection;
	vec3 ro = rayOrigin - pos;
	float k = height / (rad * rad);
	
	// quadratic equation coefficients
	float a = k * (rd.x * rd.x + rd.z * rd.z);
	float b = k * 2.0 * (rd.x * ro.x + rd.z * ro.z) - rd.y;
	float c = k * (ro.x * ro.x + ro.z * ro.z) - ro.y;
	float t0, t1;
	solveQuadratic(a, b, c, t0, t1);
	
	vec3 ip;
	
	if (t0 > 0.0)
	{
		ip = ro + rd * t0;
		n = vec3( 2.0 * ip.x, -1.0 / k, 2.0 * ip.z );
		// flip normal if it is facing away from us
		n *= sign(-dot(rd, n)) * 2.0 - 1.0; // sign is 0 or 1, map it to -1 and +1
		
		if (ip.y < height)
			return t0;
				
	}
	if (t1 > 0.0)
	{	
		ip = ro + rd * t1;
		n = vec3( 2.0 * ip.x, -1.0 / k, 2.0 * ip.z );
		// flip normal if it is facing away from us
		n *= sign(-dot(rd, n)) * 2.0 - 1.0; // sign is 0 or 1, map it to -1 and +1
		
		if (ip.y < height)
			return t1;		
	}
	
	return INFINITY;	
}
`;

THREE.ShaderChunk[ 'raytracing_hyperboloid_intersect' ] = `
//------------------------------------------------------------------------------------------------------------
float HyperboloidIntersect( float rad, float height, vec3 pos, vec3 rayOrigin, vec3 rayDirection, out vec3 n )
//------------------------------------------------------------------------------------------------------------
{
	vec3 rd = rayDirection;
	vec3 ro = rayOrigin - pos;
	float k = height / (rad * rad);
	
	// quadratic equation coefficients
	float a = k * ((rd.x * rd.x) - (rd.y * rd.y) + (rd.z * rd.z));
	float b = k * 2.0 * ( (rd.x * ro.x) - (rd.y * ro.y) + (rd.z * ro.z) );
	float c = k * ((ro.x * ro.x) - (ro.y * ro.y) + (ro.z * ro.z)) - (rad * rad);
	
	float t0, t1;
	solveQuadratic(a, b, c, t0, t1);
	
	vec3 ip;
	
	if (t0 > 0.0)
	{
		ip = ro + rd * t0;
		n = vec3( 2.0 * ip.x, -2.0 * ip.y, 2.0 * ip.z );
		// flip normal if it is facing away from us
		n *= sign(-dot(rd, n)) * 2.0 - 1.0; // sign is 0 or 1, map it to -1 and +1
		
		if (abs(ip.y) < height)
			return t0;		
	}
	if (t1 > 0.0)
	{	
		ip = ro + rd * t1;
		n = vec3( 2.0 * ip.x, -2.0 * ip.y, 2.0 * ip.z );
		// flip normal if it is facing away from us
		n *= sign(-dot(rd, n)) * 2.0 - 1.0; // sign is 0 or 1, map it to -1 and +1
		
		if (abs(ip.y) < height)
			return t1;	
	}
	
	return INFINITY;	
}
`;

THREE.ShaderChunk[ 'raytracing_hyperbolic_paraboloid_intersect' ] = `
//---------------------------------------------------------------------------------------------------------------------
float HyperbolicParaboloidIntersect( float rad, float height, vec3 pos, vec3 rayOrigin, vec3 rayDirection, out vec3 n )
//---------------------------------------------------------------------------------------------------------------------
{
	vec3 rd = rayDirection;
	vec3 ro = rayOrigin - pos;
	float k = height / (rad * rad);
	
	// quadratic equation coefficients
	float a = k * (rd.x * rd.x - rd.z * rd.z);
	float b = k * 2.0 * (rd.x * ro.x - rd.z * ro.z) - rd.y;
	float c = k * (ro.x * ro.x - ro.z * ro.z) - ro.y;
	
	float t0, t1;
	solveQuadratic(a, b, c, t0, t1);
	
	vec3 ip;
	if (t0 > 0.0)
	{
		ip = ro + rd * t0;
		n = vec3( 2.0 * ip.x, -1.0 / k, -2.0 * ip.z );
		// flip normal if it is facing away from us
		n *= sign(-dot(rd, n)) * 2.0 - 1.0; // sign is 0 or 1, map it to -1 and +1
		
		if (abs(ip.x) < height && abs(ip.y) < height && abs(ip.z) < height)
			return t0;		
	}
	if (t1 > 0.0)
	{	
		ip = ro + rd * t1;
		n = vec3( 2.0 * ip.x, -1.0 / k, -2.0 * ip.z );
		// flip normal if it is facing away from us
		n *= sign(-dot(rd, n)) * 2.0 - 1.0; // sign is 0 or 1, map it to -1 and +1
		
		if (abs(ip.x) < height && abs(ip.y) < height && abs(ip.z) < height)
			return t1;		
	}
		
	return INFINITY;	
}
`;


THREE.ShaderChunk[ 'raytracing_quad_intersect' ] = `
float TriangleIntersect( vec3 v0, vec3 v1, vec3 v2, vec3 rayOrigin, vec3 rayDirection, int isDoubleSided )
{
	vec3 edge1 = v1 - v0;
	vec3 edge2 = v2 - v0;
	vec3 pvec = cross(rayDirection, edge2);
	float det = 1.0 / dot(edge1, pvec);
	if ( isDoubleSided == FALSE && det < 0.0 ) 
		return INFINITY;
	vec3 tvec = rayOrigin - v0;
	float u = dot(tvec, pvec) * det;
	vec3 qvec = cross(tvec, edge1);
	float v = dot(rayDirection, qvec) * det;
	float t = dot(edge2, qvec) * det;
	return (u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0 || t <= 0.0) ? INFINITY : t;
}
//--------------------------------------------------------------------------------------------------------------
float QuadIntersect( vec3 v0, vec3 v1, vec3 v2, vec3 v3, vec3 rayOrigin, vec3 rayDirection, int isDoubleSided )
//--------------------------------------------------------------------------------------------------------------
{
	return min(TriangleIntersect(v0, v1, v2, rayOrigin, rayDirection, isDoubleSided), 
		   TriangleIntersect(v0, v2, v3, rayOrigin, rayDirection, isDoubleSided));
}
`;

THREE.ShaderChunk[ 'raytracing_box_intersect' ] = `
//-----------------------------------------------------------------------------------------------------------------------------
float BoxIntersect( vec3 minCorner, vec3 maxCorner, vec3 rayOrigin, vec3 rayDirection, out vec3 normal, out int isRayExiting )
//-----------------------------------------------------------------------------------------------------------------------------
{
	vec3 invDir = 1.0 / rayDirection;
	vec3 near = (minCorner - rayOrigin) * invDir;
	vec3 far  = (maxCorner - rayOrigin) * invDir;

	vec3 tmin = min(near, far);
	vec3 tmax = max(near, far);

	float t0 = max( max(tmin.x, tmin.y), tmin.z);
	float t1 = min( min(tmax.x, tmax.y), tmax.z);

	if (t0 > t1) return INFINITY;
	if (t0 > 0.0) // if we are outside the box
	{
		normal = -sign(rayDirection) * step(tmin.yzx, tmin) * step(tmin.zxy, tmin);
		isRayExiting = FALSE;
		return t0;
	}
	if (t1 > 0.0) // if we are inside the box
	{
		normal = -sign(rayDirection) * step(tmax, tmax.yzx) * step(tmax, tmax.zxy);
		isRayExiting = TRUE;
		return t1;
	}
	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_box_interior_intersect' ] = `
//--------------------------------------------------------------------------------------------------------------
float BoxInteriorIntersect( vec3 minCorner, vec3 maxCorner, vec3 rayOrigin, vec3 rayDirection, out vec3 normal )
//--------------------------------------------------------------------------------------------------------------
{
	vec3 invDir = 1.0 / rayDirection;
	vec3 near = (minCorner - rayOrigin) * invDir;
	vec3 far  = (maxCorner - rayOrigin) * invDir;
	
	vec3 tmin = min(near, far);
	vec3 tmax = max(near, far);
	
	float t0 = max( max(tmin.x, tmin.y), tmin.z);
	float t1 = min( min(tmax.x, tmax.y), tmax.z);
	
	if (t0 > t1) return INFINITY;

	/*
	if (t0 > 0.0) // if we are outside the box
	{
		normal = -sign(rayDirection) * step(tmin.yzx, tmin) * step(tmin.zxy, tmin);
		return t0;	
	}
	*/

	if (t1 > 0.0) // if we are inside the box
	{
		normal = -sign(rayDirection) * step(tmax, tmax.yzx) * step(tmax, tmax.zxy);
		return t1;
	}

	return INFINITY;
}
`;

THREE.ShaderChunk[ 'raytracing_boundingbox_intersect' ] = `
//--------------------------------------------------------------------------------------
float BoundingBoxIntersect( vec3 minCorner, vec3 maxCorner, vec3 rayOrigin, vec3 invDir )
//--------------------------------------------------------------------------------------
{
	vec3 near = (minCorner - rayOrigin) * invDir;
	vec3 far  = (maxCorner - rayOrigin) * invDir;
	
	vec3 tmin = min(near, far);
	vec3 tmax = max(near, far);
	
	float t0 = max( max(tmin.x, tmin.y), tmin.z);
	float t1 = min( min(tmax.x, tmax.y), tmax.z);
	
	return max(t0, 0.0) > t1 ? INFINITY : t0;
}
`;



THREE.ShaderChunk[ 'raytracing_bvhTriangle_intersect' ] = `
//-------------------------------------------------------------------------------------------------------------------
float BVH_TriangleIntersect( vec3 v0, vec3 v1, vec3 v2, vec3 rayOrigin, vec3 rayDirection, out float u, out float v )
//-------------------------------------------------------------------------------------------------------------------
{
	vec3 edge1 = v1 - v0;
	vec3 edge2 = v2 - v0;
	vec3 pvec = cross(rayDirection, edge2);
	float det = 1.0 / dot(edge1, pvec);
	vec3 tvec = rayOrigin - v0;
	u = dot(tvec, pvec) * det;
	vec3 qvec = cross(tvec, edge1);
	v = dot(rayDirection, qvec) * det;
	float t = dot(edge2, qvec) * det;
	return (det < 0.0 || u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0 || t <= 0.0) ? INFINITY : t;
}
`;

THREE.ShaderChunk[ 'raytracing_bvhDoubleSidedTriangle_intersect' ] = `
//------------------------------------------------------------------------------------------------------------------------------
float BVH_DoubleSidedTriangleIntersect( vec3 v0, vec3 v1, vec3 v2, vec3 rayOrigin, vec3 rayDirection, out float u, out float v )
//------------------------------------------------------------------------------------------------------------------------------
{
	vec3 edge1 = v1 - v0;
	vec3 edge2 = v2 - v0;
	vec3 pvec = cross(rayDirection, edge2);
	float det = 1.0 / dot(edge1, pvec);
	vec3 tvec = rayOrigin - v0;
	u = dot(tvec, pvec) * det;
	vec3 qvec = cross(tvec, edge1);
	v = dot(rayDirection, qvec) * det; 
	float t = dot(edge2, qvec) * det;
	return (u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0 || t <= 0.0) ? INFINITY : t;
}
`;



THREE.ShaderChunk[ 'raytracing_skymodel_defines' ] = `
#define TURBIDITY 1.0
#define RAYLEIGH_COEFFICIENT 3.0
#define MIE_COEFFICIENT 0.03
#define MIE_DIRECTIONAL_G 0.76
// constants for atmospheric scattering
#define THREE_OVER_SIXTEENPI 0.05968310365946075
#define ONE_OVER_FOURPI 0.07957747154594767
// wavelength of used primaries, according to preetham
#define LAMBDA vec3( 680E-9, 550E-9, 450E-9 )
#define TOTAL_RAYLEIGH vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 )
// mie stuff
// K coefficient for the primaries
#define K vec3(0.686, 0.678, 0.666)
#define MIE_V 4.0
#define MIE_CONST vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 )
// optical length at zenith for molecules
#define RAYLEIGH_ZENITH_LENGTH 8400.0
#define MIE_ZENITH_LENGTH 1250.0
#define UP_VECTOR vec3(0.0, 1.0, 0.0)
#define SUN_POWER 1000.0
// 66 arc seconds -> degrees, and the cosine of that
#define SUN_ANGULAR_DIAMETER_COS 0.9998 //0.9999566769
#define CUTOFF_ANGLE 1.6110731556870734
#define STEEPNESS 1.5
`;

THREE.ShaderChunk[ 'raytracing_physical_sky_functions' ] = `
float RayleighPhase(float cosTheta)
{
	return THREE_OVER_SIXTEENPI * (1.0 + (cosTheta * cosTheta));
}

float hgPhase(float cosTheta, float g)
{
        float g2 = g * g;
        float inverse = 1.0 / pow(max(0.0, 1.0 - 2.0 * g * cosTheta + g2), 1.5);
	return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
}

vec3 totalMie()
{
	float c = (0.2 * TURBIDITY) * 10E-18;
	return 0.434 * c * MIE_CONST;
}

float SunIntensity(float zenithAngleCos)
{
	zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
	return SUN_POWER * max( 0.0, 1.0 - pow( E, -( ( CUTOFF_ANGLE - acos( zenithAngleCos ) ) / STEEPNESS ) ) );
}

vec3 Get_Sky_Color(vec3 rayDir)
{
	vec3 viewDirection = normalize(rayDir);
	
	/* most of the following code is borrowed from the three.js shader file: SkyShader.js */
    	// Cosine angles
	float cosViewSunAngle = dot(viewDirection, uSunDirection);
    	float cosSunUpAngle = dot(UP_VECTOR, uSunDirection); // allowed to be negative: + is daytime, - is nighttime
    	float cosUpViewAngle = dot(UP_VECTOR, viewDirection);
	
        // Get sun intensity based on how high in the sky it is
    	float sunE = SunIntensity(cosSunUpAngle);
        
	// extinction (absorbtion + out scattering)
	// rayleigh coefficients
    	vec3 rayleighAtX = TOTAL_RAYLEIGH * RAYLEIGH_COEFFICIENT;
    
	// mie coefficients
	vec3 mieAtX = totalMie() * MIE_COEFFICIENT;  
    
	// optical length
	float zenithAngle = acos( max( 0.0, dot( UP_VECTOR, viewDirection ) ) );
	float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / PI ), -1.253 ) );
	float rayleighOpticalLength = RAYLEIGH_ZENITH_LENGTH * inverse;
	float mieOpticalLength = MIE_ZENITH_LENGTH * inverse;
	// combined extinction factor	
	vec3 Fex = exp(-(rayleighAtX * rayleighOpticalLength + mieAtX * mieOpticalLength));
	// in scattering
	vec3 betaRTheta = rayleighAtX * RayleighPhase(cosViewSunAngle * 0.5 + 0.5);
	vec3 betaMTheta = mieAtX * hgPhase(cosViewSunAngle, MIE_DIRECTIONAL_G);
	
	vec3 Lin = pow( sunE * ( ( betaRTheta + betaMTheta ) / ( rayleighAtX + mieAtX ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
	Lin *= mix( vec3( 1.0 ), pow( sunE * ( ( betaRTheta + betaMTheta ) / ( rayleighAtX + mieAtX ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - cosSunUpAngle, 5.0 ), 0.0, 1.0 ) );
	// nightsky
	float theta = acos( viewDirection.y ); // elevation --> y-axis, [-pi/2, pi/2]
	float phi = atan( viewDirection.z, viewDirection.x ); // azimuth --> x-axis [-pi/2, pi/2]
	vec2 uv = vec2( phi, theta ) / vec2( 2.0 * PI, PI ) + vec2( 0.5, 0.0 );
	vec3 L0 = vec3( 0.1 ) * Fex;
	// composition + solar disc
	float sundisk = smoothstep( SUN_ANGULAR_DIAMETER_COS, SUN_ANGULAR_DIAMETER_COS + 0.00002, cosViewSunAngle );
	L0 += ( sunE * 19000.0 * Fex ) * sundisk;
	vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
	float sunfade = 1.0 - clamp( 1.0 - exp( ( uSunDirection.y / 450000.0 ) ), 0.0, 1.0 );
	vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * sunfade ) ) ) );
	return retColor;
}
`;
