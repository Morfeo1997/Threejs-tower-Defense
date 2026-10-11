
import * as THREE from "three";

export interface CameraConfig {
  viewSize: number;
  followSpeed: number;
  offset: THREE.Vector3;
  lookAtOffset: THREE.Vector3;
}

const DEFAULT_CONFIG: CameraConfig = {
  viewSize: 20,
  followSpeed: 5,
  offset: new THREE.Vector3(12, 14, 12),
  lookAtOffset: new THREE.Vector3(0, 0, 0),
};

export class GameCamera {
  public readonly camera: THREE.OrthographicCamera;

  private readonly config: CameraConfig;
  private readonly targetPosition = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();
  private readonly lookAtPosition = new THREE.Vector3();

  private aspectRatio = 1;

  constructor(
    target: THREE.Object3D,
    viewportWidth: number,
    viewportHeight: number,
    config: Partial<CameraConfig> = {},
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      offset: config.offset?.clone() ?? DEFAULT_CONFIG.offset.clone(),
      lookAtOffset:
        config.lookAtOffset?.clone() ??
        DEFAULT_CONFIG.lookAtOffset.clone(),
    };

    this.aspectRatio =
      viewportWidth / Math.max(viewportHeight, 1);

    this.camera = new THREE.OrthographicCamera(
      (-this.config.viewSize * this.aspectRatio) / 2,
      (this.config.viewSize * this.aspectRatio) / 2,
      this.config.viewSize / 2,
      -this.config.viewSize / 2,
      0.1,
      200,
    );

    this.targetPosition.copy(target.position);
    this.updateCameraPosition();
  }

  /**
   * Actualiza el seguimiento de la cámara.
   * delta es el tiempo transcurrido desde el último fotograma, en segundos.
   */
  public update(delta: number, target: THREE.Object3D): void {
    this.targetPosition.copy(target.position);

    this.desiredPosition
      .copy(this.targetPosition)
      .add(this.config.offset);

    // Suaviza el movimiento independientemente de los FPS.
    const smoothFactor =
      1 - Math.exp(-this.config.followSpeed * delta);

    this.camera.position.lerp(
      this.desiredPosition,
      smoothFactor,
    );

    this.lookAtPosition
      .copy(this.targetPosition)
      .add(this.config.lookAtOffset);

    this.camera.lookAt(this.lookAtPosition);
  }

  /**
   * Ajusta el encuadre cuando cambia el tamaño de la ventana.
   */
  public resize(width: number, height: number): void {
    this.aspectRatio = width / Math.max(height, 1);

    this.camera.left =
      (-this.config.viewSize * this.aspectRatio) / 2;
    this.camera.right =
      (this.config.viewSize * this.aspectRatio) / 2;
    this.camera.top = this.config.viewSize / 2;
    this.camera.bottom = -this.config.viewSize / 2;

    this.camera.updateProjectionMatrix();
  }

  /**
   * Coloca la cámara inmediatamente en la posición del objetivo.
   */
  public snapToTarget(target: THREE.Object3D): void {
    this.targetPosition.copy(target.position);
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    this.desiredPosition
      .copy(this.targetPosition)
      .add(this.config.offset);

    this.camera.position.copy(this.desiredPosition);

    this.lookAtPosition
      .copy(this.targetPosition)
      .add(this.config.lookAtOffset);

    this.camera.lookAt(this.lookAtPosition);
  }
}
