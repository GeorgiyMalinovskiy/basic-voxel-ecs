/**
 * WebGPU renderer for the voxel engine
 */
export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private adapter!: GPUAdapter;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private depthTexture!: GPUTexture;
  private commandEncoder!: GPUCommandEncoder;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Initialize WebGPU
   */
  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported");
    }

    // Get adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found");
    }
    this.adapter = adapter;

    // Get device
    this.device = await this.adapter.requestDevice({
      requiredFeatures: ["depth-clip-control"],
    });

    // Setup canvas context
    this.context = this.canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });

    // Create depth texture
    this.createDepthTexture();

    console.log("WebGPU initialized successfully");
  }

  /**
   * Create depth texture for depth testing
   */
  private createDepthTexture(): void {
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.createDepthTexture();
  }

  /**
   * Begin a render pass
   */
  beginRenderPass(
    clearColor: GPUColor = { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }
  ): GPURenderPassEncoder {
    this.commandEncoder = this.device.createCommandEncoder();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: clearColor,
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
    };

    return this.commandEncoder.beginRenderPass(renderPassDescriptor);
  }

  /**
   * End render pass and submit commands
   */
  endRenderPass(renderPass: GPURenderPassEncoder): void {
    renderPass.end();
    this.device.queue.submit([this.commandEncoder.finish()]);
  }

  /**
   * Create a shader module from WGSL source
   */
  createShaderModule(source: string): GPUShaderModule {
    return this.device.createShaderModule({ code: source });
  }

  /**
   * Create a buffer
   */
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
    return this.device.createBuffer(descriptor);
  }

  /**
   * Create a render pipeline
   */
  createRenderPipeline(
    descriptor: GPURenderPipelineDescriptor
  ): GPURenderPipeline {
    return this.device.createRenderPipeline(descriptor);
  }

  /**
   * Create a bind group
   */
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup {
    return this.device.createBindGroup(descriptor);
  }

  /**
   * Create a bind group layout
   */
  createBindGroupLayout(
    descriptor: GPUBindGroupLayoutDescriptor
  ): GPUBindGroupLayout {
    return this.device.createBindGroupLayout(descriptor);
  }

  /**
   * Write data to a buffer
   */
  writeBuffer(buffer: GPUBuffer, data: BufferSource, offset = 0): void {
    this.device.queue.writeBuffer(buffer, offset, data);
  }

  /**
   * Get the device
   */
  getDevice(): GPUDevice {
    return this.device;
  }

  /**
   * Get the canvas format
   */
  getFormat(): GPUTextureFormat {
    return this.format;
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
