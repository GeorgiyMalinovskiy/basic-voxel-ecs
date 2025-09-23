/**
 * WGSL Shaders for voxel rendering
 */

export const voxelVertexShader = /* wgsl */ `
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) world_position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
}

struct Camera {
  view_proj: mat4x4<f32>,
  position: vec3<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;

@vertex
fn vs_main(vertex: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  
  out.world_position = vertex.position;
  out.normal = vertex.normal;
  out.color = vertex.color;
  out.clip_position = camera.view_proj * vec4<f32>(vertex.position, 1.0);
  
  return out;
}
`;

export const voxelFragmentShader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) world_position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
}

struct Camera {
  view_proj: mat4x4<f32>,
  position: vec3<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Simple lighting calculation
  let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let light_color = vec3<f32>(1.0, 1.0, 1.0);
  let ambient = vec3<f32>(0.3, 0.3, 0.3);
  
  // Calculate diffuse lighting
  let normal = normalize(in.normal);
  let diffuse = max(dot(normal, light_dir), 0.0);
  
  // Apply lighting to base color
  let lit_color = in.color * (ambient + light_color * diffuse);
  
  return vec4<f32>(lit_color, 1.0);
}
`;

export const wireframeVertexShader = /* wgsl */ `
struct VertexInput {
  @location(0) position: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
}

struct Camera {
  view_proj: mat4x4<f32>,
  position: vec3<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;

@vertex
fn vs_main(vertex: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.clip_position = camera.view_proj * vec4<f32>(vertex.position, 1.0);
  return out;
}
`;

export const wireframeFragmentShader = /* wgsl */ `
@fragment
fn fs_main() -> @location(0) vec4<f32> {
  return vec4<f32>(1.0, 1.0, 1.0, 1.0); // White wireframe
}
`;

