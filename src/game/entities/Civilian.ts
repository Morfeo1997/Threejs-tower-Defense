
import * as THREE from "three";

export interface CivilianConfig {
  color: THREE.ColorRepresentation;
  height: number;
}

export class Civilian {
  public readonly mesh: THREE.Group;
  private alive = true;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(config: Partial<CivilianConfig> = {}) {
    const { color = 0x78b7a0, height = 1.2 } = config;

    this.mesh = new THREE.Group();
    this.mesh.name = "Civilian";

    const bodyGeometry = new THREE.CapsuleGeometry(0.25, height * 0.55, 3, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });

    this.geometries.push(bodyGeometry);
    this.materials.push(bodyMaterial);

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = height * 0.45;
    body.castShadow = true;
    this.mesh.add(body);

    const headGeometry = new THREE.SphereGeometry(0.18, 8, 6);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd6c2a4 });

    this.geometries.push(headGeometry);
    this.materials.push(headMaterial);

    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = height * 0.95;
    this.mesh.add(head);
  }

  public isAlive(): boolean {
    return this.alive;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  public kill(): void {
    this.alive = false;
    this.mesh.visible = false;
  }

  public dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.mesh.clear();
  }
}
