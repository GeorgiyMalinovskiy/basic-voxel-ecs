import { mat4, vec3 } from "gl-matrix";
import { CAMERA } from "@/constants";

/**
 * Camera projection mode
 */
export enum CameraMode {
  /**
   * Perspective projection (default) - objects get smaller with distance
   */
  PERSPECTIVE = "perspective",

  /**
   * Orthographic projection - parallel projection, no perspective distortion
   */
  ORTHOGRAPHIC = "orthographic",
}

/**
 * Simple camera for 3D rendering
 */
export class Camera {
  private position: vec3;
  private target: vec3;
  private up: vec3;
  private fovy: number;
  private aspect: number;
  private near: number;
  private far: number;
  private orthoSize: number;
  private mode: CameraMode;

  private viewMatrix: mat4;
  private projectionMatrix: mat4;
  private viewProjectionMatrix: mat4;
  private isDirty = true;

  constructor(
    position = vec3.fromValues(0, 10, 20),
    target = vec3.fromValues(16, 0, 16),
    mode = CameraMode.PERSPECTIVE,
    fovy = CAMERA.FOV,
    aspect = 1.6,
    near = CAMERA.NEAR,
    far = CAMERA.FAR,
    orthoSize = CAMERA.ORTHO_SIZE
  ) {
    this.position = position;
    this.target = target;
    this.up = vec3.fromValues(0, 1, 0);
    this.fovy = fovy;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.orthoSize = orthoSize;
    this.mode = mode;

    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
    this.viewProjectionMatrix = mat4.create();

    this.updateMatrices();
  }

  setPosition(position: vec3): void {
    vec3.copy(this.position, position);
    this.isDirty = true;
  }

  setTarget(target: vec3): void {
    vec3.copy(this.target, target);
    this.isDirty = true;
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.isDirty = true;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.isDirty = true;
    }
  }

  setOrthoSize(size: number): void {
    this.orthoSize = size;
    if (this.mode === CameraMode.ORTHOGRAPHIC) {
      this.isDirty = true;
    }
  }

  getPosition(): vec3 {
    return vec3.clone(this.position);
  }

  getTarget(): vec3 {
    return vec3.clone(this.target);
  }

  translate(offset: vec3): void {
    vec3.add(this.position, this.position, offset);
    vec3.add(this.target, this.target, offset);
    this.isDirty = true;
  }

  lookAt(target: vec3): void {
    vec3.copy(this.target, target);
    this.isDirty = true;
  }

  private updateMatrices(): void {
    if (!this.isDirty) return;

    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);

    if (this.mode === CameraMode.PERSPECTIVE) {
      mat4.perspective(
        this.projectionMatrix,
        this.fovy,
        this.aspect,
        this.near,
        this.far
      );

      // WebGPU depth range fix (0-1 instead of -1 to 1)
      const depthFix = mat4.create();
      mat4.identity(depthFix);
      depthFix[10] = 0.5;
      depthFix[14] = 0.5;
      mat4.multiply(this.projectionMatrix, depthFix, this.projectionMatrix);
    } else {
      // Orthographic projection
      const halfWidth = this.orthoSize * this.aspect;
      const halfHeight = this.orthoSize;

      mat4.ortho(
        this.projectionMatrix,
        -halfWidth,
        halfWidth,
        -halfHeight,
        halfHeight,
        this.near,
        this.far
      );

      // WebGPU uses 0-1 depth range, OpenGL uses -1 to 1
      // Need to transform: z_webgpu = (z_opengl + 1) / 2
      const depthFix = mat4.create();
      mat4.identity(depthFix);
      depthFix[10] = 0.5; // Scale z by 0.5
      depthFix[14] = 0.5; // Translate z by 0.5
      mat4.multiply(this.projectionMatrix, depthFix, this.projectionMatrix);
    }

    mat4.multiply(
      this.viewProjectionMatrix,
      this.projectionMatrix,
      this.viewMatrix
    );

    this.isDirty = false;
  }

  getViewProjectionMatrix(): mat4 {
    this.updateMatrices();
    return this.viewProjectionMatrix;
  }

  getUniformData(): Float32Array {
    this.updateMatrices();
    const data = new Float32Array(20); // 16 for matrix + 4 for position
    data.set(this.viewProjectionMatrix, 0);
    data[16] = this.position[0];
    data[17] = this.position[1];
    data[18] = this.position[2];
    data[19] = 0; // padding
    return data;
  }
}
