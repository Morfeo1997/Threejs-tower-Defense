
import * as THREE from "three";

export interface TerrainConfig {
  width: number;
  depth: number;
  color: THREE.ColorRepresentation;
  gridColor: THREE.ColorRepresentation;
  gridCellSize: number;
}

const DEFAULT_CONFIG: TerrainConfig = {
  width: 60,
  depth: 60,
  color: 0x343b40,
  gridColor: 0x48545a,
  gridCellSize: 2,
};

export class Terrain {
  public readonly group: THREE.Group;

  private readonly config: TerrainConfig;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(config: Partial<TerrainConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = "Terrain";

    this.createGround();
    this.createGrid();
    this.createBoundary();
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(
      this.config.width,
      this.config.depth,
    );

    // El plano se crea en XY; lo rotamos para utilizar XZ
    // como plano horizontal del mundo.
    geometry.rotateX(-Math.PI / 2);
    this.geometries.push(geometry);

    const material = new THREE.MeshStandardMaterial({
      color: this.config.color,
      roughness: 0.95,
      metalness: 0.05,
    });
    this.materials.push(material);

    const ground = new THREE.Mesh(geometry, material);
    ground.name = "Ground";
    ground.receiveShadow = true;

    this.group.add(ground);
  }

  private createGrid(): void {
    const halfWidth = this.config.width / 2;
    const halfDepth = this.config.depth / 2;
    const cellSize = this.config.gridCellSize;

    const points: number[] = [];

    // Líneas paralelas al eje Z.
    for (let x = -halfWidth; x <= halfWidth; x += cellSize) {
      points.push(x, 0.015, -halfDepth);
      points.push(x, 0.015, halfDepth);
    }

    // Líneas paralelas al eje X.
    for (let z = -halfDepth; z <= halfDepth; z += cellSize) {
      points.push(-halfWidth, 0.015, z);
      points.push(halfWidth, 0.015, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    this.geometries.push(geometry);

    const material = new THREE.LineBasicMaterial({
      color: this.config.gridColor,
      transparent: true,
      opacity: 0.45,
    });
    this.materials.push(material);

    const grid = new THREE.LineSegments(geometry, material);
    grid.name = "TerrainGrid";

    this.group.add(grid);
  }

  private createBoundary(): void {
    const halfWidth = this.config.width / 2;
    const halfDepth = this.config.depth / 2;

    const points = [
      new THREE.Vector3(-halfWidth, 0.04, -halfDepth),
      new THREE.Vector3(halfWidth, 0.04, -halfDepth),
      new THREE.Vector3(halfWidth, 0.04, halfDepth),
      new THREE.Vector3(-halfWidth, 0.04, halfDepth),
      new THREE.Vector3(-halfWidth, 0.04, -halfDepth),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.geometries.push(geometry);

    const material = new THREE.LineBasicMaterial({
      color: 0x8b9b9f,
      transparent: true,
      opacity: 0.8,
    });
    this.materials.push(material);

    const boundary = new THREE.Line(geometry, material);
    boundary.name = "TerrainBoundary";

    this.group.add(boundary);
  }

  /**
   * Comprueba si una posición pertenece al área del mapa.
   */
  public containsPosition(x: number, z: number): boolean {
    return (
      Math.abs(x) <= this.config.width / 2 &&
      Math.abs(z) <= this.config.depth / 2
    );
  }

  /**
   * Limita una posición a los bordes del terreno.
   */
  public clampPosition(position: THREE.Vector3): THREE.Vector3 {
    position.x = THREE.MathUtils.clamp(
      position.x,
      -this.config.width / 2,
      this.config.width / 2,
    );

    position.z = THREE.MathUtils.clamp(
      position.z,
      -this.config.depth / 2,
      this.config.depth / 2,
    );

    return position;
  }

  public getSize(): { width: number; depth: number } {
    return {
      width: this.config.width,
      depth: this.config.depth,
    };
  }

  /**
   * Libera la geometría y los materiales del terreno.
   */
  public dispose(): void {
    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    for (const material of this.materials) {
      material.dispose();
    }

    this.group.clear();
  }
}
