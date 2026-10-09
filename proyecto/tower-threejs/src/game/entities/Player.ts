
import * as THREE from "three";

export interface PlayerConfig {
  moveSpeed: number;
  radius: number;
  height: number;
  color: THREE.ColorRepresentation;
}

const DEFAULT_CONFIG: PlayerConfig = {
  moveSpeed: 8,
  radius: 0.45,
  height: 1.4,
  color: 0x54b8d8,
};

export class Player {
  public readonly mesh: THREE.Group;

  private readonly config: PlayerConfig;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private readonly keys = new Set<string>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    0,
  );
  private readonly targetPoint = new THREE.Vector3();

  private readonly camera: THREE.Camera;
  private readonly domElement: HTMLElement;

  private isDisposed = false;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    config: Partial<PlayerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.camera = camera;
    this.domElement = domElement;

    this.mesh = new THREE.Group();
    this.mesh.name = "Player";

    this.createModel();

    this.domElement.addEventListener(
      "mousemove",
      this.handleMouseMove,
    );
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  private createModel(): void {
    // Cuerpo del jugador.
    const bodyGeometry = new THREE.CapsuleGeometry(
      this.config.radius * 0.65,
      this.config.height - this.config.radius * 1.3,
      4,
      8,
    );

    bodyGeometry.translate(0, this.config.height / 2, 0);
    this.geometries.push(bodyGeometry);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      roughness: 0.7,
    });
    this.materials.push(bodyMaterial);

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.name = "PlayerBody";
    body.castShadow = true;

    this.mesh.add(body);

    // Visor frontal para distinguir la dirección del personaje.
    const visorGeometry = new THREE.BoxGeometry(0.3, 0.16, 0.12);
    visorGeometry.translate(0, this.config.height * 0.78, -this.config.radius * 0.6);
    this.geometries.push(visorGeometry);

    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7f7ff,
      emissive: 0x164455,
      emissiveIntensity: 0.8,
    });
    this.materials.push(visorMaterial);

    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.name = "PlayerVisor";

    this.mesh.add(visor);

    // Indicador de selección sobre el suelo.
    const markerGeometry = new THREE.RingGeometry(
      this.config.radius * 0.9,
      this.config.radius * 1.15,
      24,
    );
    markerGeometry.rotateX(-Math.PI / 2);
    markerGeometry.translate(0, 0.025, 0);
    this.geometries.push(markerGeometry);

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.materials.push(markerMaterial);

    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.name = "PlayerGroundMarker";

    this.mesh.add(marker);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (
      ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
    ) {
      event.preventDefault();
      this.keys.add(key);
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private handleBlur = (): void => {
    this.keys.clear();
  };

  private handleMouseMove = (event: MouseEvent): void => {
    const rect = this.domElement.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return;

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  /**
   * Actualiza el movimiento y la orientación del jugador.
   * Debe llamarse desde Game.update(delta).
   */
  public update(delta: number): void {
    if (this.isDisposed) return;

    this.updateMovement(delta);
    this.updateAim();
  }

  private updateMovement(delta: number): void {
    const direction = new THREE.Vector3();

    if (this.keys.has("w") || this.keys.has("arrowup")) {
      direction.z -= 1;
    }

    if (this.keys.has("s") || this.keys.has("arrowdown")) {
      direction.z += 1;
    }

    if (this.keys.has("a") || this.keys.has("arrowleft")) {
      direction.x -= 1;
    }

    if (this.keys.has("d") || this.keys.has("arrowright")) {
      direction.x += 1;
    }

    if (direction.lengthSq() === 0) return;

    direction.normalize();

    this.mesh.position.addScaledVector(
      direction,
      this.config.moveSpeed * delta,
    );
  }

  private updateAim(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = new THREE.Vector3();

    if (!this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
      return;
    }

    this.targetPoint.copy(intersects);

    const dx = this.targetPoint.x - this.mesh.position.x;
    const dz = this.targetPoint.z - this.mesh.position.z;

    if (dx * dx + dz * dz < 0.0001) return;

    // El frente visual del modelo apunta hacia -Z.
    this.mesh.rotation.y = Math.atan2(-dx, -dz);
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  public dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    this.domElement.removeEventListener(
      "mousemove",
      this.handleMouseMove,
    );
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);

    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    for (const material of this.materials) {
      material.dispose();
    }

    this.mesh.clear();
    this.keys.clear();
  }
}
