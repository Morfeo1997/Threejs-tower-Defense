
import * as THREE from "three";

export interface BulletConfig {
  speed: number;
  damage: number;
  lifetime: number;
  color: THREE.ColorRepresentation;
}

export class Bullet {
  public readonly mesh: THREE.Mesh;

  private readonly direction: THREE.Vector3;
  private readonly speed: number;
  private readonly lifetime: number;
  private elapsed = 0;
  private disposed = false;

  public readonly damage: number;

  constructor(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    config: Partial<BulletConfig> = {},
  ) {
    const {
      speed = 25,
      damage = 25,
      lifetime = 2,
      color = 0x70eaff,
    } = config;

    this.speed = speed;
    this.damage = damage;
    this.lifetime = lifetime;
    this.direction = direction.clone().normalize();

    const geometry = new THREE.SphereGeometry(0.12, 6, 6);
    const material = new THREE.MeshBasicMaterial({ color });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = "Bullet";
    this.mesh.position.copy(position);
  }

  public update(delta: number): boolean {
    if (this.disposed) return false;

    this.mesh.position.addScaledVector(
      this.direction,
      this.speed * delta,
    );

    this.elapsed += delta;
    return this.elapsed < this.lifetime;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.mesh.geometry.dispose();

    const material = this.mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
  }
}
