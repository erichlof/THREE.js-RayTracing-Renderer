precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uRayTracedImageTexture;
uniform float uOneOverSampleCounter;
uniform bool uUseToneMapping;


void main()
{
	// grab the pixel color resulting from ray tracing
	vec3 pixelColor = texelFetch(uRayTracedImageTexture, ivec2(gl_FragCoord.xy), 0).rgb;
	
	// take the average of all the samples from accumulation buffer
	pixelColor *= uOneOverSampleCounter;

	// apply tone mapping (brings pixel into 0.0-1.0 rgb color range)
	pixelColor = uUseToneMapping ? ReinhardToneMapping(pixelColor) : pixelColor;
	//filteredPixelColor = OptimizedCineonToneMapping(filteredPixelColor);
	//filteredPixelColor = ACESFilmicToneMapping(filteredPixelColor);

	// lastly, apply gamma correction (gives more intensity/brightness range where it's needed)
	pc_fragColor = clamp(vec4( sqrt(pixelColor), 1.0 ), 0.0, 1.0);
}
