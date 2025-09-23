import { mat4, vec3 } from "gl-matrix";

/**
 * Camera for 3D rendering
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
    options: {
      position?: vec3;
      target?: vec3;
      up?: vec3;
      fovy?: number;
      aspect?: number;
      near?: number;
      far?: number;
    } = {}
  ) {
    this.position = options.position || vec3.fromValues(0, 0, 5);
    this.target = options.target || vec3.fromValues(0, 0, 0);
    this.up = options.up || vec3.fromValues(0, 1, 0);
    this.fovy = options.fovy || Math.PI / 4; // 45 degrees
    this.aspect = options.aspect || 1;
    this.near = options.near || 0.1;
    this.far = options.far || 1000;

    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
    this.viewProjectionMatrix = mat4.create();

    this.updateMatrices();
  }

  /**
   * Set camera position
   */
  setPosition(position: vec3): void {
    vec3.copy(this.position, position);
    this.isDirty = true;
  }

  /**
   * Get camera position
   */
  getPosition(): vec3 {
    return vec3.clone(this.position);
  }

  /**
   * Set camera target
   */
  setTarget(target: vec3): void {
    vec3.copy(this.target, target);
    this.isDirty = true;
  }

  /**
   * Get camera target
   */
  getTarget(): vec3 {
    return vec3.clone(this.target);
  }

  /**
   * Set aspect ratio
   */
  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.isDirty = true;
  }

  /**
   * Set field of view
   */
  setFovy(fovy: number): void {
    this.fovy = fovy;
    this.isDirty = true;
  }

  /**
   * Move camera by offset
   */
  translate(offset: vec3): void {
    vec3.add(this.position, this.position, offset);
    this.isDirty = true;
  }

  /**
   * Orbit around target
   */
  orbit(deltaX: number, deltaY: number, distance?: number): void {
    const currentDistance =
      distance || vec3.distance(this.position, this.target);

    // Convert current position to spherical coordinates relative to target
    const offset = vec3.create();
    vec3.subtract(offset, this.position, this.target);

    const phi = Math.atan2(offset[2], offset[0]) + deltaX;
    const theta = Math.acos(offset[1] / currentDistance) + deltaY;

    // Clamp theta to avoid gimbal lock
    const clampedTheta = Math.max(0.01, Math.min(Math.PI - 0.01, theta));

    // Convert back to Cartesian
    this.position[0] =
      this.target[0] + currentDistance * Math.sin(clampedTheta) * Math.cos(phi);
    this.position[1] =
      this.target[1] + currentDistance * Math.cos(clampedTheta);
    this.position[2] =
      this.target[2] + currentDistance * Math.sin(clampedTheta) * Math.sin(phi);

    this.isDirty = true;
  }

  /**
   * Update matrices if dirty
   */
  updateMatrices(): void {
    if (!this.isDirty) return;

    // Update view matrix
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);

    // Update projection matrix
    mat4.perspective(
      this.projectionMatrix,
      this.fovy,
      this.aspect,
      this.near,
      this.far
    );

    // Update combined view-projection matrix
    mat4.multiply(
      this.viewProjectionMatrix,
      this.projectionMatrix,
      this.viewMatrix
    );

    this.isDirty = false;
  }

  /**
   * Get view matrix
   */
  getViewMatrix(): mat4 {
    this.updateMatrices();
    return this.viewMatrix;
  }

  /**
   * Get projection matrix
   */
  getProjectionMatrix(): mat4 {
    this.updateMatrices();
    return this.projectionMatrix;
  }

  /**
   * Get combined view-projection matrix
   */
  getViewProjectionMatrix(): mat4 {
    this.updateMatrices();
    return this.viewProjectionMatrix;
  }

  /**
   * Get camera uniform data for shaders
   */
  getUniformData(): Float32Array {
    this.updateMatrices();

    // Pack view-projection matrix and position
    const data = new Float32Array(16 + 4); // mat4x4 + vec3 (padded to vec4)

    // View-projection matrix (16 floats)
    data.set(this.viewProjectionMatrix, 0);

    // Camera position (3 floats + 1 padding)
    data[16] = this.position[0];
    data[17] = this.position[1];
    data[18] = this.position[2];
    data[19] = 0; // Padding

    return data;
  }
}

