precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uRayTracedImageTexture;

void main()
{	
	pc_fragColor = texelFetch(uRayTracedImageTexture, ivec2(gl_FragCoord.xy), 0);	
} 
