import * as THREE from "three";
import { Terrain } from "./world/Terrain";
import { Player } from "./entities/Player";
import { Base } from "./entities/Base";


export class Game {
  private readonly container: HTMLElement;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;

  private animationFrameId: number | null = null;
  private previousTime = 0;
  private terrain!: Terrain;
  private player!: Player;
  private base!: Base;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111318);

    const { width, height } = this.getViewportSize();

    this.camera = this.createCamera(width, height);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);

    this.container.appendChild(this.renderer.domElement);

    this.handleResize = this.handleResize.bind(this);
    this.gameLoop = this.gameLoop.bind(this);

    window.addEventListener("resize", this.handleResize);

    this.setupScene();
  }

  /**
   * Inicializa los elementos básicos de la escena.
   *
   * El contenido del mundo se irá agregando aquí posteriormente:
   * terreno, base, jugador, enemigos, etc.
   */
  private setupScene(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);
    this.terrain = new Terrain({
  	width: 60,
  	depth: 60,
		});
	this.base = new Base({
  		maxHealth: 1000,
		});

	this.base.setPosition(new THREE.Vector3(0, 0, -10));
	this.scene.add(this.base.mesh);
	
	this.player = new Player(
  	this.camera,
  	this.renderer.domElement,
		);
		
	this.scene.add(this.terrain.group);
	this.player.setPosition(new THREE.Vector3(0, 0, 0));
	this.scene.add(this.player.mesh);
  }

  /**
   * Crea una cámara ortográfica con orientación isométrica.
   */
  private createCamera(
    width: number,
    height: number,
  ): THREE.OrthographicCamera {
    const aspect = width / height;
    const viewSize = 20;

    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      1000,
    );

    // Orientación inicial tipo isométrica.
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  /**
   * Inicia el game loop.
   */
  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.previousTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Detiene el game loop.
   */
  public stop(): void {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  /**
   * Game loop principal.
   */
  private gameLoop(currentTime: number): void {
    const delta = Math.min(
      (currentTime - this.previousTime) / 1000,
      0.1,
    );

    this.previousTime = currentTime;

    this.update(delta);
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
    window.addEventListener("keydown", (event) => {
  	if (event.key.toLowerCase() === "h") {
    	this.base.takeDamage(100);
  		}
	});
  }

  /**
   * Actualiza la lógica del juego.
   *
   * Los sistemas de movimiento, combate, enemigos, etc.
   * se irán incorporando aquí posteriormente.
   */
	private update(delta: number): void {
  		this.player.update(delta);
	}

  /**
   * Actualiza cámara y renderer cuando cambia el tamaño
   * del viewport.
   */
   
  private handleResize(): void {
    const { width, height } = this.getViewportSize();
    const aspect = width / height;
    const viewSize = 20;

    this.camera.left = (-viewSize * aspect) / 2;
    this.camera.right = (viewSize * aspect) / 2;
    this.camera.top = viewSize / 2;
    this.camera.bottom = -viewSize / 2;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private getViewportSize(): {
    width: number;
    height: number;
  } {
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
  }

  /**
   * Libera recursos y listeners asociados al juego.
   */
  public dispose(): void {
    this.stop();

    window.removeEventListener("resize", this.handleResize);
    this.terrain.dispose();
    this.player.dispose();
    this.base.dispose();

    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
