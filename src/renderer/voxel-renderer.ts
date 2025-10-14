import { WebGPURenderer } from "@/renderer/webgpu";
import { Camera } from "@/renderer/camera";
import { voxelVertexShader, voxelFragmentShader } from "@/renderer/shaders";
import { Octree } from "@/voxel/octree";
import { MarchingCubes, Mesh, MeshVertex } from "@/voxel/marching-cubes";

/**
 * Vertex data layout for WebGPU
 */
interface VertexData {
  position: Float32Array;
  normal: Float32Array;
  color: Float32Array;
}

/**
 * Voxel renderer that combines octree and marching cubes for WebGPU rendering
 */
export class VoxelRenderer {
  private renderer: WebGPURenderer;
  private camera: Camera;
  private octree: Octree;
  private marchingCubes: MarchingCubes;

  // WebGPU resources
  private renderPipeline!: GPURenderPipeline;
  private cameraBuffer!: GPUBuffer;
  private cameraBindGroup!: GPUBindGroup;
  private vertexBuffer!: GPUBuffer;
  private indexBuffer!: GPUBuffer;

  // Mesh data
  private currentMesh: Mesh | null = null;
  private vertexCount = 0;
  private indexCount = 0;
  private meshNeedsUpdate = true;

  constructor(renderer: WebGPURenderer, camera: Camera, octree: Octree) {
    this.renderer = renderer;
    this.camera = camera;
    this.octree = octree;
    this.marchingCubes = new MarchingCubes();
  }

  /**
   * Initialize the voxel renderer
   */
  async initialize(): Promise<void> {
    await this.createRenderPipeline();
    await this.createBuffers();
    this.updateMesh();
  }

  /**
   * Create the render pipeline
   */
  private async createRenderPipeline(): Promise<void> {
    const device = this.renderer.getDevice();

    // Create shaders
    const vertexModule = this.renderer.createShaderModule(voxelVertexShader);
    const fragmentModule =
      this.renderer.createShaderModule(voxelFragmentShader);

    // Create bind group layout for camera
    const bindGroupLayout = this.renderer.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" as const },
        },
      ],
    });

    // Create pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    // Create render pipeline
    this.renderPipeline = this.renderer.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 4 * 9, // 9 floats per vertex (position + normal + color)
            attributes: [
              { format: "float32x3" as const, offset: 0, shaderLocation: 0 }, // position
              { format: "float32x3" as const, offset: 12, shaderLocation: 1 }, // normal
              { format: "float32x3" as const, offset: 24, shaderLocation: 2 }, // color
            ],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "fs_main",
        targets: [{ format: this.renderer.getFormat() }],
      },
      primitive: {
        topology: "triangle-list" as const,
        cullMode: "back" as const,
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less" as const,
        format: "depth24plus" as const,
      },
    });
  }

  /**
   * Create buffers
   */
  private async createBuffers(): Promise<void> {
    const device = this.renderer.getDevice();

    // Create camera uniform buffer
    this.cameraBuffer = this.renderer.createBuffer({
      size: 20 * 4, // 16 floats for matrix + 4 floats for position (padded)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group for camera
    this.cameraBindGroup = this.renderer.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraBuffer },
        },
      ],
    });

    // Create vertex and index buffers (initial size)
    this.createMeshBuffers(1000, 3000); // Initial capacity
  }

  /**
   * Create or recreate mesh buffers
   */
  private createMeshBuffers(
    vertexCapacity: number,
    indexCapacity: number
  ): void {
    // Position buffer
    this.vertexBuffer = this.renderer.createBuffer({
      size: vertexCapacity * 9 * 4, // 3 attributes * 3 floats * 4 bytes
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Index buffer
    this.indexBuffer = this.renderer.createBuffer({
      size: indexCapacity * 4, // 4 bytes per index
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
  }

  /**
   * Update mesh from octree
   */
  updateMesh(): void {
    if (!this.meshNeedsUpdate) return;

    this.currentMesh = this.marchingCubes.generateMesh(this.octree);

    if (this.currentMesh.vertices.length > 0) {
      this.uploadMeshToGPU(this.currentMesh);
    }

    this.meshNeedsUpdate = false;
  }

  /**
   * Upload mesh data to GPU buffers
   */
  private uploadMeshToGPU(mesh: Mesh): void {
    if (mesh.vertices.length === 0) return;

    // Check if we need larger buffers
    const requiredVertexBytes = mesh.vertices.length * 9 * 4;
    const requiredIndexBytes = mesh.indices.length * 4;

    // Recreate buffers if needed (with some extra capacity)
    const currentVertexBytes = this.vertexBuffer.size;
    const currentIndexBytes = this.indexBuffer.size;

    if (
      requiredVertexBytes > currentVertexBytes ||
      requiredIndexBytes > currentIndexBytes
    ) {
      const newVertexCapacity = Math.max(mesh.vertices.length * 2, 1000);
      const newIndexCapacity = Math.max(mesh.indices.length * 2, 3000);
      this.createMeshBuffers(newVertexCapacity, newIndexCapacity);
    }

    // Prepare vertex data
    const vertexData = this.prepareVertexData(mesh.vertices);

    // Upload vertex data (interleaved: position, normal, color)
    const interleavedData = new Float32Array(mesh.vertices.length * 9);
    for (let i = 0; i < mesh.vertices.length; i++) {
      const offset = i * 9;
      interleavedData.set(
        vertexData.position.slice(i * 3, (i + 1) * 3),
        offset
      );
      interleavedData.set(
        vertexData.normal.slice(i * 3, (i + 1) * 3),
        offset + 3
      );
      interleavedData.set(
        vertexData.color.slice(i * 3, (i + 1) * 3),
        offset + 6
      );
    }

    this.renderer.writeBuffer(this.vertexBuffer, interleavedData);

    // Upload index data
    const indexData = new Uint32Array(mesh.indices);
    this.renderer.writeBuffer(this.indexBuffer, indexData);

    this.vertexCount = mesh.vertices.length;
    this.indexCount = mesh.indices.length;
  }

  /**
   * Prepare vertex data for GPU upload
   */
  private prepareVertexData(vertices: MeshVertex[]): VertexData {
    const positions = new Float32Array(vertices.length * 3);
    const normals = new Float32Array(vertices.length * 3);
    const colors = new Float32Array(vertices.length * 3);

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      const offset = i * 3;

      positions[offset] = vertex.position.x;
      positions[offset + 1] = vertex.position.y;
      positions[offset + 2] = vertex.position.z;

      normals[offset] = vertex.normal.x;
      normals[offset + 1] = vertex.normal.y;
      normals[offset + 2] = vertex.normal.z;

      colors[offset] = vertex.color.x;
      colors[offset + 1] = vertex.color.y;
      colors[offset + 2] = vertex.color.z;
    }

    return { position: positions, normal: normals, color: colors };
  }

  /**
   * Render the voxel mesh
   */
  render(): void {
    if (!this.currentMesh || this.indexCount === 0) return;

    // Update camera uniform
    const cameraData = this.camera.getUniformData();
    this.renderer.writeBuffer(this.cameraBuffer, cameraData);

    // Begin render pass
    const renderPass = this.renderer.beginRenderPass();

    // Set pipeline and bind groups
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.cameraBindGroup);

    // Set vertex buffer (single interleaved buffer)
    renderPass.setVertexBuffer(0, this.vertexBuffer);

    renderPass.setIndexBuffer(this.indexBuffer, "uint32");

    // Draw
    renderPass.drawIndexed(this.indexCount);

    // End render pass
    this.renderer.endRenderPass(renderPass);
  }

  /**
   * Mark mesh for update
   */
  markMeshDirty(): void {
    this.meshNeedsUpdate = true;
  }

  /**
   * Update the renderer (call this every frame)
   */
  update(): void {
    // Only update mesh if it's marked as dirty
    if (this.meshNeedsUpdate) {
      this.updateMesh();
    }
  }

  /**
   * Get the octree
   */
  getOctree(): Octree {
    return this.octree;
  }

  /**
   * Get the marching cubes instance
   */
  getMarchingCubes(): MarchingCubes {
    return this.marchingCubes;
  }

  /**
   * Set the iso level for marching cubes
   */
  setIsoLevel(isoLevel: number): void {
    this.marchingCubes.setIsoLevel(isoLevel);
    this.markMeshDirty();
  }

  /**
   * Get vertex and triangle count
   */
  getStats(): { vertices: number; triangles: number } {
    return {
      vertices: this.vertexCount,
      triangles: Math.floor(this.indexCount / 3),
    };
  }
}
