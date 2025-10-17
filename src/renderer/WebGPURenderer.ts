import { Camera } from "./Camera";
import { Mesh } from "@/voxel";
import { vertexShader, fragmentShader } from "./shaders";
import { MESH_GEN } from "@/constants";

/**
 * WebGPU renderer for voxel meshes
 */
export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private renderPipeline!: GPURenderPipeline;
  private depthTexture!: GPUTexture;
  private cameraBuffer!: GPUBuffer;
  private cameraBindGroup!: GPUBindGroup;

  private vertexBuffer!: GPUBuffer;
  private indexBuffer!: GPUBuffer;
  private indexCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    // Check WebGPU support
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported in this browser");
    }

    // Get adapter and device
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("Failed to get WebGPU adapter");
    }

    this.device = await adapter.requestDevice();

    // Set up canvas context
    this.context = this.canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });

    // Create depth texture
    this.createDepthTexture();

    // Create render pipeline
    await this.createRenderPipeline();

    // Create camera buffer
    this.cameraBuffer = this.device.createBuffer({
      size: 80, // 16 floats for matrix + 4 for position = 20 floats = 80 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group for camera
    this.cameraBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraBuffer },
        },
      ],
    });

    // Create initial buffers
    this.createMeshBuffers(
      MESH_GEN.INITIAL_VERTEX_CAPACITY,
      MESH_GEN.INITIAL_INDEX_CAPACITY
    );
  }

  private createDepthTexture(): void {
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private async createRenderPipeline(): Promise<void> {
    const vertexModule = this.device.createShaderModule({
      code: vertexShader,
    });

    const fragmentModule = this.device.createShaderModule({
      code: fragmentShader,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.renderPipeline = await this.device.createRenderPipelineAsync({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 36, // 9 floats * 4 bytes
            attributes: [
              { format: "float32x3", offset: 0, shaderLocation: 0 }, // position
              { format: "float32x3", offset: 12, shaderLocation: 1 }, // normal
              { format: "float32x3", offset: 24, shaderLocation: 2 }, // color
            ],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "main",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none", // Disabled because we do face culling in mesh generation
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
    });
  }

  private createMeshBuffers(
    vertexCapacity: number,
    indexCapacity: number
  ): void {
    this.vertexBuffer = this.device.createBuffer({
      size: vertexCapacity * 36, // 9 floats * 4 bytes
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.indexBuffer = this.device.createBuffer({
      size: indexCapacity * 4,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
  }

  updateMesh(mesh: Mesh): void {
    if (mesh.vertices.length === 0) {
      this.indexCount = 0;
      return;
    }

    // Check if we need larger buffers
    const requiredVertexBytes = mesh.vertices.length * 36;
    const requiredIndexBytes = mesh.indices.length * 4;

    if (
      requiredVertexBytes > this.vertexBuffer.size ||
      requiredIndexBytes > this.indexBuffer.size
    ) {
      const newVertexCapacity = Math.max(mesh.vertices.length * 2, 1000);
      const newIndexCapacity = Math.max(mesh.indices.length * 2, 3000);
      this.createMeshBuffers(newVertexCapacity, newIndexCapacity);
    }

    // Prepare interleaved vertex data
    const vertexData = new Float32Array(mesh.vertices.length * 9);
    for (let i = 0; i < mesh.vertices.length; i++) {
      const v = mesh.vertices[i];
      const offset = i * 9;
      vertexData[offset + 0] = v.position.x;
      vertexData[offset + 1] = v.position.y;
      vertexData[offset + 2] = v.position.z;
      vertexData[offset + 3] = v.normal.x;
      vertexData[offset + 4] = v.normal.y;
      vertexData[offset + 5] = v.normal.z;
      vertexData[offset + 6] = v.color.x;
      vertexData[offset + 7] = v.color.y;
      vertexData[offset + 8] = v.color.z;
    }

    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);
    this.device.queue.writeBuffer(
      this.indexBuffer,
      0,
      new Uint32Array(mesh.indices)
    );

    this.indexCount = mesh.indices.length;
  }

  render(
    camera: Camera,
    backgroundColor = { r: 0.1, g: 0.1, b: 0.2, a: 1.0 }
  ): void {
    if (this.indexCount === 0) return;

    // Update camera uniform
    const cameraData = camera.getUniformData();
    this.device.queue.writeBuffer(this.cameraBuffer, 0, cameraData);

    // Begin render pass
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: backgroundColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.cameraBindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setIndexBuffer(this.indexBuffer, "uint32");
    renderPass.drawIndexed(this.indexCount);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.createDepthTexture();
  }
}
