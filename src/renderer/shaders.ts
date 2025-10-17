/**
 * Vertex shader for voxel rendering
 */
export const vertexShader = /* wgsl */ `
struct Camera {
  viewProj: mat4x4<f32>,
  position: vec4<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = camera.viewProj * vec4<f32>(input.position, 1.0);
  output.worldPos = input.position;
  output.normal = input.normal;
  output.color = input.color;
  return output;
}
`;

/**
 * Fragment shader for voxel rendering
 */
export const fragmentShader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
  // Simple diffuse lighting
  let lightDir = normalize(vec3<f32>(1.0, 2.0, 1.0));
  let diffuse = max(dot(input.normal, lightDir), 0.2);
  
  // Ambient occlusion (simple)
  let ao = 0.8 + 0.2 * input.normal.y;
  
  let finalColor = input.color * diffuse * ao;
  
  return vec4<f32>(finalColor, 1.0);
}
`;
