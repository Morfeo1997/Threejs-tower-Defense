import * as THREE from "three";
import { Terrain } from "./world/Terrain";
import { Player } from "./entities/Player";
import { Base } from "./entities/Base";
import { GameCamera } from "./world/Camera";
import { Enemy } from "./entities/Enemy";
import { Civilian } from "./entities/Civilian";
import { Bullet } from "./entities/Bullet";
import {
  createInitialGameState,
  type GameState,
  type GamePhase,
} from "./GameState";
import { TurnSystem } from "./systems/TurnSystem";
import { WaveSystem } from "./systems/WaveSystem";
import { EconomySystem } from "./systems/EconomySystem";
import { BuildingSystem } from "./systems/BuildingSystem";




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
  private gameCamera!: GameCamera;
  private enemies: Enemy[] = [];
  private civilians: Civilian[] = [];
  private bullets: Bullet[] = [];
  private state: GameState = createInitialGameState();
  private readonly onStateChange?: (state: GameState) => void;
  private getWaveSize(day: number): number {
  	const waveSizes = [5, 10, 15, 15];
  	return waveSizes[day - 1] ?? 15;
  }
  
  private turnSystem!: TurnSystem;
  private waveSystem!: WaveSystem;
  private economySystem!: EconomySystem;
  private buildingSystem!: BuildingSystem;

	
	
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(
  	new THREE.Vector3(0, 1, 0),
  	0,
  );
  public getState(): GameState {
  	return { ...this.state };
	}
	
  private publishState(): void {
  	this.onStateChange?.(this.getState());
	}
	
  private setPhase(phase: GamePhase): void {
  	if (this.state.phase === phase) return;
	
  	this.state.phase = phase;
  	this.publishState();
	}
	
  
	constructor(
  		container: HTMLElement,
  		onStateChange?: (state: GameState) => void,
	) { 
  	this.container = container;
  	this.onStateChange = onStateChange;
  	
	this.waveSystem = new WaveSystem(this.state.totalDays);
	
	this.turnSystem = new TurnSystem(this.state, {
  	
	onPhaseChange: (phase) => {
  		this.state.phase = phase;
  		this.buildingSystem?.setDayPhase(phase === "day");
  		this.publishState();
  		
		const firstDayIncome = this.economySystem.collectDailyIncome(
  		this.state.day,
  		this.state.civiliansAlive,
			);
		
		if (firstDayIncome) {
  		this.state.credits = this.economySystem.getCredits();
  		this.turnSystem.updateGameData({
    		credits: this.state.credits,
    		civiliansAlive: this.state.civiliansAlive,
  			});
		}

		},
		
		onDayStarted: (day) => {
  		this.state.day = day;
		
  		const income = this.economySystem.collectDailyIncome(
    		day,
    		this.state.civiliansAlive,
  		);
		
  		if (income) {
    		this.state.credits = this.economySystem.getCredits();
  		}
		
  		this.turnSystem.updateGameData({
    		credits: this.state.credits,
    		civiliansAlive: this.state.civiliansAlive,
  		});
		
  		this.publishState();
		},

	});
	
	
  	this.scene = new THREE.Scene();
  	this.scene.background = new THREE.Color(0x111318);
	
  	const { width, height } = this.getViewportSize();
	
  	this.renderer = new THREE.WebGLRenderer({
    	antialias: true,
  	});
	
  	this.renderer.setPixelRatio(
    	Math.min(window.devicePixelRatio, 2),
  	);
  	this.renderer.setSize(width, height);
  	this.renderer.domElement.addEventListener(
  		"pointerdown",
  		this.handlePointerDown,
	);
	
	this.economySystem = new EconomySystem({
  	initialCredits: this.state.credits,
		}
	);
	
	this.buildingSystem = new BuildingSystem(
  	this.scene,
  	this.economySystem,
  	{
    	interactionDistance: 2.5,
    	siteRadius: 1.5,
  		},
	);
	
	this.buildingSystem.setDayPhase(this.state.phase === "day");
	
	
  	this.container.appendChild(this.renderer.domElement);
	
  	this.handleResize = this.handleResize.bind(this);
  	this.gameLoop = this.gameLoop.bind(this);
	
  	window.addEventListener("resize", this.handleResize);
  	window.addEventListener("keydown", this.handleKeyDown);
	
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
	
  	// Terreno
  	this.terrain = new Terrain({
    	width: 60,
    	depth: 60,
  	});
  	this.scene.add(this.terrain.group);
	
  	// Base principal
  	this.base = new Base({
    	maxHealth: 1000,
  	});
  	this.base.setPosition(new THREE.Vector3(0, 0, -10));
  	this.scene.add(this.base.mesh);
	
  	// Jugador: primero debe existir antes de crear la cámara.
  	this.player = new Player(
    	new THREE.PerspectiveCamera(),
    	this.renderer.domElement,
  	);
	
  	this.player.setPosition(new THREE.Vector3(0, 0, 0));
  	this.scene.add(this.player.mesh);
	
  	// Cámara isométrica que sigue al jugador.
	this.gameCamera = new GameCamera(
  		this.player.mesh,
  		this.container.clientWidth,
  		this.container.clientHeight,
	);
	
	this.camera = this.gameCamera.camera;
	this.player.setCamera(this.camera);
  	this.gameCamera.snapToTarget(this.player.mesh);
  	
 	// Civiles estáticos de prueba.
 	const civilianPositions = [
   	new THREE.Vector3(-5, 0, -5),
   	new THREE.Vector3(-7, 0, -8),
   	new THREE.Vector3(5, 0, -6),
   	new THREE.Vector3(7, 0, -9),
 	];
	
 	for (const position of civilianPositions) {
   	const civilian = new Civilian();
   	civilian.setPosition(position);
   	this.civilians.push(civilian);
   	this.scene.add(civilian.mesh);
 	}
	
 	// Enemigos de prueba.
 	/*
 	for (let i = 0; i < 3; i++) {
   	const enemy = new Enemy();
   	enemy.setPosition(
     	new THREE.Vector3(-8 + i * 8, 0, 15),
   	);
	
   	this.enemies.push(enemy);
   	this.scene.add(enemy.mesh);
 	}
 	*/
 	this.state.civiliansAlive = this.civilians.filter(
  		(civilian) => civilian.isAlive(),
	).length;
	
	this.publishState();
	
}

	
	private registerBuildSites(): void {
  		const sites = [
    		{
      		id: "house-basic-1",
      		position: new THREE.Vector3(-5, 0, -7),
      		type: "house",
      		variant: "basic",
    		},
    		{
      		id: "house-advanced-1",
      		position: new THREE.Vector3(5, 0, -7),
      		type: "house",
      		variant: "advanced",
    		},
    		{
      		id: "tower-basic-1",
      		position: new THREE.Vector3(-7, 0, 0),
      		type: "tower",
      		variant: "basic",
    		},
    		{
      		id: "tower-advanced-1",
      		position: new THREE.Vector3(7, 0, 0),
      		type: "tower",
      		variant: "advanced",
    		},
  		] as const;
		
  		for (const site of sites) {
    		this.buildingSystem.registerBuildSite(site);
  		}
	}
	
	private spawnWave(day: number): void {
  	const wave = this.waveSystem.getWaveConfig(day);
	
  	if (!wave) return;
	
  	// Crear los enemigos normales de la oleada.
  	for (let i = 0; i < wave.enemyCount; i++) {
    	const enemy = new Enemy();
	
    	const spacing = 2.5;
    	const x = (i - (wave.enemyCount - 1) / 2) * spacing;
	
    	enemy.setPosition(
      	new THREE.Vector3(x, 0, 15),
    	);
	
    	this.enemies.push(enemy);
    	this.scene.add(enemy.mesh);
  		}
	
  	// El jefe aparece adicionalmente en la última oleada.
  	if (wave.boss) {
    	const boss = new Enemy({
      	maxHealth: wave.boss.maxHealth,
      	moveSpeed: wave.boss.moveSpeed,
      	damage: wave.boss.damage,
      	radius: wave.boss.radius,
      	height: wave.boss.height,
    	});
	
    	boss.setPosition(new THREE.Vector3(0, 0, 19));
	
    	this.enemies.push(boss);
    	this.scene.add(boss.mesh);
  		}
	}
	
	
	private handlePointerDown = (
  	event: PointerEvent,
	): void => {
  	// Solo dispara con el botón izquierdo.
  	if (event.button !== 0) return;
	
  	const rect = this.renderer.domElement.getBoundingClientRect();
	
  	this.mouse.set(
    	((event.clientX - rect.left) / rect.width) * 2 - 1,
    	-((event.clientY - rect.top) / rect.height) * 2 + 1,
  	);
	
  	this.raycaster.setFromCamera(this.mouse, this.camera);
	
  	const target = new THREE.Vector3();
	
  	if (!this.raycaster.ray.intersectPlane(this.groundPlane, target)) {
    	return;
  	}
	
  	const origin = this.player.getPosition();
  	origin.y = 0.6;
	
  	// El proyectil viaja horizontalmente por el terreno.
  	const direction = new THREE.Vector3(
    	target.x - origin.x,
    	0,
    	target.z - origin.z,
  	);
	
  	if (direction.lengthSq() < 0.0001) return;
	
  	const bullet = new Bullet(origin, direction);
  	this.bullets.push(bullet);
  	this.scene.add(bullet.mesh);
	};


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
   
   
	private readonly handleKeyDown = (
  		event: KeyboardEvent,
		): void => {
  		if (event.repeat) return;
		
  		const key = event.key.toLowerCase();
		
  		if (key === "n") {
    		this.turnSystem.activateNightTurn();
  		}
		
  		// Tecla de prueba para dañar la base.
  		if (key === "h") {
    		this.base.takeDamage(100);
  		}
  		
		if (event.key.toLowerCase() === "p") {
  		this.handleBuildInput();
		}
		
	};

  
	private handleBuildInput(): void {
  		if (this.state.phase !== "day") {
    		console.info("Solo puedes construir durante el día.");
    		return;
  		}
		
  		const playerPosition = this.player.getPosition();
  		const site = this.buildingSystem.getNearbyBuildSite(playerPosition);
		
  		if (!site) {
    		console.info("Acércate a un punto de construcción.");
    		return;
  		}
		
  		const result = this.buildingSystem.buildAt(
    		site.id,
    		playerPosition,
  		);
		
  		if (!result.success) {
    		const messages: Record<typeof result.reason, string> = {
      		"not-day": "Solo puedes construir durante el día.",
      		"too-far": "Estás demasiado lejos del punto.",
      		occupied: "Ese lugar está ocupado.",
      		"insufficient-credits": "No tienes suficientes créditos.",
      		"invalid-site": "El punto de construcción no es válido.",
      		"already-built": "Ya hay un edificio en ese punto.",
    		};
		
    		console.info(messages[result.reason]);
    		return;
  		}
		
  		this.state.credits = this.economySystem.getCredits();
		
  		this.publishState();
	}

  private gameLoop(currentTime: number): void {
    const delta = Math.min(
      (currentTime - this.previousTime) / 1000,
      0.1,
    );

    this.previousTime = currentTime;

    this.update(delta);
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Actualiza la lógica del juego.
   *
   * Los sistemas de movimiento, combate, enemigos, etc.
   * se irán incorporando aquí posteriormente.
   */
	
	private update(delta: number): void {
  		this.player.update(delta);
  		this.gameCamera.update(delta, this.player.mesh);
	
  	// Los enemigos persiguen la base y la atacan al acercarse.
  	for (const enemy of this.enemies) {
    	const damage = enemy.update(
      	delta,
      	this.base.getPosition(),
    	);
	
    	if (damage > 0) {
      	this.base.takeDamage(damage);
    	}
  	}
	
  	// Mover balas y comprobar impactos.
  	for (let i = this.bullets.length - 1; i >= 0; i--) {
    	const bullet = this.bullets[i];
    	const alive = bullet.update(delta);
	
    	let hit = false;
	
    	for (const enemy of this.enemies) {
      	if (enemy.isDead()) continue;
	
      	const distance = bullet
        	.getPosition()
        	.distanceTo(enemy.mesh.position);
	
      	if (distance < 0.9) {
        	enemy.takeDamage(bullet.damage);
        	hit = true;
        	break;
      	}
    	}
	
    	if (!alive || hit) {
      	this.scene.remove(bullet.mesh);
      	bullet.dispose();
      	this.bullets.splice(i, 1);
    	}
  	}
	
  	// Retirar enemigos muertos de la escena.
  	for (let i = this.enemies.length - 1; i >= 0; i--) {
    		const enemy = this.enemies[i];
		
    		if (enemy.isDead()) {
      		this.scene.remove(enemy.mesh);
      		enemy.dispose();
      		this.enemies.splice(i, 1);
    		}
  		}
  	/*	
  	if (
  		this.state.phase === "night" &&
  		this.enemies.length === 0
		) {
  		this.startNextDay();
		}
	*/
	
    // La destrucción de la base termina la partida.
    if (
      	!["victory", "defeat"].includes(this.state.phase) &&
      	this.base.isDestroyed()
    	) {
      	this.turnSystem.declareDefeat();
      	return;
    	}

    // La noche termina cuando todos los enemigos han muerto.
    if (
      	this.state.phase === "night" &&
      	this.enemies.length === 0
    	) {
      	this.turnSystem.completeNightTurn();
    	}
	
	}


  /**
   * Actualiza cámara y renderer cuando cambia el tamaño
   * del viewport.
   */
   
  private handleResize(): void {
    const { width, height } = this.getViewportSize();
    const aspect = width / height;
    const viewSize = 20;
    
    this.gameCamera.resize(width, height);

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
	window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);
    this.terrain.dispose();
    this.player.dispose();
    this.base.dispose();

    this.renderer.dispose();
    
	this.renderer.domElement.removeEventListener(
  	"pointerdown",
  	this.handlePointerDown,
	);
	
	for (const bullet of this.bullets) {
  	this.scene.remove(bullet.mesh);
  	bullet.dispose();
	}
	
	for (const enemy of this.enemies) {
  	this.scene.remove(enemy.mesh);
  	enemy.dispose();
	}
	
	for (const civilian of this.civilians) {
  	this.scene.remove(civilian.mesh);
  	civilian.dispose();
	}
	
	this.bullets = [];
	this.enemies = [];
	this.civilians = [];
	this.buildingSystem?.dispose();

	

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
