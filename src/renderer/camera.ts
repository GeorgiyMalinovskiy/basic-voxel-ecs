import { mat4, vec3 } from "gl-matrix";
import { CAMERA } from "@/constants";

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

  private viewMatrix: mat4;
  private projectionMatrix: mat4;
  private viewProjectionMatrix: mat4;
  private isDirty = true;

  constructor(
    position = vec3.fromValues(0, 10, 20),
    target = vec3.fromValues(16, 0, 16),
    fovy = CAMERA.FOV,
    aspect = 1.6,
    near = CAMERA.NEAR,
    far = CAMERA.FAR
  ) {
    this.position = position;
    this.target = target;
    this.up = vec3.fromValues(0, 1, 0);
    this.fovy = fovy;
    this.aspect = aspect;
    this.near = near;
    this.far = far;

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
    mat4.perspective(
      this.projectionMatrix,
      this.fovy,
      this.aspect,
      this.near,
      this.far
    );
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
